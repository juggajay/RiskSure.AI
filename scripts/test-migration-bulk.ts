/**
 * Bulk Migration Test Script
 *
 * Creates mock COC documents and tests the migration pipeline.
 * Run with: npx tsx scripts/test-migration-bulk.ts [count]
 *
 * Example: npx tsx scripts/test-migration-bulk.ts 25
 */

import * as fs from 'fs'
import * as path from 'path'
import JSZip from 'jszip'

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const idx = line.indexOf('=')
    if (idx > 0) {
      const key = line.substring(0, idx).trim()
      const val = line.substring(idx + 1).trim()
      process.env[key] = val
    }
  })
}

import { extractDocumentData } from '../lib/gemini'

// Minimal valid PNG (1x1 white pixel)
function createMinimalPNG(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
    0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
    0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82
  ])
}

// Company name prefixes for variety
const prefixes = [
  'Alpha', 'Beta', 'Delta', 'Gamma', 'Omega', 'Premier', 'Elite', 'Pro',
  'Master', 'Pacific', 'Metro', 'City', 'National', 'Regional', 'Central',
  'Eastern', 'Western', 'Northern', 'Southern', 'Coastal', 'Highland', 'Valley',
  'Summit', 'Peak', 'River', 'Lake', 'Ocean', 'Mountain', 'Forest', 'Plains'
]

const suffixes = [
  'Construction', 'Builders', 'Contractors', 'Services', 'Solutions',
  'Electrical', 'Plumbing', 'HVAC', 'Roofing', 'Painting', 'Carpentry',
  'Steel', 'Concrete', 'Landscaping', 'Demolition', 'Excavation',
  'Engineering', 'Maintenance', 'Installations', 'Projects'
]

function generateCompanyName(index: number): string {
  const prefix = prefixes[index % prefixes.length]
  const suffix = suffixes[Math.floor(index / prefixes.length) % suffixes.length]
  return `${prefix} ${suffix} Pty Ltd`
}

interface TestResult {
  index: number
  filename: string
  success: boolean
  duration: number
  vendorName?: string
  policyNumber?: string
  error?: string
}

async function runBulkTest(docCount: number, concurrency: number = 3) {
  console.log('='.repeat(70))
  console.log('BULK MIGRATION TEST')
  console.log('='.repeat(70))
  console.log(`Documents to process: ${docCount}`)
  console.log(`Concurrency: ${concurrency}`)
  console.log(`Estimated time: ${Math.ceil(docCount * 12 / concurrency / 60)} minutes`)
  console.log('='.repeat(70))
  console.log('')

  const results: TestResult[] = []
  const startTime = Date.now()
  let processed = 0
  let succeeded = 0
  let failed = 0

  // Process in batches for concurrency control
  const batches: number[][] = []
  for (let i = 0; i < docCount; i += concurrency) {
    const batch: number[] = []
    for (let j = 0; j < concurrency && i + j < docCount; j++) {
      batch.push(i + j)
    }
    batches.push(batch)
  }

  console.log(`Processing ${batches.length} batches of up to ${concurrency} documents each...\n`)

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx]
    const batchStart = Date.now()

    // Process batch concurrently
    const batchPromises = batch.map(async (docIndex) => {
      const filename = `coc_${String(docIndex + 1).padStart(3, '0')}_${generateCompanyName(docIndex).replace(/\s+/g, '_')}.png`
      const docStart = Date.now()

      try {
        const pngData = createMinimalPNG()
        const result = await extractDocumentData(pngData, 'image/png', filename)

        const duration = Date.now() - docStart

        if (result.success && result.data) {
          return {
            index: docIndex,
            filename,
            success: true,
            duration,
            vendorName: result.data.insuredName,
            policyNumber: result.data.policyNumber
          }
        } else {
          return {
            index: docIndex,
            filename,
            success: false,
            duration,
            error: result.error?.message || 'Unknown error'
          }
        }
      } catch (error) {
        return {
          index: docIndex,
          filename,
          success: false,
          duration: Date.now() - docStart,
          error: error instanceof Error ? error.message : 'Exception'
        }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Update counters
    for (const r of batchResults) {
      processed++
      if (r.success) succeeded++
      else failed++
    }

    // Progress update
    const elapsed = (Date.now() - startTime) / 1000
    const rate = processed / elapsed
    const remaining = (docCount - processed) / rate
    const batchDuration = Date.now() - batchStart

    console.log(
      `Batch ${batchIdx + 1}/${batches.length}: ` +
      `${batchResults.filter(r => r.success).length}/${batch.length} OK | ` +
      `Total: ${succeeded}/${processed} (${(succeeded/processed*100).toFixed(1)}%) | ` +
      `Batch time: ${(batchDuration/1000).toFixed(1)}s | ` +
      `ETA: ${Math.ceil(remaining/60)}m ${Math.ceil(remaining%60)}s`
    )

    // Show any failures in this batch
    for (const r of batchResults) {
      if (!r.success) {
        console.log(`  ❌ ${r.filename}: ${r.error}`)
      }
    }
  }

  // Final summary
  const totalDuration = (Date.now() - startTime) / 1000
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length / 1000

  console.log('')
  console.log('='.repeat(70))
  console.log('RESULTS SUMMARY')
  console.log('='.repeat(70))
  console.log(`Total documents: ${docCount}`)
  console.log(`Successful: ${succeeded} (${(succeeded/docCount*100).toFixed(1)}%)`)
  console.log(`Failed: ${failed} (${(failed/docCount*100).toFixed(1)}%)`)
  console.log(`Total time: ${(totalDuration/60).toFixed(1)} minutes`)
  console.log(`Average per doc: ${avgDuration.toFixed(1)} seconds`)
  console.log(`Throughput: ${(docCount/totalDuration*60).toFixed(1)} docs/minute`)
  console.log('='.repeat(70))

  // Sample of extracted data
  const successfulResults = results.filter(r => r.success)
  if (successfulResults.length > 0) {
    console.log('')
    console.log('Sample extracted data (first 5 successful):')
    console.log('-'.repeat(50))
    for (const r of successfulResults.slice(0, 5)) {
      console.log(`  ${r.filename}`)
      console.log(`    Vendor: ${r.vendorName}`)
      console.log(`    Policy: ${r.policyNumber}`)
    }
  }

  // List all failures
  const failedResults = results.filter(r => !r.success)
  if (failedResults.length > 0) {
    console.log('')
    console.log('Failed documents:')
    console.log('-'.repeat(50))
    for (const r of failedResults) {
      console.log(`  ❌ ${r.filename}: ${r.error}`)
    }
  }

  console.log('')
  return { succeeded, failed, totalDuration, avgDuration }
}

// Parse command line args
const args = process.argv.slice(2)
const docCount = parseInt(args[0]) || 10
const concurrency = parseInt(args[1]) || 3

if (docCount > 250) {
  console.log('⚠️  Warning: Testing more than 250 documents may hit rate limits.')
  console.log('   Consider running in smaller batches.')
}

console.log(`\nStarting bulk migration test with ${docCount} documents...\n`)

runBulkTest(docCount, concurrency)
  .then(({ succeeded, failed }) => {
    process.exit(failed > docCount * 0.1 ? 1 : 0) // Fail if >10% errors
  })
  .catch(err => {
    console.error('Test failed:', err)
    process.exit(1)
  })
