import { NextRequest, NextResponse } from 'next/server'
import { getConvex, api } from '@/lib/convex'

// ABN validation helper
function validateABNChecksum(abn: string): boolean {
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const digits = abn.split('').map(Number)
  digits[0] = digits[0] - 1 // Subtract 1 from first digit
  const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0)
  return sum % 89 === 0
}

interface SubcontractorImport {
  name: string
  abn: string
  tradingName?: string
  trade?: string
  address?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  brokerName?: string
  brokerEmail?: string
  brokerPhone?: string
}

interface DuplicateRecord {
  rowNum: number
  importData: SubcontractorImport
  existingId: string
  existingName: string
  cleanedABN: string
}

// POST /api/subcontractors/import - Bulk import subcontractors
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
    if (!user.companyId) {
      return NextResponse.json({ error: 'User has no company' }, { status: 400 })
    }

    // Only admin, risk_manager, project_manager can import subcontractors
    if (!['admin', 'risk_manager', 'project_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Only admins, risk managers, and project managers can import subcontractors' }, { status: 403 })
    }

    const body = await request.json()
    const { subcontractors, mergeIds } = body as {
      subcontractors: SubcontractorImport[]
      mergeIds?: string[] // IDs of existing subcontractors to merge/update
    }

    if (!subcontractors || !Array.isArray(subcontractors) || subcontractors.length === 0) {
      return NextResponse.json({ error: 'No subcontractors to import' }, { status: 400 })
    }

    const created: string[] = []
    const merged: string[] = []
    const errors: string[] = []
    const duplicates: DuplicateRecord[] = []

    for (let i = 0; i < subcontractors.length; i++) {
      const sub = subcontractors[i]
      const rowNum = i + 1

      // Validate required fields
      if (!sub.name?.trim()) {
        errors.push(`Row ${rowNum}: Company name is required`)
        continue
      }

      if (!sub.abn?.trim()) {
        errors.push(`Row ${rowNum}: ABN is required`)
        continue
      }

      // Clean and validate ABN
      const cleanedABN = sub.abn.replace(/\s/g, '')

      if (!/^\d{11}$/.test(cleanedABN)) {
        errors.push(`Row ${rowNum} (${sub.name}): ABN must be exactly 11 digits`)
        continue
      }

      if (!validateABNChecksum(cleanedABN)) {
        errors.push(`Row ${rowNum} (${sub.name}): Invalid ABN checksum`)
        continue
      }

      // Check if ABN already exists
      const existingSub = await convex.query(api.subcontractors.getByAbn, {
        companyId: user.companyId,
        abn: cleanedABN,
      })

      if (existingSub) {
        // Check if user wants to merge this duplicate
        if (mergeIds && mergeIds.includes(existingSub._id)) {
          // Merge/update existing record
          try {
            await convex.mutation(api.subcontractors.update, {
              id: existingSub._id,
              name: sub.name.trim() || undefined,
              tradingName: sub.tradingName?.trim() || undefined,
              trade: sub.trade?.trim() || undefined,
              address: sub.address?.trim() || undefined,
              contactName: sub.contactName?.trim() || undefined,
              contactEmail: sub.contactEmail?.toLowerCase().trim() || undefined,
              contactPhone: sub.contactPhone?.trim() || undefined,
              brokerName: sub.brokerName?.trim() || undefined,
              brokerEmail: sub.brokerEmail?.toLowerCase().trim() || undefined,
              brokerPhone: sub.brokerPhone?.trim() || undefined,
            })
            merged.push(existingSub._id)
          } catch (err) {
            errors.push(`Row ${rowNum} (${sub.name}): Failed to merge`)
            console.error(`Merge error for row ${rowNum}:`, err)
          }
        } else {
          // Track as duplicate for user to decide
          duplicates.push({
            rowNum,
            importData: sub,
            existingId: existingSub._id,
            existingName: existingSub.name,
            cleanedABN
          })
        }
        continue
      }

      try {
        // Create subcontractor
        const subcontractorId = await convex.mutation(api.subcontractors.create, {
          companyId: user.companyId,
          name: sub.name.trim(),
          abn: cleanedABN,
          tradingName: sub.tradingName?.trim() || undefined,
          trade: sub.trade?.trim() || undefined,
          address: sub.address?.trim() || undefined,
          contactName: sub.contactName?.trim() || undefined,
          contactEmail: sub.contactEmail?.toLowerCase().trim() || undefined,
          contactPhone: sub.contactPhone?.trim() || undefined,
          brokerName: sub.brokerName?.trim() || undefined,
          brokerEmail: sub.brokerEmail?.toLowerCase().trim() || undefined,
          brokerPhone: sub.brokerPhone?.trim() || undefined,
        })

        created.push(subcontractorId)
      } catch (err) {
        errors.push(`Row ${rowNum} (${sub.name}): Database error`)
        console.error(`Import error for row ${rowNum}:`, err)
      }
    }

    // Log the bulk import action
    if (created.length > 0 || merged.length > 0) {
      await convex.mutation(api.auditLogs.create, {
        companyId: user.companyId,
        userId: user._id,
        entityType: 'subcontractor',
        entityId: created[0] || merged[0],
        action: 'bulk_import',
        details: {
          created: created.length,
          merged: merged.length,
          total: subcontractors.length,
          errors: errors.length,
          duplicates: duplicates.length
        },
      })
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      merged: merged.length,
      total: subcontractors.length,
      errors: errors.length > 0 ? errors : undefined,
      duplicates: duplicates.length > 0 ? duplicates : undefined
    })

  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
