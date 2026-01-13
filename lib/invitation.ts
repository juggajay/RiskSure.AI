import { getConvex, api } from '@/lib/convex'
import type { Id } from '@/convex/_generated/dataModel'
import { sendInvitationEmail } from '@/lib/resend'

// Invitation token expiry: 7 days
const INVITATION_EXPIRY_DAYS = 7

// Human-readable coverage type names
const COVERAGE_TYPE_NAMES: Record<string, string> = {
  'public_liability': 'Public Liability',
  'products_liability': 'Products Liability',
  'workers_comp': 'Workers Compensation',
  'professional_indemnity': 'Professional Indemnity',
  'motor_vehicle': 'Motor Vehicle',
  'contract_works': 'Contract Works',
  'cyber_liability': 'Cyber Liability',
}

/**
 * Convert coverage type code to human-readable name
 */
function formatCoverageType(coverageType: string): string {
  return COVERAGE_TYPE_NAMES[coverageType] || coverageType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface InvitationResult {
  success: boolean
  invitationId?: string
  token?: string
  error?: string
}

/**
 * Generate a random token for invitations
 */
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Send an invitation email to a subcontractor for a specific project
 */
export async function sendSubcontractorInvitation(
  projectId: string,
  subcontractorId: string,
  projectSubcontractorId: string
): Promise<InvitationResult> {
  try {
    const convex = getConvex()

    // Get subcontractor info
    const subcontractor = await convex.query(api.subcontractors.getById, {
      id: subcontractorId as Id<"subcontractors">
    })

    if (!subcontractor) {
      return { success: false, error: 'Subcontractor not found' }
    }

    // Get contact email - prefer contactEmail, fallback to brokerEmail
    const recipientEmail = subcontractor.contactEmail || subcontractor.brokerEmail
    if (!recipientEmail) {
      return { success: false, error: 'Subcontractor has no contact email' }
    }

    // Get project info
    const project = await convex.query(api.projects.getById, {
      id: projectId as Id<"projects">
    })

    if (!project) {
      return { success: false, error: 'Project not found' }
    }

    // Get company info (the builder)
    const company = await convex.query(api.companies.getById, {
      id: project.companyId
    })

    if (!company) {
      return { success: false, error: 'Company not found' }
    }

    // Get project-subcontractor link for on_site_date
    const projectSubcontractor = await convex.query(api.projectSubcontractors.getById, {
      id: projectSubcontractorId as Id<"projectSubcontractors">
    })

    // Get insurance requirements for display
    const requirements = await convex.query(api.insuranceRequirements.getByProject, {
      projectId: projectId as Id<"projects">
    })

    const requirementsList = requirements.map((r: any) => {
      const coverageName = formatCoverageType(r.coverageType)
      if (r.minimumLimit == null) {
        return `${coverageName}: Required`
      }
      const limit = r.minimumLimit >= 1000000
        ? `$${(r.minimumLimit / 1000000).toFixed(0)}M`
        : `$${r.minimumLimit.toLocaleString()}`
      return `${coverageName}: ${limit} minimum`
    })

    // Generate invitation token
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

    // Store invitation token in Convex
    await convex.mutation(api.invitations.create, {
      email: recipientEmail.toLowerCase(),
      token,
      expiresAt: expiresAt.getTime(),
      projectId: projectId as Id<"projects">,
      subcontractorId: subcontractorId as Id<"subcontractors">,
      projectSubcontractorId: projectSubcontractorId as Id<"projectSubcontractors">,
    })

    // Build invitation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invitationLink = `${baseUrl}/portal/verify?token=${token}&type=invitation`

    // Get on-site date if available
    const onSiteDate = projectSubcontractor?.onSiteDate
      ? new Date(projectSubcontractor.onSiteDate).toISOString()
      : undefined

    // Send email
    const emailResult = await sendInvitationEmail({
      recipientEmail,
      recipientName: subcontractor.contactName || subcontractor.name,
      subcontractorName: subcontractor.name,
      subcontractorAbn: subcontractor.abn,
      projectName: project.name,
      builderName: company.name,
      onSiteDate,
      requirements: requirementsList.length > 0 ? requirementsList : undefined,
      invitationLink,
      expiresInDays: INVITATION_EXPIRY_DAYS
    })

    if (!emailResult.success) {
      return { success: false, error: emailResult.error || 'Failed to send email' }
    }

    // Update project_subcontractors with invitation status
    await convex.mutation(api.projectSubcontractors.update, {
      id: projectSubcontractorId as Id<"projectSubcontractors">,
      // Note: invitation fields would need to be added to schema if tracking is needed
    })

    return {
      success: true,
      invitationId: projectSubcontractorId,
      token
    }
  } catch (error) {
    console.error('Send invitation error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send invitation' }
  }
}

/**
 * Resend an invitation email for an existing project-subcontractor assignment
 */
export async function resendInvitation(
  projectSubcontractorId: string
): Promise<InvitationResult> {
  try {
    const convex = getConvex()

    // Get the project-subcontractor assignment
    const assignment = await convex.query(api.projectSubcontractors.getById, {
      id: projectSubcontractorId as Id<"projectSubcontractors">
    })

    if (!assignment) {
      return { success: false, error: 'Assignment not found' }
    }

    return sendSubcontractorInvitation(
      assignment.projectId,
      assignment.subcontractorId,
      projectSubcontractorId
    )
  } catch (error) {
    console.error('Resend invitation error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to resend invitation' }
  }
}

/**
 * Verify an invitation token
 */
export async function verifyInvitationToken(token: string): Promise<{
  valid: boolean
  email?: string
  projectId?: string
  subcontractorId?: string
  error?: string
}> {
  try {
    const convex = getConvex()

    const invitation = await convex.query(api.invitations.getByToken, { token })

    if (!invitation) {
      return { valid: false, error: 'Invalid invitation token' }
    }

    if (invitation.used) {
      return { valid: false, error: 'This invitation link has already been used' }
    }

    if (invitation.expiresAt < Date.now()) {
      return { valid: false, error: 'This invitation link has expired' }
    }

    return {
      valid: true,
      email: invitation.email,
      projectId: invitation.projectId,
      subcontractorId: invitation.subcontractorId
    }
  } catch (error) {
    console.error('Verify invitation error:', error)
    return { valid: false, error: 'Failed to verify invitation' }
  }
}

/**
 * Mark an invitation token as used
 */
export async function markInvitationUsed(token: string): Promise<void> {
  try {
    const convex = getConvex()
    await convex.mutation(api.invitations.markUsed, { token })
  } catch (error) {
    console.error('Mark invitation used error:', error)
  }
}
