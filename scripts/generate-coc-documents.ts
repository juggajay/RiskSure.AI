/**
 * COC Document Generator
 *
 * Generates realistic Certificate of Currency documents for testing.
 * - PDFs using pdf-lib
 * - PNG/JPG images using sharp with SVG text rendering
 *
 * Run with: npx tsx scripts/generate-coc-documents.ts [count]
 * Example: npx tsx scripts/generate-coc-documents.ts 250
 */

import * as fs from 'fs'
import * as path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp')
import {
  MockCOCData,
  generateMockCOCBatch,
  formatABN,
  formatCurrency,
  GenerationOptions,
} from './mock-coc-data'

const OUTPUT_DIR = path.join(process.cwd(), '__tests__', 'mock-documents')

/**
 * Create a professional-looking COC PDF document
 */
async function createCOCPDF(data: MockCOCData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4 size

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()

  // Colors
  const darkBlue = rgb(0.1, 0.2, 0.4)
  const black = rgb(0, 0, 0)
  const gray = rgb(0.4, 0.4, 0.4)
  const lightGray = rgb(0.9, 0.9, 0.9)

  let y = height - 50

  // Header - Insurer name
  page.drawText('CERTIFICATE OF CURRENCY', {
    x: 50,
    y,
    size: 18,
    font: helveticaBold,
    color: darkBlue,
  })

  y -= 25
  page.drawText(data.insurerName, {
    x: 50,
    y,
    size: 14,
    font: helveticaBold,
    color: black,
  })

  y -= 18
  page.drawText(`ABN: ${formatABN(data.insurerABN)}`, {
    x: 50,
    y,
    size: 10,
    font: helvetica,
    color: gray,
  })

  // Horizontal line
  y -= 15
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: lightGray,
  })

  // Policy Information Section
  y -= 30
  page.drawText('POLICY INFORMATION', {
    x: 50,
    y,
    size: 12,
    font: helveticaBold,
    color: darkBlue,
  })

  y -= 20
  const drawField = (label: string, value: string, xOffset: number = 50) => {
    page.drawText(label, {
      x: xOffset,
      y,
      size: 9,
      font: helveticaBold,
      color: gray,
    })
    y -= 12
    page.drawText(value, {
      x: xOffset,
      y,
      size: 10,
      font: helvetica,
      color: black,
    })
    y -= 18
  }

  drawField('Policy Number:', data.policyNumber)
  drawField('Period of Insurance:', `${data.startDate} to ${data.endDate}`)

  // Insured Party Section
  y -= 10
  page.drawText('INSURED PARTY', {
    x: 50,
    y,
    size: 12,
    font: helveticaBold,
    color: darkBlue,
  })

  y -= 20
  drawField('Name:', data.insuredName)
  drawField('ABN:', formatABN(data.insuredABN))
  drawField('Address:', data.insuredAddress)

  // Coverages Section
  y -= 10
  page.drawText('SCHEDULE OF COVERAGES', {
    x: 50,
    y,
    size: 12,
    font: helveticaBold,
    color: darkBlue,
  })

  y -= 20

  // Table header
  const colX = [50, 220, 350, 450]
  page.drawText('Coverage Type', { x: colX[0], y, size: 9, font: helveticaBold, color: gray })
  page.drawText('Limit of Liability', { x: colX[1], y, size: 9, font: helveticaBold, color: gray })
  page.drawText('Excess', { x: colX[2], y, size: 9, font: helveticaBold, color: gray })
  page.drawText('State', { x: colX[3], y, size: 9, font: helveticaBold, color: gray })

  y -= 5
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 0.5,
    color: lightGray,
  })
  y -= 15

  const drawCoverageRow = (name: string, limit: number, excess: number, state?: string) => {
    page.drawText(name, { x: colX[0], y, size: 9, font: helvetica, color: black })
    page.drawText(formatCurrency(limit), { x: colX[1], y, size: 9, font: helvetica, color: black })
    page.drawText(formatCurrency(excess), { x: colX[2], y, size: 9, font: helvetica, color: black })
    if (state) {
      page.drawText(state, { x: colX[3], y, size: 9, font: helvetica, color: black })
    }
    y -= 16
  }

  if (data.coverages.publicLiability) {
    drawCoverageRow('Public Liability', data.coverages.publicLiability.limit, data.coverages.publicLiability.excess)
  }
  if (data.coverages.productsLiability) {
    drawCoverageRow('Products Liability', data.coverages.productsLiability.limit, data.coverages.productsLiability.excess)
  }
  if (data.coverages.workersCompensation) {
    drawCoverageRow('Workers Compensation', data.coverages.workersCompensation.limit, data.coverages.workersCompensation.excess, data.coverages.workersCompensation.state)
  }
  if (data.coverages.professionalIndemnity) {
    drawCoverageRow('Professional Indemnity', data.coverages.professionalIndemnity.limit, data.coverages.professionalIndemnity.excess)
  }
  if (data.coverages.contractWorks) {
    drawCoverageRow('Contract Works', data.coverages.contractWorks.limit, data.coverages.contractWorks.excess)
  }
  if (data.coverages.motorVehicle) {
    drawCoverageRow('Motor Vehicle', data.coverages.motorVehicle.limit, data.coverages.motorVehicle.excess)
  }

  // Endorsements Section
  y -= 15
  page.drawText('ENDORSEMENTS', {
    x: 50,
    y,
    size: 12,
    font: helveticaBold,
    color: darkBlue,
  })

  y -= 18
  const endorsements: string[] = []
  if (data.endorsements.principalIndemnity) endorsements.push('Principal Indemnity')
  if (data.endorsements.crossLiability) endorsements.push('Cross Liability')
  if (data.endorsements.waiverOfSubrogation) endorsements.push('Waiver of Subrogation')

  if (endorsements.length > 0) {
    page.drawText(endorsements.join(' | '), {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: black,
    })
  } else {
    page.drawText('No additional endorsements', {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    })
  }

  // Broker Section
  y -= 35
  page.drawText('ISSUING BROKER', {
    x: 50,
    y,
    size: 12,
    font: helveticaBold,
    color: darkBlue,
  })

  y -= 18
  page.drawText(data.brokerName, { x: 50, y, size: 10, font: helveticaBold, color: black })
  y -= 14
  page.drawText(`Contact: ${data.brokerContact}`, { x: 50, y, size: 9, font: helvetica, color: black })
  y -= 12
  page.drawText(`Phone: ${data.brokerPhone}`, { x: 50, y, size: 9, font: helvetica, color: black })
  y -= 12
  page.drawText(`Email: ${data.brokerEmail}`, { x: 50, y, size: 9, font: helvetica, color: black })

  // Footer disclaimer
  y = 60
  page.drawLine({
    start: { x: 50, y: y + 10 },
    end: { x: width - 50, y: y + 10 },
    thickness: 0.5,
    color: lightGray,
  })

  page.drawText(
    'This Certificate of Currency is issued as a matter of information only and confers no rights upon the certificate holder.',
    { x: 50, y, size: 7, font: helvetica, color: gray }
  )
  y -= 10
  page.drawText(
    'This certificate does not amend, extend or alter the coverage afforded by the policies described herein.',
    { x: 50, y, size: 7, font: helvetica, color: gray }
  )

  // Issue date
  y -= 20
  page.drawText(`Issued: ${new Date().toISOString().split('T')[0]}`, {
    x: width - 150,
    y,
    size: 8,
    font: helvetica,
    color: gray,
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

/**
 * Escape XML special characters for SVG
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Create a COC image (PNG or JPG) using sharp with SVG text rendering
 */
async function createCOCImage(data: MockCOCData, format: 'png' | 'jpg'): Promise<Buffer> {
  const width = 800
  const height = 1100

  // Build coverage lines
  const coverageLines: string[] = []
  if (data.coverages.publicLiability) {
    coverageLines.push(`Public Liability: ${formatCurrency(data.coverages.publicLiability.limit)} (Excess: ${formatCurrency(data.coverages.publicLiability.excess)})`)
  }
  if (data.coverages.productsLiability) {
    coverageLines.push(`Products Liability: ${formatCurrency(data.coverages.productsLiability.limit)} (Excess: ${formatCurrency(data.coverages.productsLiability.excess)})`)
  }
  if (data.coverages.workersCompensation) {
    coverageLines.push(`Workers Compensation (${data.coverages.workersCompensation.state}): ${formatCurrency(data.coverages.workersCompensation.limit)}`)
  }
  if (data.coverages.professionalIndemnity) {
    coverageLines.push(`Professional Indemnity: ${formatCurrency(data.coverages.professionalIndemnity.limit)} (Excess: ${formatCurrency(data.coverages.professionalIndemnity.excess)})`)
  }
  if (data.coverages.contractWorks) {
    coverageLines.push(`Contract Works: ${formatCurrency(data.coverages.contractWorks.limit)} (Excess: ${formatCurrency(data.coverages.contractWorks.excess)})`)
  }
  if (data.coverages.motorVehicle) {
    coverageLines.push(`Motor Vehicle: ${formatCurrency(data.coverages.motorVehicle.limit)} (Excess: ${formatCurrency(data.coverages.motorVehicle.excess)})`)
  }

  // Build endorsement lines
  const endorsementLines: string[] = []
  if (data.endorsements.principalIndemnity) endorsementLines.push('Principal Indemnity: Yes')
  if (data.endorsements.crossLiability) endorsementLines.push('Cross Liability: Yes')
  if (data.endorsements.waiverOfSubrogation) endorsementLines.push('Waiver of Subrogation: Yes')

  // Create SVG with all the certificate content
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { font: bold 24px Arial, sans-serif; fill: #1a365d; }
        .heading { font: bold 16px Arial, sans-serif; fill: #1a365d; }
        .subheading { font: bold 14px Arial, sans-serif; fill: #2d3748; }
        .label { font: bold 11px Arial, sans-serif; fill: #718096; }
        .value { font: 12px Arial, sans-serif; fill: #1a202c; }
        .small { font: 10px Arial, sans-serif; fill: #4a5568; }
        .footer { font: 9px Arial, sans-serif; fill: #a0aec0; }
      </style>

      <!-- Background -->
      <rect width="100%" height="100%" fill="#fefefe"/>

      <!-- Header -->
      <text x="50" y="50" class="title">CERTIFICATE OF CURRENCY</text>
      <text x="50" y="80" class="heading">${escapeXml(data.insurerName)}</text>
      <text x="50" y="100" class="small">ABN: ${escapeXml(formatABN(data.insurerABN))}</text>

      <!-- Divider -->
      <line x1="50" y1="115" x2="750" y2="115" stroke="#e2e8f0" stroke-width="1"/>

      <!-- Policy Information -->
      <text x="50" y="145" class="subheading">POLICY INFORMATION</text>
      <text x="50" y="170" class="label">Policy Number:</text>
      <text x="50" y="185" class="value">${escapeXml(data.policyNumber)}</text>
      <text x="50" y="210" class="label">Period of Insurance:</text>
      <text x="50" y="225" class="value">${escapeXml(data.startDate)} to ${escapeXml(data.endDate)}</text>

      <!-- Insured Party -->
      <text x="50" y="265" class="subheading">INSURED PARTY</text>
      <text x="50" y="290" class="label">Name:</text>
      <text x="50" y="305" class="value">${escapeXml(data.insuredName)}</text>
      <text x="50" y="330" class="label">ABN:</text>
      <text x="50" y="345" class="value">${escapeXml(formatABN(data.insuredABN))}</text>
      <text x="50" y="370" class="label">Address:</text>
      <text x="50" y="385" class="value">${escapeXml(data.insuredAddress)}</text>

      <!-- Coverages -->
      <text x="50" y="425" class="subheading">SCHEDULE OF COVERAGES</text>
      ${coverageLines.map((line, i) => `<text x="50" y="${450 + i * 20}" class="value">${escapeXml(line)}</text>`).join('\n')}

      <!-- Endorsements -->
      <text x="50" y="${470 + coverageLines.length * 20}" class="subheading">ENDORSEMENTS</text>
      ${endorsementLines.length > 0
        ? endorsementLines.map((line, i) => `<text x="50" y="${495 + coverageLines.length * 20 + i * 18}" class="value">${escapeXml(line)}</text>`).join('\n')
        : `<text x="50" y="${495 + coverageLines.length * 20}" class="small">No additional endorsements</text>`
      }

      <!-- Broker -->
      <text x="50" y="${550 + coverageLines.length * 20 + endorsementLines.length * 18}" class="subheading">ISSUING BROKER</text>
      <text x="50" y="${575 + coverageLines.length * 20 + endorsementLines.length * 18}" class="value">${escapeXml(data.brokerName)}</text>
      <text x="50" y="${595 + coverageLines.length * 20 + endorsementLines.length * 18}" class="small">Contact: ${escapeXml(data.brokerContact)}</text>
      <text x="50" y="${612 + coverageLines.length * 20 + endorsementLines.length * 18}" class="small">Phone: ${escapeXml(data.brokerPhone)}</text>
      <text x="50" y="${629 + coverageLines.length * 20 + endorsementLines.length * 18}" class="small">Email: ${escapeXml(data.brokerEmail)}</text>

      <!-- Footer -->
      <line x1="50" y1="${height - 80}" x2="750" y2="${height - 80}" stroke="#e2e8f0" stroke-width="1"/>
      <text x="50" y="${height - 55}" class="footer">This Certificate of Currency is issued as a matter of information only and confers no rights upon the certificate holder.</text>
      <text x="50" y="${height - 40}" class="footer">This certificate does not amend, extend or alter the coverage afforded by the policies described herein.</text>
      <text x="600" y="${height - 20}" class="footer">Issued: ${new Date().toISOString().split('T')[0]}</text>
    </svg>
  `

  // Convert SVG to image using sharp
  const sharpInstance = sharp(Buffer.from(svg))

  if (format === 'jpg') {
    return sharpInstance.jpeg({ quality: 90 }).toBuffer()
  } else {
    return sharpInstance.png().toBuffer()
  }
}

/**
 * Generate all mock documents and save to disk
 */
async function generateDocuments(options: GenerationOptions): Promise<{
  generated: number
  failed: number
  outputDir: string
  manifest: Array<{ filename: string; format: string; data: MockCOCData }>
}> {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // Generate mock data
  const mockData = generateMockCOCBatch(options)

  const manifest: Array<{ filename: string; format: string; data: MockCOCData }> = []
  let generated = 0
  let failed = 0

  console.log(`\nGenerating ${options.count} mock COC documents...`)
  console.log(`Output directory: ${OUTPUT_DIR}\n`)

  const startTime = Date.now()

  for (let i = 0; i < mockData.length; i++) {
    const data = mockData[i]
    const paddedIndex = String(i + 1).padStart(3, '0')
    const safeName = data.insuredName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
    const filename = `coc_${paddedIndex}_${safeName}.${data.fileFormat}`
    const filepath = path.join(OUTPUT_DIR, filename)

    try {
      let buffer: Buffer

      if (data.fileFormat === 'pdf') {
        buffer = await createCOCPDF(data)
      } else {
        // Create actual PNG/JPG images using sharp
        buffer = await createCOCImage(data, data.fileFormat as 'png' | 'jpg')
      }

      fs.writeFileSync(filepath, buffer)
      manifest.push({ filename, format: data.fileFormat, data })
      generated++

      // Progress indicator
      if ((i + 1) % 25 === 0 || i === mockData.length - 1) {
        const elapsed = (Date.now() - startTime) / 1000
        const rate = (i + 1) / elapsed
        const remaining = (mockData.length - i - 1) / rate
        console.log(
          `Progress: ${i + 1}/${mockData.length} (${((i + 1) / mockData.length * 100).toFixed(1)}%) | ` +
          `Rate: ${rate.toFixed(1)} docs/sec | ` +
          `ETA: ${remaining.toFixed(0)}s`
        )
      }
    } catch (error) {
      console.error(`Failed to generate ${filename}:`, error)
      failed++
    }
  }

  // Save manifest file for test runner
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  const totalTime = (Date.now() - startTime) / 1000

  console.log(`\n${'='.repeat(60)}`)
  console.log('GENERATION COMPLETE')
  console.log('='.repeat(60))
  console.log(`Generated: ${generated} documents`)
  console.log(`Failed: ${failed} documents`)
  console.log(`Total time: ${totalTime.toFixed(1)} seconds`)
  console.log(`Output: ${OUTPUT_DIR}`)
  console.log(`Manifest: ${manifestPath}`)
  console.log('='.repeat(60))

  return { generated, failed, outputDir: OUTPUT_DIR, manifest }
}

// Main execution
const args = process.argv.slice(2)
const count = parseInt(args[0]) || 250
const failureRate = parseFloat(args[1]) || 0.1

console.log('='.repeat(60))
console.log('COC DOCUMENT GENERATOR')
console.log('='.repeat(60))
console.log(`Count: ${count}`)
console.log(`Failure rate: ${(failureRate * 100).toFixed(0)}%`)
console.log(`Format distribution: 60% PDF, 25% PNG, 15% JPG`)
console.log('='.repeat(60))

generateDocuments({
  count,
  includeFailures: true,
  failureRate,
}).catch(console.error)
