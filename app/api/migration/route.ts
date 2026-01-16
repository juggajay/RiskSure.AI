import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db'
import { getUserByToken } from '@/lib/auth'
import {
  classifyDocument,
  extractVendorsFromList,
  matchVendorToSubcontractor,
  type MigrationSession,
  type MigrationDocument,
  type ExtractedVendor,
  type ExtractedCOCData
} from '@/lib/document-classifier'
import { extractDocumentData, convertToLegacyFormat } from '@/lib/gemini'
import { uploadFile } from '@/lib/storage'
import JSZip from 'jszip'
import { migrationSessions } from '@/lib/migration-sessions'
import path from 'path'

// Security: Validate ZIP entry paths to prevent ZIP Slip attacks
function isPathTraversalAttempt(filePath: string): boolean {
  // Normalize the path and check for traversal attempts
  const normalized = path.normalize(filePath)
  // Reject if path tries to go up directories or starts with absolute path
  return normalized.startsWith('..') ||
         path.isAbsolute(normalized) ||
         filePath.includes('..') ||
         filePath.startsWith('/') ||
         filePath.startsWith('\\')
}

// GET /api/migration - Get all migration sessions for the user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Only admin and risk_manager can perform data migration
    if (!['admin', 'risk_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (sessionId) {
      // Get specific session
      const session = migrationSessions.get(sessionId)
      if (!session) {
        return NextResponse.json({ error: 'Migration session not found' }, { status: 404 })
      }
      if (session.companyId !== user.company_id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      return NextResponse.json({ session })
    }

    // Get all sessions for this company
    const sessions = Array.from(migrationSessions.values())
      .filter(s => s.companyId === user.company_id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Get migration sessions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/migration - Create a new migration session and process uploaded files
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Only admin and risk_manager can perform data migration
    if (!['admin', 'risk_manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Only administrators and risk managers can perform data migration' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const db = getDb()

    // Verify project exists and user has access
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND company_id = ?')
      .get(projectId, user.company_id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get existing subcontractors for matching
    const existingSubcontractors = db.prepare(
      'SELECT id, name, abn FROM subcontractors WHERE company_id = ?'
    ).all(user.company_id) as Array<{ id: string; name: string; abn: string }>

    // Create migration session
    const sessionId = uuidv4()
    const session: MigrationSession = {
      id: sessionId,
      projectId,
      companyId: user.company_id!,
      userId: user._id,
      status: 'uploading',
      documents: [],
      vendorsToCreate: [],
      vendorsToMatch: [],
      cocDocuments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Check if it's a ZIP file
    const isZip = file.type === 'application/zip' ||
                  file.type === 'application/x-zip-compressed' ||
                  file.name.toLowerCase().endsWith('.zip')

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const filesToProcess: Array<{ name: string; type: string; size: number; data: Buffer }> = []

    if (isZip) {
      // Extract ZIP file
      const zip = await JSZip.loadAsync(buffer)
      const files = Object.values(zip.files).filter(f => !f.dir)

      console.log(`[MIGRATION] Extracting ZIP with ${files.length} files`)

      for (const zipFile of files) {
        // Skip hidden files and system files
        if (zipFile.name.startsWith('.') || zipFile.name.startsWith('__')) continue

        // Security: Prevent ZIP Slip path traversal attacks
        if (isPathTraversalAttempt(zipFile.name)) {
          console.warn(`[MIGRATION] Skipping suspicious path: ${zipFile.name}`)
          continue
        }

        const fileData = await zipFile.async('nodebuffer')
        const ext = zipFile.name.split('.').pop()?.toLowerCase() || ''
        const mimeTypes: Record<string, string> = {
          'pdf': 'application/pdf',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'xls': 'application/vnd.ms-excel',
          'csv': 'text/csv',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png'
        }

        filesToProcess.push({
          name: zipFile.name.split('/').pop() || zipFile.name,
          type: mimeTypes[ext] || 'application/octet-stream',
          size: fileData.length,
          data: fileData
        })
      }
    } else {
      // Single file
      filesToProcess.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data: buffer
      })
    }

    if (filesToProcess.length === 0) {
      return NextResponse.json({ error: 'No valid files found in upload' }, { status: 400 })
    }

    // Update session status
    session.status = 'classifying'

    // Process each file
    const allVendors: ExtractedVendor[] = []
    const allCOCData: Array<{ documentId: string; data: ExtractedCOCData }> = []

    for (const fileToProcess of filesToProcess) {
      const docId = uuidv4()

      // Classify the document
      const classification = classifyDocument(
        fileToProcess.name,
        fileToProcess.type,
        fileToProcess.size
      )

      const migrationDoc: MigrationDocument = {
        id: docId,
        fileName: fileToProcess.name,
        fileType: fileToProcess.type,
        fileSize: fileToProcess.size,
        classification,
        status: 'pending'
      }

      // Process based on classification
      try {
        if (classification.classification === 'vendor_list') {
          // Extract vendor data from spreadsheet
          const vendors = extractVendorsFromList(fileToProcess.name)
          allVendors.push(...vendors)
          migrationDoc.status = 'processed'
          console.log(`[MIGRATION] Extracted ${vendors.length} vendors from ${fileToProcess.name}`)
        } else if (classification.classification === 'coc' || classification.classification === 'policy_schedule') {
          // Use Gemini to extract COC data (same as regular upload, but no fraud detection)
          console.log(`[MIGRATION] Extracting COC with Gemini: ${fileToProcess.name}`)

          const extractionResult = await extractDocumentData(
            fileToProcess.data,
            fileToProcess.type,
            fileToProcess.name
          )

          if (extractionResult.success && extractionResult.data) {
            // Convert Gemini extraction to migration format
            const cocData: ExtractedCOCData = {
              vendorName: extractionResult.data.insuredName,
              vendorAbn: extractionResult.data.insuredABN,
              insurerName: extractionResult.data.insurerName,
              policyNumber: extractionResult.data.policyNumber,
              policyStartDate: extractionResult.data.startDate,
              policyEndDate: extractionResult.data.endDate,
              coverages: []
            }

            // Convert coverages
            const coverages = extractionResult.data.coverages
            if (coverages.publicLiability) {
              cocData.coverages.push({
                type: 'public_liability',
                limit: coverages.publicLiability.limit,
                excess: coverages.publicLiability.excess
              })
            }
            if (coverages.productsLiability) {
              cocData.coverages.push({
                type: 'products_liability',
                limit: coverages.productsLiability.limit,
                excess: coverages.productsLiability.excess
              })
            }
            if (coverages.workersCompensation) {
              cocData.coverages.push({
                type: 'workers_comp',
                limit: coverages.workersCompensation.limit,
                excess: coverages.workersCompensation.excess
              })
            }
            if (coverages.professionalIndemnity) {
              cocData.coverages.push({
                type: 'professional_indemnity',
                limit: coverages.professionalIndemnity.limit,
                excess: coverages.professionalIndemnity.excess
              })
            }
            if (coverages.contractWorks) {
              cocData.coverages.push({
                type: 'contract_works',
                limit: coverages.contractWorks.limit,
                excess: coverages.contractWorks.excess
              })
            }
            if (coverages.motorVehicle) {
              cocData.coverages.push({
                type: 'motor_vehicle',
                limit: coverages.motorVehicle.limit,
                excess: coverages.motorVehicle.excess
              })
            }

            allCOCData.push({ documentId: docId, data: cocData })
            migrationDoc.status = 'processed'

            // Also extract vendor from COC
            if (cocData.vendorName) {
              allVendors.push({
                name: cocData.vendorName,
                abn: cocData.vendorAbn
              })
            }
            console.log(`[MIGRATION] Gemini extracted COC for ${cocData.vendorName} (${fileToProcess.name})`)
          } else {
            // Extraction failed
            migrationDoc.status = 'error'
            migrationDoc.errorMessage = extractionResult.error?.message || 'Gemini extraction failed'
            console.error(`[MIGRATION] Gemini extraction failed for ${fileToProcess.name}: ${extractionResult.error?.message}`)
          }
        } else {
          // Other/unknown - mark as processed but no extraction
          migrationDoc.status = 'processed'
          console.log(`[MIGRATION] Skipped unknown document type: ${fileToProcess.name}`)
        }
      } catch (error) {
        migrationDoc.status = 'error'
        migrationDoc.errorMessage = error instanceof Error ? error.message : 'Processing failed'
        console.error(`[MIGRATION] Error processing ${fileToProcess.name}:`, error)
      }

      session.documents.push(migrationDoc)
    }

    // Deduplicate vendors by ABN
    const vendorMap = new Map<string, ExtractedVendor>()
    for (const vendor of allVendors) {
      const key = vendor.abn || vendor.name.toLowerCase()
      if (!vendorMap.has(key)) {
        vendorMap.set(key, vendor)
      }
    }
    const uniqueVendors = Array.from(vendorMap.values())

    // Match vendors to existing subcontractors
    for (const vendor of uniqueVendors) {
      const match = matchVendorToSubcontractor(vendor, existingSubcontractors)

      if (match.matchedId && match.confidence >= 0.60) {
        session.vendorsToMatch.push({
          extractedVendor: vendor,
          matchedSubcontractorId: match.matchedId,
          matchedSubcontractorName: match.matchedName,
          matchConfidence: match.confidence
        })
      } else {
        session.vendorsToCreate.push(vendor)
      }
    }

    // Associate COC documents with vendors
    for (const coc of allCOCData) {
      // Find matching vendor
      const vendorKey = coc.data.vendorAbn || coc.data.vendorName.toLowerCase()

      // First check if this vendor is in the match list
      const matchedVendor = session.vendorsToMatch.find(
        v => v.extractedVendor.abn === coc.data.vendorAbn ||
             v.extractedVendor.name.toLowerCase() === coc.data.vendorName.toLowerCase()
      )

      session.cocDocuments.push({
        documentId: coc.documentId,
        vendorMatch: matchedVendor?.matchedSubcontractorId,
        data: coc.data
      })
    }

    // Update session status to reviewing
    session.status = 'reviewing'
    session.updatedAt = new Date().toISOString()

    // Store session
    migrationSessions.set(sessionId, session)

    // Log the migration
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, entity_type, entity_id, action, details)
      VALUES (?, ?, ?, 'migration', ?, 'create', ?)
    `).run(uuidv4(), user.company_id, user._id, sessionId, JSON.stringify({
      projectId,
      documentCount: session.documents.length,
      vendorsToCreate: session.vendorsToCreate.length,
      vendorsToMatch: session.vendorsToMatch.length,
      cocDocuments: session.cocDocuments.length
    }))

    console.log(`[MIGRATION] Session ${sessionId} created: ${session.documents.length} docs, ${session.vendorsToCreate.length} new vendors, ${session.vendorsToMatch.length} matched vendors, ${session.cocDocuments.length} COCs`)

    return NextResponse.json({
      success: true,
      session,
      summary: {
        documentsProcessed: session.documents.length,
        documentsClassified: {
          coc: session.documents.filter(d => d.classification.classification === 'coc').length,
          vendor_list: session.documents.filter(d => d.classification.classification === 'vendor_list').length,
          policy_schedule: session.documents.filter(d => d.classification.classification === 'policy_schedule').length,
          other: session.documents.filter(d => d.classification.classification === 'other').length
        },
        vendorsToCreate: session.vendorsToCreate.length,
        vendorsMatched: session.vendorsToMatch.length,
        cocDocumentsFound: session.cocDocuments.length
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Migration upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/migration - Cancel/delete a migration session
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserByToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const session = migrationSessions.get(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Migration session not found' }, { status: 404 })
    }

    if (session.companyId !== user.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the session
    migrationSessions.delete(sessionId)

    return NextResponse.json({ success: true, message: 'Migration session deleted' })
  } catch (error) {
    console.error('Delete migration session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
