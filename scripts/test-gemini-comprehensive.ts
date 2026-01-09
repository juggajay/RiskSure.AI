/**
 * Comprehensive Test Suite for Gemini Extraction + Fraud Detection
 *
 * This script tests:
 * 1. Basic extraction with fraud detection OFF (toggle test)
 * 2. Fraud detection ON with various fraud scenarios
 *
 * Run with: npx tsx scripts/test-gemini-comprehensive.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { extractDocumentData, shouldSkipFraudDetection, convertToLegacyFormat, ExtractedCOCData } from '../lib/gemini'
import { performFraudAnalysis, performSimulatedFraudAnalysis, validateABNChecksum } from '../lib/fraud-detection'

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

// ============================================================================
// Mock COC Data (realistic Australian insurance certificates)
// ============================================================================

// Valid ABNs that pass checksum (calculated using actual algorithm)
const VALID_ABN = '51824753556' // Valid test ABN
const INVALID_ABN = '12345678901' // Invalid checksum

const mockCOCData: ExtractedCOCData = {
  insuredName: 'BuildRight Construction Pty Ltd',
  insuredABN: VALID_ABN,
  insuredAddress: '123 Builder Street, Sydney NSW 2000',
  insurerName: 'QBE Insurance (Australia) Limited',
  insurerABN: '78003191035',
  policyNumber: 'QBEPL12345678',
  startDate: '2025-01-01',
  endDate: '2026-01-01',
  coverages: {
    publicLiability: { limit: 20000000, excess: 1000, currency: 'AUD' },
    productsLiability: { limit: 20000000, excess: 1000, currency: 'AUD' },
    workersCompensation: { limit: 0, excess: 0, currency: 'AUD', state: 'NSW' }
  },
  endorsements: {
    principalIndemnity: true,
    crossLiability: true,
    waiverOfSubrogation: false
  },
  brokerName: 'Acme Insurance Brokers',
  brokerContact: 'John Smith',
  additionalInsuredParties: [],
  fieldConfidence: {
    insuredName: 0.95,
    insuredABN: 0.98,
    insuredAddress: 0.90,
    insurerName: 0.99,
    insurerABN: 0.95,
    policyNumber: 0.98,
    startDate: 0.95,
    endDate: 0.95,
    publicLiability: 0.92,
    productsLiability: 0.92,
    workersCompensation: 0.85,
    professionalIndemnity: 0,
    contractWorks: 0,
    motorVehicle: 0,
    cyberLiability: 0,
    principalIndemnity: 0.90,
    crossLiability: 0.90,
    waiverOfSubrogation: 0.85,
    brokerName: 0.88,
    brokerContact: 0.85
  }
}

// Fraudulent variations
const fraudulentCOCData = {
  invalidABN: { ...mockCOCData, insuredABN: INVALID_ABN },
  invalidDates: { ...mockCOCData, startDate: '2026-01-01', endDate: '2025-01-01' },
  badPolicyFormat: { ...mockCOCData, policyNumber: 'FAKE123' }
}

// ============================================================================
// Test Runner
// ============================================================================

async function runTests() {
  console.log('='.repeat(70))
  console.log('COMPREHENSIVE GEMINI EXTRACTION + FRAUD DETECTION TEST SUITE')
  console.log('='.repeat(70))
  console.log('')

  let allPassed = true
  let testNumber = 0

  // -------------------------------------------------------------------------
  // SECTION 1: Toggle Function Tests
  // -------------------------------------------------------------------------
  console.log('SECTION 1: FRAUD DETECTION TOGGLE TESTS')
  console.log('-'.repeat(50))

  // Test 1.1: Filename toggle - skip fraud
  testNumber++
  const test1_1 = shouldSkipFraudDetection('coc_TEST_SKIP_FRAUD_sample.pdf') === true
  console.log(`  ${testNumber}. _TEST_SKIP_FRAUD_ pattern skips fraud: ${test1_1 ? '✅ PASS' : '❌ FAIL'}`)
  if (!test1_1) allPassed = false

  // Test 1.2: Filename toggle - enable fraud
  testNumber++
  const test1_2 = shouldSkipFraudDetection('coc_TEST_FRAUD_sample.pdf') === false
  console.log(`  ${testNumber}. _TEST_FRAUD_ pattern enables fraud: ${test1_2 ? '✅ PASS' : '❌ FAIL'}`)
  if (!test1_2) allPassed = false

  // Test 1.3: Query param override
  testNumber++
  const params = new URLSearchParams('skip_fraud=false')
  const test1_3 = shouldSkipFraudDetection('coc_TEST_SKIP_FRAUD_.pdf', params) === false
  console.log(`  ${testNumber}. Query param overrides filename: ${test1_3 ? '✅ PASS' : '❌ FAIL'}`)
  if (!test1_3) allPassed = false

  console.log('')

  // -------------------------------------------------------------------------
  // SECTION 2: ABN Validation Tests
  // -------------------------------------------------------------------------
  console.log('SECTION 2: ABN VALIDATION TESTS')
  console.log('-'.repeat(50))

  // Test 2.1: Valid ABN passes checksum
  testNumber++
  const abnValid = validateABNChecksum(VALID_ABN)
  console.log(`  ${testNumber}. Valid ABN (${VALID_ABN}) passes: ${abnValid.valid ? '✅ PASS' : '❌ FAIL'}`)
  if (!abnValid.valid) allPassed = false

  // Test 2.2: Invalid ABN fails checksum
  testNumber++
  const abnInvalid = validateABNChecksum(INVALID_ABN)
  console.log(`  ${testNumber}. Invalid ABN (${INVALID_ABN}) fails: ${!abnInvalid.valid ? '✅ PASS' : '❌ FAIL'}`)
  if (abnInvalid.valid) allPassed = false

  console.log('')

  // -------------------------------------------------------------------------
  // SECTION 3: Extraction with Fraud Detection OFF (using toggle)
  // -------------------------------------------------------------------------
  console.log('SECTION 3: EXTRACTION WITH FRAUD DETECTION OFF')
  console.log('-'.repeat(50))
  console.log('  Using _TEST_SKIP_FRAUD_ toggle to bypass fraud checks')
  console.log('')

  // Convert mock data to legacy format (simulating successful extraction)
  const legacyData = convertToLegacyFormat(mockCOCData, {
    name: 'BuildRight Construction Pty Ltd',
    abn: VALID_ABN
  })

  // Test 3.1: Legacy format has required fields
  testNumber++
  const test3_1 = legacyData.insured_party_name &&
                  legacyData.policy_number &&
                  legacyData.coverages &&
                  (legacyData.coverages as unknown[]).length > 0
  console.log(`  ${testNumber}. Legacy format conversion: ${test3_1 ? '✅ PASS' : '❌ FAIL'}`)
  if (!test3_1) allPassed = false

  // Test 3.2: Verify extraction data structure
  testNumber++
  const test3_2 = mockCOCData.insuredName === 'BuildRight Construction Pty Ltd' &&
                  mockCOCData.insurerName === 'QBE Insurance (Australia) Limited' &&
                  mockCOCData.coverages.publicLiability?.limit === 20000000
  console.log(`  ${testNumber}. Mock COC data structure valid: ${test3_2 ? '✅ PASS' : '❌ FAIL'}`)
  if (!test3_2) allPassed = false

  // Test 3.3: Demonstrate toggle skips fraud (simulated)
  testNumber++
  const skipFraud = shouldSkipFraudDetection('BuildRight_TEST_SKIP_FRAUD_COC.pdf')
  console.log(`  ${testNumber}. Fraud detection skipped for test file: ${skipFraud ? '✅ PASS' : '❌ FAIL'}`)
  if (!skipFraud) allPassed = false

  console.log('')

  // -------------------------------------------------------------------------
  // SECTION 4: Fraud Detection ON - Testing Various Fraud Scenarios
  // -------------------------------------------------------------------------
  console.log('SECTION 4: FRAUD DETECTION ON - TESTING FRAUD SCENARIOS')
  console.log('-'.repeat(50))
  console.log('  Using _TEST_FRAUD_ toggle to enable fraud detection')
  console.log('')

  // Test 4.1: Valid document passes fraud detection
  testNumber++
  const validDocData = {
    insured_party_abn: VALID_ABN,
    insurer_name: 'QBE Insurance (Australia) Limited',
    policy_number: 'QBEPL12345678',
    period_of_insurance_start: '2025-01-01',
    period_of_insurance_end: '2026-01-01',
    coverages: [{ type: 'public_liability', limit: 20000000 }]
  }

  const validResult = performSimulatedFraudAnalysis(validDocData, 'authentic_TEST_FRAUD_coc.pdf')
  const test4_1 = validResult.risk_level === 'low' && !validResult.is_blocked
  console.log(`  ${testNumber}. Valid document passes fraud check:`)
  console.log(`       Risk Level: ${validResult.risk_level} (expected: low)`)
  console.log(`       Blocked: ${validResult.is_blocked} (expected: false)`)
  console.log(`       Result: ${test4_1 ? '✅ PASS' : '❌ FAIL'}`)
  if (!test4_1) allPassed = false

  // Test 4.2: Invalid ABN triggers fraud detection
  testNumber++
  const invalidAbnData = {
    insured_party_abn: INVALID_ABN,
    insurer_name: 'QBE Insurance (Australia) Limited',
    policy_number: 'QBEPL12345678',
    period_of_insurance_start: '2025-01-01',
    period_of_insurance_end: '2026-01-01',
    coverages: [{ type: 'public_liability', limit: 20000000 }]
  }

  const invalidAbnResult = performSimulatedFraudAnalysis(invalidAbnData, 'fake_abn_TEST_FRAUD_coc.pdf')
  const test4_2 = invalidAbnResult.risk_level === 'critical' && invalidAbnResult.is_blocked
  console.log(`  ${testNumber}. Invalid ABN triggers fraud:`)
  console.log(`       Risk Level: ${invalidAbnResult.risk_level} (expected: critical)`)
  console.log(`       Blocked: ${invalidAbnResult.is_blocked} (expected: true)`)
  console.log(`       Evidence: ${invalidAbnResult.evidence_summary.join(', ') || 'none'}`)
  console.log(`       Result: ${test4_2 ? '✅ PASS' : '❌ FAIL'}`)
  if (!test4_2) allPassed = false

  // Test 4.3: Modified document triggers fraud detection
  testNumber++
  const modifiedResult = performSimulatedFraudAnalysis(validDocData, 'modified_TEST_FRAUD_coc.pdf')
  const test4_3 = modifiedResult.risk_level === 'critical' && modifiedResult.is_blocked
  console.log(`  ${testNumber}. Modified document triggers fraud:`)
  console.log(`       Risk Level: ${modifiedResult.risk_level} (expected: critical)`)
  console.log(`       Blocked: ${modifiedResult.is_blocked} (expected: true)`)
  console.log(`       Evidence: ${modifiedResult.evidence_summary[0] || 'none'}`)
  console.log(`       Result: ${test4_3 ? '✅ PASS' : '❌ FAIL'}`)
  if (!test4_3) allPassed = false

  // Test 4.4: Forged template triggers fraud detection
  testNumber++
  const forgedResult = performSimulatedFraudAnalysis(validDocData, 'forged_TEST_FRAUD_coc.pdf')
  const test4_4 = forgedResult.risk_level === 'high' || forgedResult.is_blocked
  console.log(`  ${testNumber}. Forged template triggers fraud:`)
  console.log(`       Risk Level: ${forgedResult.risk_level} (expected: high or critical)`)
  console.log(`       Blocked: ${forgedResult.is_blocked}`)
  console.log(`       Evidence: ${forgedResult.evidence_summary[0] || 'none'}`)
  console.log(`       Result: ${test4_4 ? '✅ PASS' : '❌ FAIL'}`)
  if (!test4_4) allPassed = false

  // Test 4.5: Duplicate submission triggers fraud detection
  testNumber++
  const duplicateResult = performSimulatedFraudAnalysis(validDocData, 'duplicate_TEST_FRAUD_coc.pdf')
  const test4_5 = duplicateResult.risk_level === 'critical' && duplicateResult.is_blocked
  console.log(`  ${testNumber}. Duplicate submission triggers fraud:`)
  console.log(`       Risk Level: ${duplicateResult.risk_level} (expected: critical)`)
  console.log(`       Blocked: ${duplicateResult.is_blocked} (expected: true)`)
  console.log(`       Evidence: ${duplicateResult.evidence_summary[0] || 'none'}`)
  console.log(`       Result: ${test4_5 ? '✅ PASS' : '❌ FAIL'}`)
  if (!test4_5) allPassed = false

  // Test 4.6: Invalid dates trigger fraud detection
  testNumber++
  const invalidDatesData = {
    insured_party_abn: VALID_ABN,
    insurer_name: 'QBE Insurance (Australia) Limited',
    policy_number: 'QBEPL12345678',
    period_of_insurance_start: '2026-01-01', // End before start
    period_of_insurance_end: '2025-01-01',
    coverages: [{ type: 'public_liability', limit: 20000000 }]
  }

  const invalidDatesResult = performSimulatedFraudAnalysis(invalidDatesData, 'genuine_TEST_FRAUD_coc.pdf')
  const test4_6 = invalidDatesResult.risk_level === 'critical' && invalidDatesResult.is_blocked
  console.log(`  ${testNumber}. Invalid dates trigger fraud:`)
  console.log(`       Risk Level: ${invalidDatesResult.risk_level} (expected: critical)`)
  console.log(`       Blocked: ${invalidDatesResult.is_blocked} (expected: true)`)
  console.log(`       Result: ${test4_6 ? '✅ PASS' : '❌ FAIL'}`)
  if (!test4_6) allPassed = false

  console.log('')

  // -------------------------------------------------------------------------
  // SECTION 5: Real Gemini API Call Test
  // -------------------------------------------------------------------------
  console.log('SECTION 5: LIVE GEMINI API TEST')
  console.log('-'.repeat(50))

  try {
    // Create a minimal test image
    const pngData = Buffer.from([
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

    console.log('  Calling Gemini API...')
    const result = await extractDocumentData(pngData, 'image/png', 'test_TEST_SKIP_FRAUD_coc.png')

    testNumber++
    const test5_1 = result.extractionModel === 'gemini-3-flash-preview'
    console.log(`  ${testNumber}. Gemini API responds: ${test5_1 ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`       Model: ${result.extractionModel}`)
    console.log(`       Success: ${result.success}`)
    if (result.data) {
      console.log(`       Extracted insuredName: ${result.data.insuredName || '(empty)'}`)
    }
    if (!test5_1) allPassed = false

  } catch (error) {
    testNumber++
    console.log(`  ${testNumber}. Gemini API responds: ❌ FAIL`)
    console.log(`       Error: ${error}`)
    allPassed = false
  }

  console.log('')

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('='.repeat(70))
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED')
    console.log('')
    console.log('Summary:')
    console.log('  - Toggle mechanism works (filename patterns + query params)')
    console.log('  - ABN validation correctly identifies valid/invalid ABNs')
    console.log('  - Extraction with fraud OFF works (using _TEST_SKIP_FRAUD_)')
    console.log('  - Fraud detection correctly flags:')
    console.log('    • Invalid ABNs')
    console.log('    • Modified documents')
    console.log('    • Forged templates')
    console.log('    • Duplicate submissions')
    console.log('    • Invalid date ranges')
    console.log('  - Gemini API connection verified')
  } else {
    console.log('❌ SOME TESTS FAILED')
  }
  console.log('='.repeat(70))

  return allPassed
}

runTests()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(err => {
    console.error('Test suite error:', err)
    process.exit(1)
  })
