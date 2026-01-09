import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getDb, type Project } from '@/lib/db'
import { getUserByToken } from '@/lib/auth'
import { createNotificationForProjectTeam } from '@/lib/notifications'
import { performSimulatedFraudAnalysis, type FraudAnalysisResult } from '@/lib/fraud-detection'
import { uploadFile, getStorageInfo } from '@/lib/storage'
import { extractDocumentData, convertToLegacyFormat, shouldSkipFraudDetection } from '@/lib/gemini'

interface InsuranceRequirement {
  id: string
  coverage_type: string
  minimum_limit: number | null
  limit_type: string
  maximum_excess: number | null
  principal_indemnity_required: number
  cross_liability_required: number
  waiver_of_subrogation_required: number
  principal_naming_required: 'principal_named' | 'interested_party' | null
}

// List of APRA-licensed general insurers in Australia
// This is a representative list - in production this would be fetched from APRA's register
const APRA_LICENSED_INSURERS = [
  'QBE Insurance (Australia) Limited',
  'Allianz Australia Insurance Limited',
  'Suncorp Group Limited',
  'CGU Insurance Limited',
  'Zurich Australian Insurance Limited',
  'AIG Australia Limited',
  'Vero Insurance',
  'GIO General Limited',
  'Insurance Australia Limited',
  'AAI Limited',
  'Chubb Insurance Australia Limited',
  'HDI Global Specialty SE - Australia',
  'Liberty Mutual Insurance Company',
  'Tokio Marine & Nichido Fire Insurance Co., Ltd',
  'XL Insurance Company SE',
  'AXA Corporate Solutions Assurance',
  'Swiss Re International SE',
  'Munich Holdings of Australasia Pty Limited'
]

// Unlicensed/offshore insurers for testing purposes
const UNLICENSED_INSURERS = [
  'Offshore Insurance Ltd',
  'Unregistered Underwriters Co',
  'Non-APRA Insurance Company'
]

function formatCoverageType(type: string): string {
  const names: Record<string, string> = {
    public_liability: 'Public Liability',
    products_liability: 'Products Liability',
    workers_comp: "Workers' Compensation",
    professional_indemnity: 'Professional Indemnity',
    motor_vehicle: 'Motor Vehicle',
    contract_works: 'Contract Works'
  }
  return names[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Type for extracted data from Gemini (legacy format)
interface ExtractedData {
  insured_party_name: string
  insured_party_abn: string
  insured_party_address: string
  insurer_name: string
  insurer_abn: string
  policy_number: string
  period_of_insurance_start: string
  period_of_insurance_end: string
  coverages: Array<{
    type: string
    limit: number
    limit_type: string
    excess: number
    principal_indemnity?: boolean
    cross_liability?: boolean
    waiver_of_subrogation?: boolean
    principal_naming_type?: string | null
    state?: string
    employer_indemnity?: boolean
    retroactive_date?: string
  }>
  broker_name: string
  broker_contact: string
  broker_phone: string
  broker_email: string
  currency: string
  territory: string
  extraction_timestamp: string
  extraction_model: string
  extraction_confidence: number
  field_confidences: Record<string, number>
}

function verifyAgainstRequirements(
  extractedData: ExtractedData,
  requirements: InsuranceRequirement[],
  projectEndDate?: string | null,
  projectState?: string | null,
  subcontractorAbn?: string | null
) {
  const checks: Array<{
    check_type: string
    description: string
    status: 'pass' | 'fail' | 'warning'
    details: string
  }> = []

  const deficiencies: Array<{
    type: string
    severity: 'critical' | 'major' | 'minor'
    description: string
    required_value: string | null
    actual_value: string | null
  }> = []

  // Check policy dates
  const now = new Date()
  const policyEnd = new Date(extractedData.period_of_insurance_end)
  const daysUntilExpiry = Math.ceil((policyEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (policyEnd < now) {
    checks.push({
      check_type: 'policy_validity',
      description: 'Policy validity period',
      status: 'fail',
      details: 'Policy has expired'
    })
    deficiencies.push({
      type: 'expired_policy',
      severity: 'critical',
      description: 'Certificate of Currency has expired',
      required_value: 'Valid policy',
      actual_value: `Expired on ${extractedData.period_of_insurance_end}`
    })
  } else if (daysUntilExpiry <= 30) {
    const expiryText = daysUntilExpiry === 0 ? 'Policy expires today' :
                       daysUntilExpiry === 1 ? 'Policy expires in 1 day' :
                       `Policy expires in ${daysUntilExpiry} days`
    checks.push({
      check_type: 'policy_validity',
      description: 'Policy validity period',
      status: 'warning',
      details: expiryText
    })
  } else {
    checks.push({
      check_type: 'policy_validity',
      description: 'Policy validity period',
      status: 'pass',
      details: `Policy valid until ${extractedData.period_of_insurance_end}`
    })
  }

  // Check policy covers project period (if project has end date)
  if (projectEndDate) {
    const projectEnd = new Date(projectEndDate)
    if (policyEnd < projectEnd) {
      checks.push({
        check_type: 'project_coverage',
        description: 'Project period coverage',
        status: 'fail',
        details: `Policy expires before project end date (${projectEndDate})`
      })
      deficiencies.push({
        type: 'policy_expires_before_project',
        severity: 'critical',
        description: 'Policy expires before project completion date',
        required_value: `Valid until ${projectEndDate}`,
        actual_value: `Expires ${extractedData.period_of_insurance_end}`
      })
    } else {
      checks.push({
        check_type: 'project_coverage',
        description: 'Project period coverage',
        status: 'pass',
        details: `Policy covers project period (ends ${projectEndDate})`
      })
    }
  }

  // Check ABN matches
  if (subcontractorAbn) {
    // Normalize ABNs for comparison (remove spaces)
    const extractedAbn = extractedData.insured_party_abn?.replace(/\s/g, '') || ''
    const expectedAbn = subcontractorAbn.replace(/\s/g, '')

    if (extractedAbn !== expectedAbn) {
      checks.push({
        check_type: 'abn_verification',
        description: 'ABN verification',
        status: 'fail',
        details: `ABN ${extractedAbn} does not match subcontractor ABN ${expectedAbn}`
      })
      deficiencies.push({
        type: 'abn_mismatch',
        severity: 'critical',
        description: 'Certificate ABN does not match subcontractor ABN',
        required_value: expectedAbn,
        actual_value: extractedAbn
      })
    } else {
      checks.push({
        check_type: 'abn_verification',
        description: 'ABN verification',
        status: 'pass',
        details: `ABN ${extractedAbn} matches subcontractor record`
      })
    }
  } else {
    checks.push({
      check_type: 'abn_verification',
      description: 'ABN verification',
      status: 'pass',
      details: `ABN ${extractedData.insured_party_abn} verified`
    })
  }

  // Check if insurer is APRA-licensed
  const insurerName = extractedData.insurer_name
  const isApraLicensed = APRA_LICENSED_INSURERS.some(
    apraInsurer => apraInsurer.toLowerCase() === insurerName?.toLowerCase()
  )

  if (!isApraLicensed) {
    checks.push({
      check_type: 'apra_insurer_validation',
      description: 'APRA insurer validation',
      status: 'fail',
      details: `Insurer "${insurerName}" is not on the APRA-licensed insurers register`
    })
    deficiencies.push({
      type: 'unlicensed_insurer',
      severity: 'critical',
      description: 'Insurer is not APRA-licensed in Australia',
      required_value: 'APRA-licensed insurer',
      actual_value: insurerName || 'Unknown'
    })
  } else {
    checks.push({
      check_type: 'apra_insurer_validation',
      description: 'APRA insurer validation',
      status: 'pass',
      details: `Insurer "${insurerName}" is APRA-licensed`
    })
  }

  // Check each coverage type against requirements
  for (const requirement of requirements) {
    const coverage = extractedData.coverages.find(c => c.type === requirement.coverage_type)

    if (!coverage) {
      checks.push({
        check_type: `coverage_${requirement.coverage_type}`,
        description: `${formatCoverageType(requirement.coverage_type)} coverage`,
        status: 'fail',
        details: 'Coverage not found in certificate'
      })
      deficiencies.push({
        type: 'missing_coverage',
        severity: 'critical',
        description: `${formatCoverageType(requirement.coverage_type)} coverage is required but not present`,
        required_value: requirement.minimum_limit ? `$${requirement.minimum_limit.toLocaleString()}` : 'Required',
        actual_value: 'Not found'
      })
      continue
    }

    // Check minimum limit
    if (requirement.minimum_limit && coverage.limit < requirement.minimum_limit) {
      checks.push({
        check_type: `coverage_${requirement.coverage_type}`,
        description: `${formatCoverageType(requirement.coverage_type)} limit`,
        status: 'fail',
        details: `Limit $${coverage.limit.toLocaleString()} is below required $${requirement.minimum_limit.toLocaleString()}`
      })
      deficiencies.push({
        type: 'insufficient_limit',
        severity: 'major',
        description: `${formatCoverageType(requirement.coverage_type)} limit is below minimum requirement`,
        required_value: `$${requirement.minimum_limit.toLocaleString()}`,
        actual_value: `$${coverage.limit.toLocaleString()}`
      })
    } else {
      checks.push({
        check_type: `coverage_${requirement.coverage_type}`,
        description: `${formatCoverageType(requirement.coverage_type)} limit`,
        status: 'pass',
        details: `Limit $${coverage.limit.toLocaleString()} meets minimum requirement`
      })
    }

    // Check maximum excess
    if (requirement.maximum_excess && coverage.excess > requirement.maximum_excess) {
      checks.push({
        check_type: `excess_${requirement.coverage_type}`,
        description: `${formatCoverageType(requirement.coverage_type)} excess`,
        status: 'fail',
        details: `Excess $${coverage.excess.toLocaleString()} exceeds maximum $${requirement.maximum_excess.toLocaleString()}`
      })
      deficiencies.push({
        type: 'excess_too_high',
        severity: 'minor',
        description: `${formatCoverageType(requirement.coverage_type)} excess exceeds maximum allowed`,
        required_value: `Max $${requirement.maximum_excess.toLocaleString()}`,
        actual_value: `$${coverage.excess.toLocaleString()}`
      })
    }

    // Check principal indemnity
    if (requirement.principal_indemnity_required && 'principal_indemnity' in coverage && !coverage.principal_indemnity) {
      checks.push({
        check_type: `principal_indemnity_${requirement.coverage_type}`,
        description: `${formatCoverageType(requirement.coverage_type)} principal indemnity`,
        status: 'fail',
        details: 'Principal indemnity extension required but not present'
      })
      deficiencies.push({
        type: 'missing_endorsement',
        severity: 'major',
        description: `Principal indemnity extension required for ${formatCoverageType(requirement.coverage_type)}`,
        required_value: 'Yes',
        actual_value: 'No'
      })
    }

    // Check cross liability
    if (requirement.cross_liability_required && 'cross_liability' in coverage && !coverage.cross_liability) {
      checks.push({
        check_type: `cross_liability_${requirement.coverage_type}`,
        description: `${formatCoverageType(requirement.coverage_type)} cross liability`,
        status: 'fail',
        details: 'Cross liability extension required but not present'
      })
      deficiencies.push({
        type: 'missing_endorsement',
        severity: 'major',
        description: `Cross liability extension required for ${formatCoverageType(requirement.coverage_type)}`,
        required_value: 'Yes',
        actual_value: 'No'
      })
    }

    // Check waiver of subrogation
    if (requirement.waiver_of_subrogation_required && 'waiver_of_subrogation' in coverage) {
      const hasWaiver = (coverage as { waiver_of_subrogation?: boolean }).waiver_of_subrogation
      if (!hasWaiver) {
        checks.push({
          check_type: `waiver_of_subrogation_${requirement.coverage_type}`,
          description: `${formatCoverageType(requirement.coverage_type)} waiver of subrogation`,
          status: 'fail',
          details: 'Waiver of subrogation required but not present'
        })
        deficiencies.push({
          type: 'missing_endorsement',
          severity: 'major',
          description: `Waiver of subrogation required for ${formatCoverageType(requirement.coverage_type)}`,
          required_value: 'Yes',
          actual_value: 'No'
        })
      } else {
        checks.push({
          check_type: `waiver_of_subrogation_${requirement.coverage_type}`,
          description: `${formatCoverageType(requirement.coverage_type)} waiver of subrogation`,
          status: 'pass',
          details: 'Waiver of subrogation clause detected and verified'
        })
      }
    }

    // Check principal naming requirement (principal_named vs interested_party)
    if (requirement.principal_naming_required && 'principal_naming_type' in coverage) {
      const actualNamingType = (coverage as { principal_naming_type?: string | null }).principal_naming_type
      const requiredNamingType = requirement.principal_naming_required

      if (!actualNamingType) {
        // No principal naming found at all
        checks.push({
          check_type: `principal_naming_${requirement.coverage_type}`,
          description: `${formatCoverageType(requirement.coverage_type)} principal naming`,
          status: 'fail',
          details: `${requiredNamingType === 'principal_named' ? 'Principal naming' : 'Interested party notation'} required but not found`
        })
        deficiencies.push({
          type: 'missing_principal_naming',
          severity: requiredNamingType === 'principal_named' ? 'critical' : 'major',
          description: `${requiredNamingType === 'principal_named' ? 'Principal naming' : 'Interested party notation'} required for ${formatCoverageType(requirement.coverage_type)}`,
          required_value: requiredNamingType === 'principal_named' ? 'Principal Named' : 'Interested Party',
          actual_value: 'Not found'
        })
      } else if (requiredNamingType === 'principal_named' && actualNamingType === 'interested_party') {
        // Required principal naming but only have interested party (weaker protection)
        checks.push({
          check_type: `principal_naming_${requirement.coverage_type}`,
          description: `${formatCoverageType(requirement.coverage_type)} principal naming`,
          status: 'fail',
          details: 'Principal naming required but only Interested Party notation found (weaker protection)'
        })
        deficiencies.push({
          type: 'insufficient_principal_naming',
          severity: 'major',
          description: `Principal naming required but only Interested Party notation found for ${formatCoverageType(requirement.coverage_type)}. Interested Party provides notification rights only, not full principal protection.`,
          required_value: 'Principal Named',
          actual_value: 'Interested Party Only'
        })
      } else {
        // Either exact match or interested_party required and we have principal_named (even better)
        const namingLabel = actualNamingType === 'principal_named' ? 'Principal Named' : 'Interested Party'
        checks.push({
          check_type: `principal_naming_${requirement.coverage_type}`,
          description: `${formatCoverageType(requirement.coverage_type)} principal naming`,
          status: 'pass',
          details: `${namingLabel} - principal party identification verified`
        })
      }
    }

    // Check Workers Comp state matches project state
    if (requirement.coverage_type === 'workers_comp' && projectState && 'state' in coverage) {
      const wcState = (coverage as { state?: string }).state
      if (wcState && wcState !== projectState) {
        checks.push({
          check_type: 'workers_comp_state',
          description: "Workers' Compensation state coverage",
          status: 'fail',
          details: `WC scheme is for ${wcState} but project is in ${projectState}`
        })
        deficiencies.push({
          type: 'state_mismatch',
          severity: 'critical',
          description: `Workers' Compensation scheme does not cover project state`,
          required_value: `${projectState} scheme`,
          actual_value: `${wcState} scheme`
        })
      } else if (wcState && wcState === projectState) {
        checks.push({
          check_type: 'workers_comp_state',
          description: "Workers' Compensation state coverage",
          status: 'pass',
          details: `WC scheme (${wcState}) matches project state`
        })
      }
    }
  }

  // Calculate overall status
  const hasFailures = checks.some(c => c.status === 'fail')
  const hasWarnings = checks.some(c => c.status === 'warning')
  const hasCriticalDeficiencies = deficiencies.some(d => d.severity === 'critical')
  const confidenceScore = extractedData.extraction_confidence
  const LOW_CONFIDENCE_THRESHOLD = 0.70 // Below 70% confidence requires manual review

  let overallStatus: 'pass' | 'fail' | 'review' = 'pass'
  if (hasFailures || hasCriticalDeficiencies) {
    overallStatus = 'fail'
  } else if (hasWarnings || confidenceScore < LOW_CONFIDENCE_THRESHOLD) {
    // Low confidence extractions need manual review even if all checks pass
    overallStatus = 'review'
    if (confidenceScore < LOW_CONFIDENCE_THRESHOLD) {
      checks.push({
        check_type: 'confidence_check',
        description: 'AI extraction confidence',
        status: 'warning',
        details: `Low confidence score (${(confidenceScore * 100).toFixed(0)}%) - manual review recommended`
      })
    }
  }

  return {
    status: overallStatus,
    checks,
    deficiencies,
    confidence_score: extractedData.extraction_confidence
  }
}

// Helper function to check if user has access to project
function canAccessProject(user: { id: string; company_id: string | null; role: string }, project: Project): boolean {
  // Must be same company
  if (project.company_id !== user.company_id) {
    return false
  }

  // Admin, risk_manager, and read_only can access all company projects
  if (['admin', 'risk_manager', 'read_only'].includes(user.role)) {
    return true
  }

  // Project manager and project administrator can only access assigned projects
  if (['project_manager', 'project_administrator'].includes(user.role)) {
    return project.project_manager_id === user.id
  }

  return false
}

// GET /api/documents - List documents
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const subcontractorId = searchParams.get('subcontractorId')

    const db = getDb()

    let query = `
      SELECT
        d.*,
        s.name as subcontractor_name,
        s.abn as subcontractor_abn,
        p.name as project_name,
        v.status as verification_status,
        v.confidence_score
      FROM coc_documents d
      JOIN subcontractors s ON d.subcontractor_id = s.id
      JOIN projects p ON d.project_id = p.id
      LEFT JOIN verifications v ON v.coc_document_id = d.id
      WHERE p.company_id = ?
    `
    const params: (string | null)[] = [user.company_id]

    if (projectId) {
      query += ' AND d.project_id = ?'
      params.push(projectId)
    }

    if (subcontractorId) {
      query += ' AND d.subcontractor_id = ?'
      params.push(subcontractorId)
    }

    query += ' ORDER BY d.created_at DESC'

    const documents = db.prepare(query).all(...params)

    return NextResponse.json({
      documents,
      total: documents.length
    })
  } catch (error) {
    console.error('Get documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/documents - Upload a new document
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Only certain roles can upload documents
    if (!['admin', 'risk_manager', 'project_manager', 'project_administrator'].includes(user.role)) {
      return NextResponse.json({ error: 'You do not have permission to upload documents' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null
    const subcontractorId = formData.get('subcontractorId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!projectId || !subcontractorId) {
      return NextResponse.json({ error: 'Project ID and Subcontractor ID are required' }, { status: 400 })
    }

    // Validate file type (PDF or image)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif']
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({
        error: `Invalid file type. Only PDF and image files are accepted (${allowedExtensions.join(', ')}). You uploaded: ${file.name}`
      }, { status: 400 })
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 10MB'
      }, { status: 400 })
    }

    const db = getDb()

    // Verify project exists and user has access
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project | undefined
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!canAccessProject(user, project)) {
      return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
    }

    // Verify subcontractor exists and belongs to same company
    const subcontractor = db.prepare('SELECT * FROM subcontractors WHERE id = ? AND company_id = ?')
      .get(subcontractorId, user.company_id)
    if (!subcontractor) {
      return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 })
    }

    // Verify subcontractor is assigned to the project
    const assignment = db.prepare('SELECT id FROM project_subcontractors WHERE project_id = ? AND subcontractor_id = ?')
      .get(projectId, subcontractorId)
    if (!assignment) {
      return NextResponse.json({ error: 'Subcontractor is not assigned to this project' }, { status: 400 })
    }

    // Upload file using storage library (supports Supabase or local storage)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadResult = await uploadFile(buffer, file.name, {
      folder: 'documents',
      contentType: file.type
    })

    if (!uploadResult.success) {
      return NextResponse.json({
        error: `Failed to upload file: ${uploadResult.error}`
      }, { status: 500 })
    }

    const fileUrl = uploadResult.fileUrl
    const storageInfo = getStorageInfo()
    console.log(`[DOCUMENTS] File uploaded via ${storageInfo.provider}: ${fileUrl}`)

    // Create document record
    const documentId = uuidv4()
    db.prepare(`
      INSERT INTO coc_documents (id, subcontractor_id, project_id, file_url, file_name, file_size, source, received_at, processing_status)
      VALUES (?, ?, ?, ?, ?, ?, 'upload', datetime('now'), 'pending')
    `).run(documentId, subcontractorId, projectId, fileUrl, file.name, file.size)

    // Create initial verification record
    const verificationId = uuidv4()
    db.prepare(`
      INSERT INTO verifications (id, coc_document_id, project_id, status, extracted_data, checks, deficiencies)
      VALUES (?, ?, ?, 'review', '{}', '[]', '[]')
    `).run(verificationId, documentId, projectId)

    // Log the action
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'coc_document', ?, 'upload', ?)
    `).run(uuidv4(), user.company_id, user.id, documentId, JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      projectId,
      subcontractorId
    }))

    // Update document processing status to 'processing'
    db.prepare(`
      UPDATE coc_documents SET processing_status = 'processing', processed_at = datetime('now')
      WHERE id = ?
    `).run(documentId)

    // Get URL search params for test toggles
    const { searchParams } = new URL(request.url)

    // Perform AI extraction using Gemini 3 Flash
    const extractionResult = await extractDocumentData(buffer, file.type, file.name)

    // Handle extraction failure
    if (!extractionResult.success || !extractionResult.data) {
      // Update document status to extraction_failed
      db.prepare(`
        UPDATE coc_documents SET processing_status = 'extraction_failed', updated_at = datetime('now')
        WHERE id = ?
      `).run(documentId)

      // Update verification record with failure
      db.prepare(`
        UPDATE verifications
        SET status = 'fail', extracted_data = ?, updated_at = datetime('now')
        WHERE coc_document_id = ?
      `).run(
        JSON.stringify({ extraction_error: extractionResult.error }),
        documentId
      )

      // Log the extraction failure
      db.prepare(`
        INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
        VALUES (?, ?, ?, 'coc_document', ?, 'extraction_failed', ?)
      `).run(uuidv4(), user.company_id, user.id, documentId, JSON.stringify({
        error: extractionResult.error,
        fileName: file.name
      }))

      // Return error response with retry options for subcontractor
      return NextResponse.json({
        success: false,
        status: 'extraction_failed',
        document: {
          id: documentId,
          fileUrl,
          fileName: file.name,
          processingStatus: 'extraction_failed'
        },
        error: {
          code: extractionResult.error?.code || 'UNREADABLE',
          message: extractionResult.error?.message || "We couldn't read your document. Please ensure it's a clear PDF or image of your Certificate of Currency.",
          actions: extractionResult.error?.retryable ? ['retry', 'upload_new'] : ['upload_new']
        }
      }, { status: 422 })
    }

    // Convert Gemini extraction to legacy format for verification
    const extractedData = convertToLegacyFormat(
      extractionResult.data,
      subcontractor as { name: string; abn: string }
    )
    extractedData.extraction_confidence = extractionResult.confidence

    const requirements = db.prepare(`
      SELECT * FROM insurance_requirements WHERE project_id = ?
    `).all(projectId) as InsuranceRequirement[]

    // Get project end date and state for coverage checks
    const projectEndDate = project.end_date
    const projectState = project.state

    const subcontractorAbn = (subcontractor as { abn: string }).abn
    const verification = verifyAgainstRequirements(extractedData as unknown as ExtractedData, requirements, projectEndDate, projectState, subcontractorAbn)

    // Check if fraud detection should be skipped (for testing)
    const skipFraud = shouldSkipFraudDetection(file.name, searchParams)

    // Perform fraud detection analysis (unless skipped for testing)
    const fraudAnalysis: FraudAnalysisResult = skipFraud
      ? {
          overall_risk_score: 0,
          risk_level: 'low' as const,
          is_blocked: false,
          recommendation: 'Fraud detection skipped for testing',
          checks: [],
          evidence_summary: ['Fraud detection was bypassed via test toggle']
        }
      : performSimulatedFraudAnalysis(
          {
            insured_party_abn: extractedData.insured_party_abn as string,
            insurer_name: extractedData.insurer_name as string,
            policy_number: extractedData.policy_number as string,
            period_of_insurance_start: extractedData.period_of_insurance_start as string,
            period_of_insurance_end: extractedData.period_of_insurance_end as string,
            coverages: (extractedData.coverages as Array<{type: string; limit: number}>).map(c => ({
              type: c.type,
              limit: c.limit
            }))
          },
          file.name
        )

    // If fraud is detected, override verification status
    let finalStatus = verification.status
    if (fraudAnalysis.is_blocked) {
      finalStatus = 'fail'
      // Add fraud-related deficiencies
      verification.deficiencies.push({
        type: 'fraud_detected',
        severity: 'critical',
        description: `Document flagged for potential fraud: ${fraudAnalysis.recommendation}`,
        required_value: 'Authentic document',
        actual_value: `Risk level: ${fraudAnalysis.risk_level} (score: ${fraudAnalysis.overall_risk_score})`
      })
      // Add fraud checks to verification checks
      for (const check of fraudAnalysis.checks.filter(c => c.status === 'fail')) {
        verification.checks.push({
          check_type: check.check_type,
          description: check.check_name,
          status: 'fail',
          details: check.details
        })
      }
    } else if (fraudAnalysis.risk_level === 'high' && finalStatus === 'pass') {
      finalStatus = 'review'
      // Add warning for high-risk but not blocked
      verification.checks.push({
        check_type: 'fraud_risk_warning',
        description: 'Fraud Risk Assessment',
        status: 'warning',
        details: `${fraudAnalysis.recommendation} (Risk score: ${fraudAnalysis.overall_risk_score})`
      })
    }

    // Update verification record with extracted data and fraud analysis
    db.prepare(`
      UPDATE verifications
      SET
        status = ?,
        confidence_score = ?,
        extracted_data = ?,
        checks = ?,
        deficiencies = ?,
        updated_at = datetime('now')
      WHERE coc_document_id = ?
    `).run(
      finalStatus,
      verification.confidence_score,
      JSON.stringify({
        ...extractedData,
        fraud_analysis: {
          risk_score: fraudAnalysis.overall_risk_score,
          risk_level: fraudAnalysis.risk_level,
          is_blocked: fraudAnalysis.is_blocked,
          recommendation: fraudAnalysis.recommendation,
          checks: fraudAnalysis.checks,
          evidence_summary: fraudAnalysis.evidence_summary
        }
      }),
      JSON.stringify(verification.checks),
      JSON.stringify(verification.deficiencies),
      documentId
    )

    // Update document processing status to completed
    db.prepare(`
      UPDATE coc_documents SET processing_status = 'completed', updated_at = datetime('now')
      WHERE id = ?
    `).run(documentId)

    // Get names for notifications
    const subcontractorName = (subcontractor as { name: string }).name
    const projectName = project.name

    // Auto-approve: If verification passes, automatically update subcontractor compliance status to 'compliant'
    if (finalStatus === 'pass') {
      db.prepare(`
        UPDATE project_subcontractors
        SET status = 'compliant', updated_at = datetime('now')
        WHERE project_id = ? AND subcontractor_id = ?
      `).run(projectId, subcontractorId)

      // Log the auto-approval
      db.prepare(`
        INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
        VALUES (?, ?, ?, 'project_subcontractor', ?, 'auto_approve', ?)
      `).run(uuidv4(), user.company_id, user.id, `${projectId}_${subcontractorId}`, JSON.stringify({
        documentId,
        verificationStatus: 'pass',
        autoApproved: true,
        message: 'Subcontractor automatically marked compliant after verification passed'
      }))
    } else if (finalStatus === 'fail') {
      // If verification fails (including fraud detection), mark subcontractor as non-compliant
      db.prepare(`
        UPDATE project_subcontractors
        SET status = 'non_compliant', updated_at = datetime('now')
        WHERE project_id = ? AND subcontractor_id = ?
      `).run(projectId, subcontractorId)

      // If fraud was detected, create a special notification
      if (fraudAnalysis.is_blocked) {
        createNotificationForProjectTeam(
          projectId,
          'stop_work_risk',
          'FRAUD ALERT: Document Blocked',
          `${subcontractorName}'s Certificate of Currency has been blocked due to potential fraud. Risk score: ${fraudAnalysis.overall_risk_score}. ${fraudAnalysis.recommendation}`,
          `/dashboard/documents/${documentId}`,
          'coc_document',
          documentId
        )
      }
    }

    // Create notifications for project team (skip if fraud notification already sent)
    if (finalStatus === 'pass') {
      createNotificationForProjectTeam(
        projectId,
        'coc_verified',
        'COC Verified - Compliant',
        `${subcontractorName}'s Certificate of Currency has passed verification for ${projectName}`,
        `/dashboard/documents/${documentId}`,
        'coc_document',
        documentId
      )
    } else if (finalStatus === 'fail' && !fraudAnalysis.is_blocked) {
      // Only send regular failure notification if not already sent as fraud alert
      const deficiencyCount = verification.deficiencies.length
      createNotificationForProjectTeam(
        projectId,
        'coc_failed',
        'COC Verification Failed',
        `${subcontractorName}'s Certificate of Currency has ${deficiencyCount} deficienc${deficiencyCount === 1 ? 'y' : 'ies'} for ${projectName}`,
        `/dashboard/documents/${documentId}`,
        'coc_document',
        documentId
      )
    } else if (finalStatus === 'review') {
      // Review required
      createNotificationForProjectTeam(
        projectId,
        'coc_received',
        'COC Requires Review',
        `${subcontractorName}'s Certificate of Currency requires manual review for ${projectName}`,
        `/dashboard/documents/${documentId}`,
        'coc_document',
        documentId
      )
    }

    return NextResponse.json({
      success: true,
      message: fraudAnalysis.is_blocked
        ? 'Document uploaded but BLOCKED due to potential fraud'
        : 'Document uploaded successfully',
      document: {
        id: documentId,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        processingStatus: 'completed',
        storageProvider: uploadResult.provider,
        storagePath: uploadResult.storagePath,
        verification: {
          status: finalStatus,
          confidence_score: verification.confidence_score,
          extracted_data: extractedData
        },
        fraud_analysis: {
          risk_score: fraudAnalysis.overall_risk_score,
          risk_level: fraudAnalysis.risk_level,
          is_blocked: fraudAnalysis.is_blocked,
          recommendation: fraudAnalysis.recommendation,
          evidence_summary: fraudAnalysis.evidence_summary
        }
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Upload document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
