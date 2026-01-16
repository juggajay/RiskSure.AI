import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db'
import { getUserByToken } from '@/lib/auth'

interface InsuranceRequirement {
  id: string
  coverage_type: string
  minimum_limit: number | null
  limit_type: string
  maximum_excess: number | null
  principal_indemnity_required: number
  cross_liability_required: number
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

// Simulated AI extraction of policy details
function extractPolicyDetails(fileName: string, subcontractor: Subcontractor) {
  const insurers = [
    'QBE Insurance (Australia) Limited',
    'Allianz Australia Insurance Limited',
    'Suncorp Group Limited',
    'CGU Insurance Limited'
  ]

  const randomInsurer = insurers[Math.floor(Math.random() * insurers.length)]
  const policyNumber = `POL${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`

  // Test scenarios based on filename
  const isFullCompliance = fileName.toLowerCase().includes('compliant') ||
                           fileName.toLowerCase().includes('pass')
  const isNoPrincipalIndemnity = fileName.toLowerCase().includes('no_pi')
  const isNoCrossLiability = fileName.toLowerCase().includes('no_cl')
  const isLowLimit = fileName.toLowerCase().includes('low_limit')

  const now = new Date()
  const startDate = new Date(now)
  startDate.setMonth(startDate.getMonth() - 2)
  const endDate = new Date(startDate)
  endDate.setFullYear(endDate.getFullYear() + 1)

  const publicLiabilityLimit = isLowLimit ? 5000000 : (isFullCompliance ? 20000000 : 10000000)
  const productsLiabilityLimit = isLowLimit ? 5000000 : (isFullCompliance ? 20000000 : 10000000)
  const workersCompLimit = isFullCompliance ? 2000000 : 1000000
  const professionalIndemnityLimit = isFullCompliance ? 5000000 : 2000000

  return {
    insured_party_name: subcontractor.name,
    insured_party_abn: subcontractor.abn,
    insured_party_address: '123 Construction Way, Sydney NSW 2000',
    insurer_name: randomInsurer,
    insurer_abn: '28008770864',
    policy_number: policyNumber,
    period_of_insurance_start: startDate.toISOString().split('T')[0],
    period_of_insurance_end: endDate.toISOString().split('T')[0],
    coverages: [
      {
        type: 'public_liability',
        limit: publicLiabilityLimit,
        limit_type: 'per_occurrence',
        excess: 1000,
        principal_indemnity: !isNoPrincipalIndemnity,
        cross_liability: !isNoCrossLiability
      },
      {
        type: 'products_liability',
        limit: productsLiabilityLimit,
        limit_type: 'aggregate',
        excess: 1000,
        principal_indemnity: !isNoPrincipalIndemnity,
        cross_liability: !isNoCrossLiability
      },
      {
        type: 'workers_comp',
        limit: workersCompLimit,
        limit_type: 'statutory',
        excess: 0,
        state: 'NSW',
        employer_indemnity: true
      },
      {
        type: 'professional_indemnity',
        limit: professionalIndemnityLimit,
        limit_type: 'per_claim',
        excess: 5000,
        retroactive_date: '2020-01-01'
      }
    ],
    broker_name: 'ABC Insurance Brokers Pty Ltd',
    broker_contact: 'John Smith',
    broker_phone: '02 9999 8888',
    broker_email: 'john@abcbrokers.com.au',
    currency: 'AUD',
    territory: 'Australia and New Zealand',
    extraction_timestamp: new Date().toISOString(),
    extraction_model: 'gpt-4-vision-preview',
    extraction_confidence: 0.92 + Math.random() * 0.07
  }
}

function verifyAgainstRequirements(
  extractedData: ReturnType<typeof extractPolicyDetails>,
  requirements: InsuranceRequirement[]
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
    checks.push({
      check_type: 'policy_validity',
      description: 'Policy validity period',
      status: 'warning',
      details: `Policy expires in ${daysUntilExpiry} days`
    })
  } else {
    checks.push({
      check_type: 'policy_validity',
      description: 'Policy validity period',
      status: 'pass',
      details: `Policy valid until ${extractedData.period_of_insurance_end}`
    })
  }

  // Check each coverage type
  for (const requirement of requirements) {
    const coverage = extractedData.coverages.find(c => c.type === requirement.coverage_type)

    if (!coverage) {
      checks.push({
        check_type: `coverage_${requirement.coverage_type}`,
        description: `${requirement.coverage_type} coverage`,
        status: 'fail',
        details: 'Coverage not found'
      })
      deficiencies.push({
        type: 'missing_coverage',
        severity: 'critical',
        description: `${requirement.coverage_type} coverage is required but not present`,
        required_value: requirement.minimum_limit ? `$${requirement.minimum_limit.toLocaleString()}` : 'Required',
        actual_value: 'Not found'
      })
      continue
    }

    // Check minimum limit
    if (requirement.minimum_limit && coverage.limit < requirement.minimum_limit) {
      checks.push({
        check_type: `coverage_${requirement.coverage_type}`,
        description: `${requirement.coverage_type} limit`,
        status: 'fail',
        details: `Limit $${coverage.limit.toLocaleString()} is below required $${requirement.minimum_limit.toLocaleString()}`
      })
      deficiencies.push({
        type: 'insufficient_limit',
        severity: 'major',
        description: `${requirement.coverage_type} limit is below minimum requirement`,
        required_value: `$${requirement.minimum_limit.toLocaleString()}`,
        actual_value: `$${coverage.limit.toLocaleString()}`
      })
    } else {
      checks.push({
        check_type: `coverage_${requirement.coverage_type}`,
        description: `${requirement.coverage_type} limit`,
        status: 'pass',
        details: `Limit $${coverage.limit.toLocaleString()} meets minimum`
      })
    }

    // Check principal indemnity
    if (requirement.principal_indemnity_required && 'principal_indemnity' in coverage && !coverage.principal_indemnity) {
      checks.push({
        check_type: `principal_indemnity_${requirement.coverage_type}`,
        description: `${requirement.coverage_type} principal indemnity`,
        status: 'fail',
        details: 'Principal indemnity extension required but not present'
      })
      deficiencies.push({
        type: 'missing_endorsement',
        severity: 'major',
        description: `Principal indemnity extension required for ${requirement.coverage_type}`,
        required_value: 'Yes',
        actual_value: 'No'
      })
    }

    // Check cross liability
    if (requirement.cross_liability_required && 'cross_liability' in coverage && !coverage.cross_liability) {
      checks.push({
        check_type: `cross_liability_${requirement.coverage_type}`,
        description: `${requirement.coverage_type} cross liability`,
        status: 'fail',
        details: 'Cross liability extension required but not present'
      })
      deficiencies.push({
        type: 'missing_endorsement',
        severity: 'major',
        description: `Cross liability extension required for ${requirement.coverage_type}`,
        required_value: 'Yes',
        actual_value: 'No'
      })
    }
  }

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

// POST /api/test/create-document - Create and process a test document
// This is for testing purposes only
export async function POST(request: NextRequest) {
  // Security: Block test endpoints in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoints are disabled in production' }, { status: 403 })
  }

  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, subcontractorId, fileName } = body

    if (!projectId || !subcontractorId || !fileName) {
      return NextResponse.json({ error: 'projectId, subcontractorId, and fileName are required' }, { status: 400 })
    }

    const db = getDb()

    // Verify project belongs to user's company
    const project = db.prepare(`
      SELECT id, name, company_id FROM projects WHERE id = ? AND company_id = ?
    `).get(projectId, user.company_id) as { id: string; name: string; company_id: string } | undefined

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get subcontractor
    const subcontractor = db.prepare(`
      SELECT id, name, abn, contact_email, contact_name, broker_email, broker_name
      FROM subcontractors WHERE id = ? AND company_id = ?
    `).get(subcontractorId, user.company_id) as Subcontractor | undefined

    if (!subcontractor) {
      return NextResponse.json({ error: 'Subcontractor not found' }, { status: 404 })
    }

    // Get project requirements
    const requirements = db.prepare(`
      SELECT * FROM insurance_requirements WHERE project_id = ?
    `).all(projectId) as InsuranceRequirement[]

    // Create document record
    const documentId = uuidv4()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO coc_documents (
        id, subcontractor_id, project_id, file_url, file_name, file_size,
        source, processing_status, received_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      documentId,
      subcontractorId,
      projectId,
      `/uploads/${fileName}`,
      fileName,
      100000,
      'api',
      'processing',
      now,
      now,
      now
    )

    // Extract and verify
    const extractedData = extractPolicyDetails(fileName, subcontractor)
    const verification = verifyAgainstRequirements(extractedData, requirements)

    // Create verification record
    const verificationId = uuidv4()
    db.prepare(`
      INSERT INTO verifications (
        id, coc_document_id, project_id, status, confidence_score,
        extracted_data, checks, deficiencies, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      verificationId,
      documentId,
      projectId,
      verification.status,
      verification.confidence_score,
      JSON.stringify(extractedData),
      JSON.stringify(verification.checks),
      JSON.stringify(verification.deficiencies),
      now,
      now
    )

    // Update document status
    db.prepare(`
      UPDATE coc_documents SET processing_status = 'completed', processed_at = ? WHERE id = ?
    `).run(now, documentId)

    // Update project_subcontractor status
    const newStatus = verification.status === 'pass' ? 'compliant' : 'non_compliant'
    db.prepare(`
      UPDATE project_subcontractors SET status = ?, updated_at = ?
      WHERE project_id = ? AND subcontractor_id = ?
    `).run(newStatus, now, projectId, subcontractorId)

    // If verification failed, send deficiency email
    let communicationId: string | null = null
    if (verification.status === 'fail' && verification.deficiencies.length > 0) {
      const recipientEmail = subcontractor.broker_email || subcontractor.contact_email

      if (recipientEmail) {
        const deficiencyList = verification.deficiencies.map(d =>
          `• ${d.description}\n  Required: ${d.required_value || 'N/A'}\n  Actual: ${d.actual_value || 'N/A'}`
        ).join('\n\n')

        communicationId = uuidv4()
        const emailSubject = `Certificate of Currency Deficiency Notice - ${subcontractor.name} / ${project.name}`
        const emailBody = `Dear ${subcontractor.contact_name || subcontractor.name},

We have identified deficiencies in the Certificate of Currency submitted for ${subcontractor.name} (ABN: ${subcontractor.abn}) on the ${project.name} project.

DEFICIENCIES FOUND:

${deficiencyList}

ACTION REQUIRED:
Please provide an updated Certificate of Currency that addresses the above deficiencies.

If you have any questions, please contact our project team.

Best regards,
RiskShield AI Compliance Team`

        db.prepare(`
          INSERT INTO communications (
            id, subcontractor_id, project_id, verification_id,
            type, channel, recipient_email, subject, body,
            status, sent_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          communicationId,
          subcontractorId,
          projectId,
          verificationId,
          'deficiency',
          'email',
          recipientEmail,
          emailSubject,
          emailBody,
          'sent',
          now,
          now,
          now
        )
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        fileName
      },
      verification: {
        id: verificationId,
        status: verification.status,
        deficiencyCount: verification.deficiencies.length
      },
      communication: communicationId ? {
        id: communicationId,
        type: 'deficiency',
        sent: true
      } : null
    })

  } catch (error) {
    console.error('Create test document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
