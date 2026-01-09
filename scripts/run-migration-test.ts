/**
 * Migration Test Runner
 *
 * Tests the Gemini extraction pipeline with generated mock documents.
 * Runs concurrent extraction and collects detailed metrics.
 *
 * Prerequisites:
 * 1. Generate documents first: npx tsx scripts/generate-coc-documents.ts 250
 * 2. Ensure GOOGLE_AI_API_KEY is set in .env.local
 *
 * Run with: npx tsx scripts/run-migration-test.ts [concurrency]
 * Example: npx tsx scripts/run-migration-test.ts 5
 */

import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const idx = line.indexOf('=')
    if (idx > 0) {
      const key = line.substring(0, idx).trim()
      const val = line.substring(idx + 1).trim()
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  })
}

import { extractDocumentData, ExtractedCOCData } from '../lib/gemini'
import { MockCOCData } from './mock-coc-data'

const DOCUMENTS_DIR = path.join(process.cwd(), '__tests__', 'mock-documents')
const RESULTS_DIR = path.join(process.cwd(), '__tests__', 'migration-results')

interface DocumentManifest {
  filename: string
  format: string
  data: MockCOCData
}

interface ExtractionResult {
  documentId: number
  filename: string
  format: string
  success: boolean
  duration: number
  confidence?: number
  extractedData?: ExtractedCOCData
  expectedData: MockCOCData
  error?: string
  errorCode?: string
  retryable?: boolean
  fieldAccuracy?: Record<string, boolean>
}

interface TestMetrics {
  totalDocuments: number
  successful: number
  failed: number
  successRate: number
  totalDuration: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  avgConfidence: number
  errorBreakdown: Record<string, number>
  formatBreakdown: Record<string, { total: number; success: number }>
  throughput: number
  rateLimitHits: number
  fieldAccuracyStats: Record<string, { correct: number; total: number }>
}

/**
 * Compare extracted data with expected data
 */
function compareExtraction(extracted: ExtractedCOCData, expected: MockCOCData): Record<string, boolean> {
  const accuracy: Record<string, boolean> = {}

  // Compare insured name (fuzzy match)
  accuracy.insuredName = extracted.insuredName?.toLowerCase().includes(expected.insuredName.toLowerCase().split(' ')[0]) ?? false

  // Compare ABN (exact match after removing spaces)
  const extractedABN = extracted.insuredABN?.replace(/\s/g, '') ?? ''
  accuracy.insuredABN = extractedABN === expected.insuredABN

  // Compare policy number
  accuracy.policyNumber = extracted.policyNumber === expected.policyNumber

  // Compare dates
  accuracy.startDate = extracted.startDate === expected.startDate
  accuracy.endDate = extracted.endDate === expected.endDate

  // Compare insurer name (fuzzy)
  accuracy.insurerName = extracted.insurerName?.toLowerCase().includes(expected.insurerName.toLowerCase().split(' ')[0]) ?? false

  // Compare public liability
  if (expected.coverages.publicLiability) {
    const extractedPL = extracted.coverages?.publicLiability
    accuracy.publicLiabilityLimit = extractedPL?.limit === expected.coverages.publicLiability.limit
    accuracy.publicLiabilityExcess = extractedPL?.excess === expected.coverages.publicLiability.excess
  }

  // Compare workers comp
  if (expected.coverages.workersCompensation) {
    const extractedWC = extracted.coverages?.workersCompensation
    accuracy.workersCompLimit = extractedWC?.limit === expected.coverages.workersCompensation.limit
    accuracy.workersCompState = extractedWC?.state === expected.coverages.workersCompensation.state
  }

  // Compare endorsements
  accuracy.principalIndemnity = extracted.endorsements?.principalIndemnity === expected.endorsements.principalIndemnity
  accuracy.crossLiability = extracted.endorsements?.crossLiability === expected.endorsements.crossLiability
  accuracy.waiverOfSubrogation = extracted.endorsements?.waiverOfSubrogation === expected.endorsements.waiverOfSubrogation

  return accuracy
}

/**
 * Process a single document
 */
async function processDocument(
  manifest: DocumentManifest,
  index: number
): Promise<ExtractionResult> {
  const filepath = path.join(DOCUMENTS_DIR, manifest.filename)
  const startTime = Date.now()

  // Determine MIME type based on actual file format
  const mimeTypeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
  }
  const mimeType = mimeTypeMap[manifest.format] || 'application/pdf'

  try {
    const fileBuffer = fs.readFileSync(filepath)

    const result = await extractDocumentData(fileBuffer, mimeType, manifest.filename)

    const duration = Date.now() - startTime

    if (result.success && result.data) {
      const fieldAccuracy = compareExtraction(result.data, manifest.data)

      return {
        documentId: manifest.data.documentId,
        filename: manifest.filename,
        format: manifest.format,
        success: true,
        duration,
        confidence: result.confidence,
        extractedData: result.data,
        expectedData: manifest.data,
        fieldAccuracy,
      }
    } else {
      return {
        documentId: manifest.data.documentId,
        filename: manifest.filename,
        format: manifest.format,
        success: false,
        duration,
        expectedData: manifest.data,
        error: result.error?.message || 'Unknown error',
        errorCode: result.error?.code,
        retryable: result.error?.retryable,
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Exception'

    return {
      documentId: manifest.data.documentId,
      filename: manifest.filename,
      format: manifest.format,
      success: false,
      duration,
      expectedData: manifest.data,
      error: errorMessage,
      errorCode: errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate') ? 'RATE_LIMITED' : 'EXCEPTION',
      retryable: true,
    }
  }
}

/**
 * Calculate test metrics from results
 */
function calculateMetrics(results: ExtractionResult[]): TestMetrics {
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  const durations = results.map(r => r.duration)
  const totalDuration = durations.reduce((a, b) => a + b, 0)

  const confidences = successful.map(r => r.confidence || 0)
  const avgConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0

  // Error breakdown
  const errorBreakdown: Record<string, number> = {}
  for (const r of failed) {
    const key = r.errorCode || 'UNKNOWN'
    errorBreakdown[key] = (errorBreakdown[key] || 0) + 1
  }

  // Format breakdown
  const formatBreakdown: Record<string, { total: number; success: number }> = {}
  for (const r of results) {
    if (!formatBreakdown[r.format]) {
      formatBreakdown[r.format] = { total: 0, success: 0 }
    }
    formatBreakdown[r.format].total++
    if (r.success) formatBreakdown[r.format].success++
  }

  // Field accuracy stats
  const fieldAccuracyStats: Record<string, { correct: number; total: number }> = {}
  for (const r of successful) {
    if (r.fieldAccuracy) {
      for (const [field, correct] of Object.entries(r.fieldAccuracy)) {
        if (!fieldAccuracyStats[field]) {
          fieldAccuracyStats[field] = { correct: 0, total: 0 }
        }
        fieldAccuracyStats[field].total++
        if (correct) fieldAccuracyStats[field].correct++
      }
    }
  }

  // Rate limit hits
  const rateLimitHits = failed.filter(r => r.errorCode === 'RATE_LIMITED').length

  return {
    totalDocuments: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: results.length > 0 ? successful.length / results.length : 0,
    totalDuration,
    avgDuration: results.length > 0 ? totalDuration / results.length : 0,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    avgConfidence,
    errorBreakdown,
    formatBreakdown,
    throughput: totalDuration > 0 ? results.length / (totalDuration / 1000) : 0,
    rateLimitHits,
    fieldAccuracyStats,
  }
}

/**
 * Run the migration test
 */
async function runMigrationTest(concurrency: number = 5): Promise<void> {
  console.log('='.repeat(70))
  console.log('MIGRATION TEST - GEMINI EXTRACTION')
  console.log('='.repeat(70))

  // Check for API key
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.error('ERROR: GOOGLE_AI_API_KEY not set in environment')
    process.exit(1)
  }

  // Load manifest
  const manifestPath = path.join(DOCUMENTS_DIR, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.error(`ERROR: Manifest not found at ${manifestPath}`)
    console.error('Run: npx tsx scripts/generate-coc-documents.ts 250')
    process.exit(1)
  }

  const manifest: DocumentManifest[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

  console.log(`Documents to process: ${manifest.length}`)
  console.log(`Concurrency: ${concurrency}`)
  console.log(`Estimated time: ${Math.ceil(manifest.length * 8 / concurrency / 60)} minutes`)
  console.log('='.repeat(70))
  console.log('')

  // Create results directory
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true })
  }

  const results: ExtractionResult[] = []
  const startTime = Date.now()
  let processed = 0

  // Process in batches
  const batches: DocumentManifest[][] = []
  for (let i = 0; i < manifest.length; i += concurrency) {
    batches.push(manifest.slice(i, i + concurrency))
  }

  console.log(`Processing ${batches.length} batches of up to ${concurrency} documents each...\n`)

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx]
    const batchStart = Date.now()

    // Process batch concurrently
    const batchPromises = batch.map((doc, idx) =>
      processDocument(doc, batchIdx * concurrency + idx)
    )

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    processed += batch.length

    // Progress update
    const elapsed = (Date.now() - startTime) / 1000
    const rate = processed / elapsed
    const remaining = (manifest.length - processed) / rate
    const batchDuration = (Date.now() - batchStart) / 1000
    const batchSuccess = batchResults.filter(r => r.success).length

    console.log(
      `Batch ${batchIdx + 1}/${batches.length}: ` +
      `${batchSuccess}/${batch.length} OK | ` +
      `Total: ${results.filter(r => r.success).length}/${processed} ` +
      `(${(results.filter(r => r.success).length / processed * 100).toFixed(1)}%) | ` +
      `Batch: ${batchDuration.toFixed(1)}s | ` +
      `ETA: ${Math.floor(remaining / 60)}m ${Math.floor(remaining % 60)}s`
    )

    // Show failures in this batch
    for (const r of batchResults) {
      if (!r.success) {
        console.log(`  ❌ ${r.filename}: ${r.errorCode} - ${r.error?.substring(0, 50)}`)
      }
    }

    // Add delay between batches if we hit rate limits
    const rateLimitHits = batchResults.filter(r => r.errorCode === 'RATE_LIMITED').length
    if (rateLimitHits > 0) {
      console.log(`  ⚠️  Rate limit hit ${rateLimitHits} times - waiting 10s...`)
      await new Promise(resolve => setTimeout(resolve, 10000))
    }
  }

  // Calculate metrics
  const metrics = calculateMetrics(results)
  const totalDuration = (Date.now() - startTime) / 1000

  // Print summary
  console.log('')
  console.log('='.repeat(70))
  console.log('TEST RESULTS SUMMARY')
  console.log('='.repeat(70))
  console.log(`Total documents: ${metrics.totalDocuments}`)
  console.log(`Successful: ${metrics.successful} (${(metrics.successRate * 100).toFixed(1)}%)`)
  console.log(`Failed: ${metrics.failed} (${((1 - metrics.successRate) * 100).toFixed(1)}%)`)
  console.log('')
  console.log('TIMING:')
  console.log(`  Total time: ${(totalDuration / 60).toFixed(1)} minutes`)
  console.log(`  Avg per doc: ${(metrics.avgDuration / 1000).toFixed(2)}s`)
  console.log(`  Min: ${(metrics.minDuration / 1000).toFixed(2)}s`)
  console.log(`  Max: ${(metrics.maxDuration / 1000).toFixed(2)}s`)
  console.log(`  Throughput: ${(metrics.totalDocuments / totalDuration * 60).toFixed(1)} docs/minute`)
  console.log('')
  console.log('QUALITY:')
  console.log(`  Avg confidence: ${(metrics.avgConfidence * 100).toFixed(1)}%`)
  console.log(`  Rate limit hits: ${metrics.rateLimitHits}`)
  console.log('')

  if (Object.keys(metrics.errorBreakdown).length > 0) {
    console.log('ERROR BREAKDOWN:')
    for (const [code, count] of Object.entries(metrics.errorBreakdown)) {
      console.log(`  ${code}: ${count} (${(count / metrics.failed * 100).toFixed(1)}%)`)
    }
    console.log('')
  }

  console.log('FORMAT BREAKDOWN:')
  for (const [format, stats] of Object.entries(metrics.formatBreakdown)) {
    console.log(`  ${format.toUpperCase()}: ${stats.success}/${stats.total} (${(stats.success / stats.total * 100).toFixed(1)}%)`)
  }
  console.log('')

  console.log('FIELD ACCURACY:')
  for (const [field, stats] of Object.entries(metrics.fieldAccuracyStats)) {
    const accuracy = stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(1) : 'N/A'
    console.log(`  ${field}: ${stats.correct}/${stats.total} (${accuracy}%)`)
  }

  console.log('')
  console.log('='.repeat(70))

  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const resultsPath = path.join(RESULTS_DIR, `migration-test-${timestamp}.json`)
  const reportPath = path.join(RESULTS_DIR, `migration-report-${timestamp}.md`)

  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: { concurrency, totalDocuments: manifest.length },
    metrics,
    results: results.map(r => ({
      documentId: r.documentId,
      filename: r.filename,
      format: r.format,
      success: r.success,
      duration: r.duration,
      confidence: r.confidence,
      error: r.error,
      errorCode: r.errorCode,
      fieldAccuracy: r.fieldAccuracy,
    })),
  }, null, 2))

  // Generate markdown report
  const report = `# Migration Test Report

**Date:** ${new Date().toISOString()}
**Documents:** ${metrics.totalDocuments}
**Concurrency:** ${concurrency}

## Summary

| Metric | Value |
|--------|-------|
| Success Rate | ${(metrics.successRate * 100).toFixed(1)}% |
| Total Time | ${(totalDuration / 60).toFixed(1)} minutes |
| Avg Time/Doc | ${(metrics.avgDuration / 1000).toFixed(2)}s |
| Throughput | ${(metrics.totalDocuments / totalDuration * 60).toFixed(1)} docs/min |
| Avg Confidence | ${(metrics.avgConfidence * 100).toFixed(1)}% |
| Rate Limit Hits | ${metrics.rateLimitHits} |

## Results by Format

| Format | Success | Total | Rate |
|--------|---------|-------|------|
${Object.entries(metrics.formatBreakdown).map(([f, s]) =>
  `| ${f.toUpperCase()} | ${s.success} | ${s.total} | ${(s.success / s.total * 100).toFixed(1)}% |`
).join('\n')}

## Field Extraction Accuracy

| Field | Correct | Total | Accuracy |
|-------|---------|-------|----------|
${Object.entries(metrics.fieldAccuracyStats).map(([f, s]) =>
  `| ${f} | ${s.correct} | ${s.total} | ${(s.correct / s.total * 100).toFixed(1)}% |`
).join('\n')}

## Errors

${Object.keys(metrics.errorBreakdown).length > 0
  ? Object.entries(metrics.errorBreakdown).map(([code, count]) =>
      `- **${code}:** ${count} occurrences`
    ).join('\n')
  : 'No errors encountered.'
}

## Failed Documents

${results.filter(r => !r.success).slice(0, 20).map(r =>
  `- \`${r.filename}\`: ${r.errorCode} - ${r.error}`
).join('\n') || 'None'}

${results.filter(r => !r.success).length > 20 ? `\n... and ${results.filter(r => !r.success).length - 20} more` : ''}
`

  fs.writeFileSync(reportPath, report)

  console.log(`Results saved to: ${resultsPath}`)
  console.log(`Report saved to: ${reportPath}`)
  console.log('='.repeat(70))

  // Exit with error if too many failures
  if (metrics.successRate < 0.8) {
    console.log('\n⚠️  WARNING: Success rate below 80%')
    process.exit(1)
  }
}

// Parse args and run
const args = process.argv.slice(2)
const concurrency = parseInt(args[0]) || 5

runMigrationTest(concurrency).catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
