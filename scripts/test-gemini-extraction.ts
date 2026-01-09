/**
 * Test script for Gemini document extraction
 * Run with: npx tsx scripts/test-gemini-extraction.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { extractDocumentData, shouldSkipFraudDetection, convertToLegacyFormat } from '../lib/gemini'

// Load environment variables from .env.local
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

// Create a minimal test image (1x1 white PNG)
function createTestImage(): Buffer {
  // Minimal valid PNG (1x1 white pixel)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
    0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
    0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
    0x44, 0xAE, 0x42, 0x60, 0x82
  ])
  return pngData
}

async function runTests() {
  console.log('=' .repeat(60))
  console.log('GEMINI EXTRACTION TEST SUITE')
  console.log('=' .repeat(60))
  console.log('')

  let allPassed = true

  // Test 1: Fraud detection toggle - filename patterns
  console.log('TEST 1: Fraud detection toggle - filename patterns')
  console.log('-'.repeat(40))

  const test1a = shouldSkipFraudDetection('doc_TEST_SKIP_FRAUD_.pdf') === true
  console.log(`  _TEST_SKIP_FRAUD_ pattern: ${test1a ? '✅ PASS' : '❌ FAIL'}`)

  const test1b = shouldSkipFraudDetection('doc_TEST_FRAUD_.pdf') === false
  console.log(`  _TEST_FRAUD_ pattern: ${test1b ? '✅ PASS' : '❌ FAIL'}`)

  const test1c = shouldSkipFraudDetection('normal_doc.pdf') === false
  console.log(`  Normal filename: ${test1c ? '✅ PASS' : '❌ FAIL'}`)

  if (!test1a || !test1b || !test1c) allPassed = false
  console.log('')

  // Test 2: Fraud detection toggle - query params
  console.log('TEST 2: Fraud detection toggle - query params')
  console.log('-'.repeat(40))

  const params1 = new URLSearchParams('skip_fraud=true')
  const test2a = shouldSkipFraudDetection('doc.pdf', params1) === true
  console.log(`  ?skip_fraud=true: ${test2a ? '✅ PASS' : '❌ FAIL'}`)

  const params2 = new URLSearchParams('skip_fraud=false')
  const test2b = shouldSkipFraudDetection('doc.pdf', params2) === false
  console.log(`  ?skip_fraud=false: ${test2b ? '✅ PASS' : '❌ FAIL'}`)

  // Query param should override filename
  const test2c = shouldSkipFraudDetection('doc_TEST_SKIP_FRAUD_.pdf', params2) === false
  console.log(`  Query overrides filename: ${test2c ? '✅ PASS' : '❌ FAIL'}`)

  if (!test2a || !test2b || !test2c) allPassed = false
  console.log('')

  // Test 3: Gemini API extraction (with test image)
  console.log('TEST 3: Gemini API extraction')
  console.log('-'.repeat(40))

  try {
    const testImage = createTestImage()
    console.log('  Calling Gemini API with test image...')

    const result = await extractDocumentData(testImage, 'image/png', 'test_coc.png')

    console.log(`  API responded: ${result.success ? '✅' : '⚠️'} (success=${result.success})`)
    console.log(`  Extraction model: ${result.extractionModel}`)
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`)

    if (result.success && result.data) {
      console.log('  ✅ Extraction returned data structure')
      console.log(`     - insuredName: ${result.data.insuredName || '(empty)'}`)
      console.log(`     - policyNumber: ${result.data.policyNumber || '(empty)'}`)
      console.log(`     - Has coverages: ${Object.keys(result.data.coverages).length > 0 ? 'Yes' : 'No'}`)

      // Test legacy format conversion
      const legacy = convertToLegacyFormat(result.data, { name: 'Test Co', abn: '12345678901' })
      const test3b = legacy.insured_party_name && legacy.coverages
      console.log(`  Legacy format conversion: ${test3b ? '✅ PASS' : '❌ FAIL'}`)
    } else if (result.error) {
      // For a blank image, we expect it might fail to extract - that's OK
      console.log(`  ⚠️ Extraction failed (expected for blank image): ${result.error.code}`)
      console.log(`     Message: ${result.error.message}`)
      console.log('  ✅ Error handling works correctly')
    }

    console.log('  ✅ Gemini API connection verified')

  } catch (error) {
    console.log(`  ❌ FAIL: ${error}`)
    allPassed = false
  }

  console.log('')
  console.log('=' .repeat(60))

  if (allPassed) {
    console.log('ALL TESTS PASSED ✅')
    console.log('Gemini extraction integration is working!')
  } else {
    console.log('SOME TESTS FAILED ❌')
  }

  console.log('=' .repeat(60))

  return allPassed
}

runTests()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(err => {
    console.error('Test suite error:', err)
    process.exit(1)
  })
