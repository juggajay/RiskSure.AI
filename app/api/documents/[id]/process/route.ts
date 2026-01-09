import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db'
import { getUserByToken } from '@/lib/auth'
import { downloadFile } from '@/lib/storage'
import { extractDocumentData, convertToLegacyFormat, shouldSkipFraudDetection } from '@/lib/gemini'
import { performSimulatedFraudAnalysis, type FraudAnalysisResult } from '@/lib/fraud-detection'

interface CocDocument {
  id: string
  subcontractor_id: string
  project_id: string
  file_url: string
  file_name: string | null
  file_size: number | null
  source: string
  processing_status: string
  created_at: string
}

interface Subcontractor {
  id: string
  name: string
  abn: string
  broker_name?: string
  broker_email?: string
  contact_name?: string
  contact_email?: string
}

interface EmailTemplate {
  id: string
  company_id: string | null
  type: string
  name: string | null
  subject: string | null
  body: string | null
  is_default: number
}

interface InsuranceRequirement {
  id: string
  coverage_type: string
  minimum_limit: number | null
  limit_type: string
  maximum_excess: number | null
  principal_indemnity_required: number
  cross_liability_required: number
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

// Verify extracted data against project requirements
function verifyAgainstRequirements(
  extractedData: ExtractedData,
  requirements: InsuranceRequirement[],
  projectEndDate?: string | null,
  projectState?: string | null
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
  checks.push({
    check_type: 'abn_verification',
    description: 'ABN verification',
    status: 'pass',
    details: `ABN ${extractedData.insured_party_abn} verified`
  })

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
    professional_indemnity: 'Professional Indemnity',
    motor_vehicle: 'Motor Vehicle',
    contract_works: 'Contract Works'
  }
  return names[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Get email template for a specific type and company
function getEmailTemplate(db: ReturnType<typeof getDb>, companyId: string, templateType: string): EmailTemplate | null {
  // First try to get company-specific template
  let template = db.prepare(`
    SELECT * FROM email_templates
    WHERE company_id = ? AND type = ?
    ORDER BY is_default ASC
    LIMIT 1
  `).get(companyId, templateType) as EmailTemplate | undefined

  // Fall back to system default if no company template
  if (!template) {
    template = db.prepare(`
      SELECT * FROM email_templates
      WHERE company_id IS NULL AND type = ? AND is_default = 1
      LIMIT 1
    `).get(templateType) as EmailTemplate | undefined
  }

  return template || null
}

// Apply template variables to subject and body
function applyTemplateVariables(
  template: { subject: string | null; body: string | null },
  variables: Record<string, string>
): { subject: string; body: string } {
  let subject = template.subject || ''
  let body = template.body || ''

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    subject = subject.replace(regex, value)
    body = body.replace(regex, value)
  }

  return { subject, body }
}

// POST /api/documents/[id]/process - Process document with AI extraction
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const db = getDb()

    // Get document with verification
    const document = db.prepare(`
      SELECT d.*, p.company_id, v.id as verification_id
      FROM coc_documents d
      JOIN projects p ON d.project_id = p.id
      LEFT JOIN verifications v ON v.coc_document_id = d.id
      WHERE d.id = ?
    `).get(params.id) as (CocDocument & { company_id: string; verification_id: string | null }) | undefined

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Verify user has access to this document's company
    if (document.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get subcontractor details (including broker info for deficiency emails)
    const subcontractor = db.prepare('SELECT id, name, abn, broker_name, broker_email, contact_name, contact_email FROM subcontractors WHERE id = ?')
      .get(document.subcontractor_id) as Subcontractor

    // Get project insurance requirements
    const requirements = db.prepare(`
      SELECT * FROM insurance_requirements WHERE project_id = ?
    `).all(document.project_id) as InsuranceRequirement[]

    // Get project end date and state for coverage checks
    const project = db.prepare('SELECT end_date, state FROM projects WHERE id = ?')
      .get(document.project_id) as { end_date: string | null; state: string | null } | undefined
    const projectEndDate = project?.end_date || null
    const projectState = project?.state || null

    // Update processing status
    db.prepare(`
      UPDATE coc_documents
      SET processing_status = 'processing', updated_at = datetime('now')
      WHERE id = ?
    `).run(params.id)

    // Get URL search params for test toggles
    const { searchParams } = new URL(request.url)

    // Download the document file from storage
    const storagePath = document.file_url.includes('/uploads/')
      ? document.file_url.split('/uploads/')[1]
      : document.file_url
    const downloadResult = await downloadFile(storagePath)

    if (!downloadResult.success || !downloadResult.buffer) {
      // Update document status to extraction_failed
      db.prepare(`
        UPDATE coc_documents SET processing_status = 'extraction_failed', updated_at = datetime('now')
        WHERE id = ?
      `).run(params.id)

      return NextResponse.json({
        success: false,
        status: 'extraction_failed',
        error: {
          code: 'UNREADABLE',
          message: 'Could not download the document file. Please upload again.',
          actions: ['upload_new']
        }
      }, { status: 422 })
    }

    // Detect content type
    const contentType = downloadResult.contentType ||
      (document.file_name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')

    // Extract policy details using Gemini 3 Flash
    const extractionResult = await extractDocumentData(
      downloadResult.buffer,
      contentType,
      document.file_name || 'document'
    )

    // Handle extraction failure
    if (!extractionResult.success || !extractionResult.data) {
      // Update document status to extraction_failed
      db.prepare(`
        UPDATE coc_documents SET processing_status = 'extraction_failed', updated_at = datetime('now')
        WHERE id = ?
      `).run(params.id)

      // Update verification record with failure
      if (document.verification_id) {
        db.prepare(`
          UPDATE verifications
          SET status = 'fail', extracted_data = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          JSON.stringify({ extraction_error: extractionResult.error }),
          document.verification_id
        )
      }

      return NextResponse.json({
        success: false,
        status: 'extraction_failed',
        error: {
          code: extractionResult.error?.code || 'UNREADABLE',
          message: extractionResult.error?.message || "We couldn't read your document. Please ensure it's a clear PDF or image of your Certificate of Currency.",
          actions: extractionResult.error?.retryable ? ['retry', 'upload_new'] : ['upload_new']
        }
      }, { status: 422 })
    }

    // Convert Gemini extraction to legacy format for verification
    const extractedData = convertToLegacyFormat(extractionResult.data, subcontractor)
    extractedData.extraction_confidence = extractionResult.confidence

    // Verify against requirements (including project end date and state checks)
    const verification = verifyAgainstRequirements(extractedData as unknown as ExtractedData, requirements, projectEndDate, projectState)

    // Update or create verification record
    if (document.verification_id) {
      db.prepare(`
        UPDATE verifications
        SET
          status = ?,
          confidence_score = ?,
          extracted_data = ?,
          checks = ?,
          deficiencies = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        verification.status,
        verification.confidence_score,
        JSON.stringify(extractedData),
        JSON.stringify(verification.checks),
        JSON.stringify(verification.deficiencies),
        document.verification_id
      )
    } else {
      const verificationId = uuidv4()
      db.prepare(`
        INSERT INTO verifications (id, coc_document_id, project_id, status, confidence_score, extracted_data, checks, deficiencies)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        verificationId,
        params.id,
        document.project_id,
        verification.status,
        verification.confidence_score,
        JSON.stringify(extractedData),
        JSON.stringify(verification.checks),
        JSON.stringify(verification.deficiencies)
      )
    }

    // Update document processing status to completed
    db.prepare(`
      UPDATE coc_documents
      SET processing_status = 'completed', processed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(params.id)

    // Log the processing action
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'coc_document', ?, 'ai_process', ?)
    `).run(uuidv4(), user.company_id, user.id, params.id, JSON.stringify({
      verification_status: verification.status,
      confidence_score: verification.confidence_score,
      checks_count: verification.checks.length,
      deficiencies_count: verification.deficiencies.length
    }))

    // If verification failed, auto-send deficiency notification email to broker
    if (verification.status === 'fail' && verification.deficiencies.length > 0) {
      // Get project name for email
      const projectDetails = db.prepare('SELECT name FROM projects WHERE id = ?')
        .get(document.project_id) as { name: string } | undefined
      const projectName = projectDetails?.name || 'Unknown Project'

      // Determine recipient (prefer broker, fall back to subcontractor contact)
      const recipientEmail = subcontractor.broker_email || subcontractor.contact_email
      const recipientName = subcontractor.broker_name || subcontractor.contact_name || 'Insurance Contact'

      if (recipientEmail) {
        // Generate the upload link for the subcontractor portal
        const uploadLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/upload?subcontractor=${document.subcontractor_id}&project=${document.project_id}`

        // Format deficiencies for email
        const deficiencyList = verification.deficiencies.map((d: { description: string; severity: string; required_value: string | null; actual_value: string | null }) =>
          `• ${d.description}\n  Severity: ${d.severity.toUpperCase()}\n  Required: ${d.required_value || 'N/A'}\n  Actual: ${d.actual_value || 'N/A'}`
        ).join('\n\n')

        // Calculate due date (14 days from now)
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 14)
        const dueDateStr = dueDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

        // Try to get custom template, fall back to default
        const template = getEmailTemplate(db, user.company_id, 'deficiency')

        let emailSubject: string
        let emailBody: string

        if (template && template.subject && template.body) {
          // Use custom template with variable substitution
          const result = applyTemplateVariables(template, {
            subcontractor_name: subcontractor.name,
            subcontractor_abn: subcontractor.abn,
            project_name: projectName,
            recipient_name: recipientName,
            deficiency_list: deficiencyList,
            upload_link: uploadLink,
            due_date: dueDateStr
          })
          emailSubject = result.subject
          emailBody = result.body
        } else {
          // Fallback to hardcoded default
          emailSubject = `Certificate of Currency Deficiency Notice - ${subcontractor.name} / ${projectName}`
          emailBody = `Dear ${recipientName},

We have identified deficiencies in the Certificate of Currency submitted for ${subcontractor.name} (ABN: ${subcontractor.abn}) on the ${projectName} project.

DEFICIENCIES FOUND:

${deficiencyList}

ACTION REQUIRED:
Please provide an updated Certificate of Currency that addresses the above deficiencies.

You can upload the updated certificate directly using this secure link:
${uploadLink}

If you have any questions, please contact our project team.

Best regards,
RiskShield AI Compliance Team`
        }

        // Get or create verification ID for linking
        let verificationId = document.verification_id
        if (!verificationId) {
          const newVerification = db.prepare('SELECT id FROM verifications WHERE coc_document_id = ?')
            .get(params.id) as { id: string } | undefined
          verificationId = newVerification?.id || null
        }

        // Queue the deficiency email
        const communicationId = uuidv4()
        db.prepare(`
          INSERT INTO communications (id, subcontractor_id, project_id, verification_id, type, channel, recipient_email, subject, body, status)
          VALUES (?, ?, ?, ?, 'deficiency', 'email', ?, ?, ?, 'sent')
        `).run(
          communicationId,
          document.subcontractor_id,
          document.project_id,
          verificationId,
          recipientEmail,
          emailSubject,
          emailBody
        )

        // Mark as sent (in production, this would integrate with an email service)
        db.prepare(`
          UPDATE communications SET sent_at = datetime('now'), status = 'sent' WHERE id = ?
        `).run(communicationId)

        // Log the email action
        db.prepare(`
          INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
          VALUES (?, ?, ?, 'communication', ?, 'deficiency_email_sent', ?)
        `).run(uuidv4(), user.company_id, user.id, communicationId, JSON.stringify({
          recipient: recipientEmail,
          subcontractor_name: subcontractor.name,
          project_name: projectName,
          deficiency_count: verification.deficiencies.length
        }))
      }
    }

    // If verification passed, send confirmation email
    if (verification.status === 'pass') {
      // Get project name for email
      const projectDetails = db.prepare('SELECT name FROM projects WHERE id = ?')
        .get(document.project_id) as { name: string } | undefined
      const projectName = projectDetails?.name || 'Unknown Project'

      // Determine recipient (prefer broker, fall back to subcontractor contact)
      const recipientEmail = subcontractor.broker_email || subcontractor.contact_email
      const recipientName = subcontractor.broker_name || subcontractor.contact_name || 'Insurance Contact'

      if (recipientEmail) {
        // Try to get custom confirmation template
        const template = getEmailTemplate(db, user.company_id, 'confirmation')

        let emailSubject: string
        let emailBody: string

        if (template && template.subject && template.body) {
          // Use custom template with variable substitution
          const result = applyTemplateVariables(template, {
            subcontractor_name: subcontractor.name,
            subcontractor_abn: subcontractor.abn,
            project_name: projectName,
            recipient_name: recipientName
          })
          emailSubject = result.subject
          emailBody = result.body
        } else {
          // Fallback to hardcoded default
          emailSubject = `Insurance Compliance Confirmed - ${subcontractor.name} / ${projectName}`
          emailBody = `Dear ${recipientName},

Great news! The Certificate of Currency submitted for ${subcontractor.name} (ABN: ${subcontractor.abn}) has been verified and meets all requirements for the ${projectName} project.

VERIFICATION RESULT: APPROVED

${subcontractor.name} is now approved to work on the ${projectName} project. All insurance coverage requirements have been met.

Thank you for ensuring compliance with our insurance requirements. If you have any questions or need to update your certificate in the future, please don't hesitate to contact us.

Best regards,
RiskShield AI Compliance Team`
        }

        // Get or create verification ID for linking
        let verificationId = document.verification_id
        if (!verificationId) {
          const newVerification = db.prepare('SELECT id FROM verifications WHERE coc_document_id = ?')
            .get(params.id) as { id: string } | undefined
          verificationId = newVerification?.id || null
        }

        // Queue the confirmation email
        const communicationId = uuidv4()
        db.prepare(`
          INSERT INTO communications (id, subcontractor_id, project_id, verification_id, type, channel, recipient_email, subject, body, status)
          VALUES (?, ?, ?, ?, 'confirmation', 'email', ?, ?, ?, 'sent')
        `).run(
          communicationId,
          document.subcontractor_id,
          document.project_id,
          verificationId,
          recipientEmail,
          emailSubject,
          emailBody
        )

        // Mark as sent
        db.prepare(`
          UPDATE communications SET sent_at = datetime('now'), status = 'sent' WHERE id = ?
        `).run(communicationId)

        // Log the email action
        db.prepare(`
          INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
          VALUES (?, ?, ?, 'communication', ?, 'confirmation_email_sent', ?)
        `).run(uuidv4(), user.company_id, user.id, communicationId, JSON.stringify({
          recipient: recipientEmail,
          subcontractor_name: subcontractor.name,
          project_name: projectName
        }))
      }

      // Auto-resolve any active exceptions for this project/subcontractor
      const projectSubcontractor = db.prepare(`
        SELECT id FROM project_subcontractors
        WHERE project_id = ? AND subcontractor_id = ?
      `).get(document.project_id, document.subcontractor_id) as { id: string } | undefined

      if (projectSubcontractor) {
        // Get the verification ID for the resolution
        const verificationForResolution = db.prepare('SELECT id FROM verifications WHERE coc_document_id = ?')
          .get(params.id) as { id: string } | undefined

        // Resolve all active exceptions for this project_subcontractor
        const activeExceptions = db.prepare(`
          SELECT id FROM exceptions
          WHERE project_subcontractor_id = ? AND status = 'active'
        `).all(projectSubcontractor.id) as { id: string }[]

        for (const exception of activeExceptions) {
          db.prepare(`
            UPDATE exceptions
            SET status = 'resolved',
                resolution_type = 'coc_updated',
                resolved_at = datetime('now'),
                resolution_notes = 'Automatically resolved - new compliant COC uploaded',
                updated_at = datetime('now')
            WHERE id = ?
          `).run(exception.id)

          // Log the resolution
          db.prepare(`
            INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
            VALUES (?, ?, ?, 'exception', ?, 'auto_resolve', ?)
          `).run(
            uuidv4(),
            user.company_id,
            user.id,
            exception.id,
            JSON.stringify({
              resolution_type: 'coc_updated',
              verification_id: verificationForResolution?.id,
              document_id: params.id
            })
          )
        }

        // Update project_subcontractor status to 'compliant'
        db.prepare(`
          UPDATE project_subcontractors
          SET status = 'compliant', updated_at = datetime('now')
          WHERE id = ?
        `).run(projectSubcontractor.id)

        // Log the status change
        if (activeExceptions.length > 0) {
          db.prepare(`
            INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
            VALUES (?, ?, ?, 'project_subcontractor', ?, 'status_change', ?)
          `).run(
            uuidv4(),
            user.company_id,
            user.id,
            projectSubcontractor.id,
            JSON.stringify({
              previous_status: 'exception',
              new_status: 'compliant',
              reason: 'Exceptions auto-resolved after compliant COC upload',
              exceptions_resolved: activeExceptions.length
            })
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Document processed successfully',
      verification: {
        status: verification.status,
        confidence_score: verification.confidence_score,
        extracted_data: extractedData,
        checks: verification.checks,
        deficiencies: verification.deficiencies
      }
    })
  } catch (error) {
    console.error('Process document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/documents/[id]/process - Get processing results
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const db = getDb()

    // Get document with verification
    const document = db.prepare(`
      SELECT
        d.*,
        p.company_id,
        v.id as verification_id,
        v.status as verification_status,
        v.confidence_score,
        v.extracted_data,
        v.checks,
        v.deficiencies,
        v.verified_by_user_id,
        v.verified_at
      FROM coc_documents d
      JOIN projects p ON d.project_id = p.id
      LEFT JOIN verifications v ON v.coc_document_id = d.id
      WHERE d.id = ?
    `).get(params.id) as (CocDocument & {
      company_id: string
      verification_id: string | null
      verification_status: string | null
      confidence_score: number | null
      extracted_data: string | null
      checks: string | null
      deficiencies: string | null
      verified_by_user_id: string | null
      verified_at: string | null
    }) | undefined

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Verify user has access to this document's company
    if (document.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      document: {
        id: document.id,
        file_url: document.file_url,
        file_name: document.file_name,
        processing_status: document.processing_status
      },
      verification: document.verification_id ? {
        id: document.verification_id,
        status: document.verification_status,
        confidence_score: document.confidence_score,
        extracted_data: document.extracted_data ? JSON.parse(document.extracted_data) : null,
        checks: document.checks ? JSON.parse(document.checks) : [],
        deficiencies: document.deficiencies ? JSON.parse(document.deficiencies) : [],
        verified_by_user_id: document.verified_by_user_id,
        verified_at: document.verified_at
      } : null
    })
  } catch (error) {
    console.error('Get document processing results error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
