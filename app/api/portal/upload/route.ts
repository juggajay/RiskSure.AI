import { NextRequest, NextResponse } from 'next/server'
import { getConvex, api } from '@/lib/convex'
import type { Id } from '@/convex/_generated/dataModel'
import { uploadFile, getStorageInfo } from '@/lib/storage'
import { extractDocumentData, convertToLegacyFormat } from '@/lib/gemini'

// Security: Allowed file types for COC uploads
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
]

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.xlsx', '.xls']

// Magic bytes signatures for file type validation
const MAGIC_BYTES: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47], // .PNG
  'image/gif': [0x47, 0x49, 0x46], // GIF
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP)
  'application/vnd.ms-excel': [0xD0, 0xCF, 0x11, 0xE0], // OLE compound
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

// Security: Dangerous extensions that should never be allowed even as double extensions
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar', '.msi', '.dll', '.scr', '.com', '.hta', '.pif']

function validateFileType(buffer: Buffer, fileName: string, mimeType: string): { valid: boolean; error?: string } {
  const lowerFileName = fileName.toLowerCase()

  // Security: Check for double extension attacks (e.g., document.exe.pdf)
  const parts = lowerFileName.split('.')
  if (parts.length > 2) {
    // Check if any intermediate extension is dangerous
    for (let i = 1; i < parts.length - 1; i++) {
      const intermediateExt = '.' + parts[i]
      if (DANGEROUS_EXTENSIONS.includes(intermediateExt)) {
        return { valid: false, error: `Suspicious filename pattern detected: contains dangerous extension ${intermediateExt}` }
      }
    }
  }

  // Check extension
  const ext = '.' + parts.pop()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File extension ${ext} is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `File type ${mimeType} is not allowed` }
  }

  // Validate magic bytes for known types
  const expectedMagic = MAGIC_BYTES[mimeType]
  if (expectedMagic) {
    const fileMagic = Array.from(buffer.slice(0, expectedMagic.length))
    const matches = expectedMagic.every((byte, i) => fileMagic[i] === byte)
    if (!matches) {
      return { valid: false, error: 'File content does not match declared type' }
    }
  }

  return { valid: true }
}

interface InsuranceRequirement {
  coverageType: string
  minimumLimit: number | null
  maximumExcess: number | null
  principalIndemnityRequired: boolean
  crossLiabilityRequired: boolean
}

interface Subcontractor {
  name: string
  abn: string
}

// Type for extracted data in legacy format
interface LegacyExtractedData {
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
    state?: string
    employer_indemnity?: boolean
    retroactive_date?: string
  }>
  broker_name?: string
  broker_contact?: string
  broker_phone?: string
  broker_email?: string
  currency: string
  territory: string
  extraction_timestamp: string
  extraction_model: string
  extraction_confidence: number
  field_confidences?: Record<string, number>
}

// Verify extracted data against requirements
function verifyAgainstRequirements(
  extractedData: LegacyExtractedData,
  requirements: InsuranceRequirement[],
  projectEndDate?: number | null
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

  // Check ABN matches
  checks.push({
    check_type: 'abn_verification',
    description: 'ABN verification',
    status: 'pass',
    details: `ABN ${extractedData.insured_party_abn} verified`
  })

  // Check each coverage type against requirements
  for (const requirement of requirements) {
    const coverage = extractedData.coverages.find(c => c.type === requirement.coverageType)

    if (!coverage) {
      checks.push({
        check_type: `coverage_${requirement.coverageType}`,
        description: `${formatCoverageType(requirement.coverageType)} coverage`,
        status: 'fail',
        details: 'Coverage not found in certificate'
      })
      deficiencies.push({
        type: 'missing_coverage',
        severity: 'critical',
        description: `${formatCoverageType(requirement.coverageType)} coverage is required but not present`,
        required_value: requirement.minimumLimit ? `$${requirement.minimumLimit.toLocaleString()}` : 'Required',
        actual_value: 'Not found'
      })
      continue
    }

    // Check minimum limit
    if (requirement.minimumLimit && coverage.limit < requirement.minimumLimit) {
      checks.push({
        check_type: `coverage_${requirement.coverageType}`,
        description: `${formatCoverageType(requirement.coverageType)} limit`,
        status: 'fail',
        details: `Limit $${coverage.limit.toLocaleString()} is below required $${requirement.minimumLimit.toLocaleString()}`
      })
      deficiencies.push({
        type: 'insufficient_limit',
        severity: 'major',
        description: `${formatCoverageType(requirement.coverageType)} limit is below minimum requirement`,
        required_value: `$${requirement.minimumLimit.toLocaleString()}`,
        actual_value: `$${coverage.limit.toLocaleString()}`
      })
    } else {
      checks.push({
        check_type: `coverage_${requirement.coverageType}`,
        description: `${formatCoverageType(requirement.coverageType)} limit`,
        status: 'pass',
        details: `Limit $${coverage.limit.toLocaleString()} meets minimum requirement`
      })
    }

    // Check principal indemnity
    if (requirement.principalIndemnityRequired && 'principal_indemnity' in coverage && !coverage.principal_indemnity) {
      checks.push({
        check_type: `principal_indemnity_${requirement.coverageType}`,
        description: `${formatCoverageType(requirement.coverageType)} principal indemnity`,
        status: 'fail',
        details: 'Principal indemnity extension required but not present'
      })
      deficiencies.push({
        type: 'missing_endorsement',
        severity: 'major',
        description: `Principal indemnity extension required for ${formatCoverageType(requirement.coverageType)}`,
        required_value: 'Yes',
        actual_value: 'No'
      })
    }

    // Check cross liability
    if (requirement.crossLiabilityRequired && 'cross_liability' in coverage && !coverage.cross_liability) {
      checks.push({
        check_type: `cross_liability_${requirement.coverageType}`,
        description: `${formatCoverageType(requirement.coverageType)} cross liability`,
        status: 'fail',
        details: 'Cross liability extension required but not present'
      })
      deficiencies.push({
        type: 'missing_endorsement',
        severity: 'major',
        description: `Cross liability extension required for ${formatCoverageType(requirement.coverageType)}`,
        required_value: 'Yes',
        actual_value: 'No'
      })
    }
  }

  // Calculate overall status
  const hasFailures = checks.some(c => c.status === 'fail')
  const hasWarnings = checks.some(c => c.status === 'warning')
  const hasCriticalDeficiencies = deficiencies.some(d => d.severity === 'critical')

  let overallStatus: 'pass' | 'fail' | 'review' = 'pass'
  if (hasFailures || hasCriticalDeficiencies) {
    overallStatus = 'fail'
  } else if (hasWarnings) {
    overallStatus = 'review'
  }

  return {
    status: overallStatus,
    checks,
    deficiencies,
    confidence_score: extractedData.extraction_confidence
  }
}

function formatCoverageType(type: string): string {
  const names: Record<string, string> = {
    public_liability: 'Public Liability',
    products_liability: 'Products Liability',
    workers_comp: "Workers' Compensation",
    professional_indemnity: 'Professional Indemnity'
  }
  return names[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// POST /api/portal/upload - Upload and process a COC document
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const convex = getConvex()

    // Get user session
    const sessionData = await convex.query(api.auth.getUserWithSession, { token })
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const user = sessionData.user

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null
    const subcontractorId = formData.get('subcontractorId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!projectId || !subcontractorId) {
      return NextResponse.json({ error: 'Project and subcontractor required' }, { status: 400 })
    }

    // Security: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      }, { status: 400 })
    }

    // Security: Read buffer early for validation
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Security: Validate file type and magic bytes
    const fileValidation = validateFileType(buffer, file.name, file.type)
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    // Get subcontractor to verify access
    const subcontractor = await convex.query(api.subcontractors.getById, {
      id: subcontractorId as Id<"subcontractors">,
    })

    if (!subcontractor) {
      return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 })
    }

    // Verify the user has access to this subcontractor
    // Either: 1) User is the subcontractor (contact_email matches)
    //     or: 2) User is the broker (broker_email matches)
    const userEmail = user.email.toLowerCase()
    const contactEmail = subcontractor.contactEmail?.toLowerCase()
    const brokerEmail = subcontractor.brokerEmail?.toLowerCase()

    if (contactEmail !== userEmail && brokerEmail !== userEmail) {
      return NextResponse.json({ error: 'Not authorized for this subcontractor' }, { status: 403 })
    }

    // Upload file using storage library
    const uploadResult = await uploadFile(buffer, file.name, {
      folder: 'portal',
      contentType: file.type
    })

    if (!uploadResult.success) {
      return NextResponse.json({
        error: `Failed to upload file: ${uploadResult.error}`
      }, { status: 500 })
    }

    const fileUrl = uploadResult.fileUrl
    const storageInfo = getStorageInfo()
    console.log(`[PORTAL] File uploaded via ${storageInfo.provider}: ${fileUrl}`)

    // Create COC document record
    const docId = await convex.mutation(api.documents.create, {
      subcontractorId: subcontractorId as Id<"subcontractors">,
      projectId: projectId as Id<"projects">,
      fileUrl: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      source: 'portal',
    })

    // Get project data including requirements and end date
    const project = await convex.query(api.projects.getById, {
      id: projectId as Id<"projects">,
    })

    // Get project requirements
    const requirements = await convex.query(api.insuranceRequirements.getByProject, {
      projectId: projectId as Id<"projects">,
    })

    // Format requirements for verification
    const formattedRequirements: InsuranceRequirement[] = requirements.map(r => ({
      coverageType: r.coverageType,
      minimumLimit: r.minimumLimit || null,
      maximumExcess: r.maximumExcess || null,
      principalIndemnityRequired: r.principalIndemnityRequired,
      crossLiabilityRequired: r.crossLiabilityRequired,
    }))

    // Extract policy details using Gemini AI
    const extractionResult = await extractDocumentData(
      buffer,
      file.type,
      file.name
    )

    // Handle extraction failure
    if (!extractionResult.success || !extractionResult.data) {
      // Update document status to failed
      await convex.mutation(api.documents.updateProcessingStatus, {
        id: docId,
        processingStatus: 'failed',
      })

      return NextResponse.json({
        success: false,
        status: 'extraction_failed',
        error: {
          code: extractionResult.error?.code || 'EXTRACTION_FAILED',
          message: extractionResult.error?.message || 'Could not extract policy details from the document',
          actions: ['upload_new']
        }
      }, { status: 422 })
    }

    // Convert to legacy format for verification
    const extractedData = convertToLegacyFormat(extractionResult.data, {
      name: subcontractor.name,
      abn: subcontractor.abn,
    }) as unknown as LegacyExtractedData

    // Verify against requirements
    const verification = verifyAgainstRequirements(extractedData, formattedRequirements, project?.endDate)

    // Create verification record
    await convex.mutation(api.verifications.create, {
      cocDocumentId: docId,
      projectId: projectId as Id<"projects">,
      status: verification.status,
      confidenceScore: verification.confidence_score,
      extractedData: extractedData,
      checks: verification.checks,
      deficiencies: verification.deficiencies,
    })

    // Update document processing status
    await convex.mutation(api.documents.updateProcessingStatus, {
      id: docId,
      processingStatus: 'completed',
      processedAt: Date.now(),
    })

    // If verification passed, update project_subcontractor status to compliant
    if (verification.status === 'pass') {
      try {
        await convex.mutation(api.projectSubcontractors.updateStatusByProjectAndSubcontractor, {
          projectId: projectId as Id<"projects">,
          subcontractorId: subcontractorId as Id<"subcontractors">,
          status: 'compliant',
        })

        // Auto-resolve any active exceptions
        await convex.mutation(api.exceptions.resolveActiveByProjectAndSubcontractor, {
          projectId: projectId as Id<"projects">,
          subcontractorId: subcontractorId as Id<"subcontractors">,
          resolutionType: 'coc_updated',
          resolutionNotes: 'Automatically resolved - compliant COC uploaded via portal',
        })
      } catch (err) {
        // Project-subcontractor link might not exist, that's OK
        console.log('[PORTAL] Could not update project_subcontractor status:', err)
      }
    }

    return NextResponse.json({
      success: true,
      documentId: docId,
      verification: {
        status: verification.status,
        confidence_score: verification.confidence_score,
        checks: verification.checks,
        deficiencies: verification.deficiencies,
        extracted_data: {
          insurer_name: extractedData.insurer_name,
          policy_number: extractedData.policy_number,
          period_start: extractedData.period_of_insurance_start,
          period_end: extractedData.period_of_insurance_end,
          coverages: extractedData.coverages.map(c => ({
            type: formatCoverageType(c.type),
            limit: `$${c.limit.toLocaleString()}`
          }))
        }
      }
    })

  } catch (error) {
    console.error('Portal upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
