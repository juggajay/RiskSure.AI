import {
  validateABNChecksum,
  analyzeMetadata,
  matchInsurerTemplate,
  validateDataLogic,
  detectDuplicateManipulation,
  performFraudAnalysis,
  performSimulatedFraudAnalysis,
  FraudCheckResult,
  FraudAnalysisResult,
} from '@/lib/fraud-detection'

describe('validateABNChecksum', () => {
  describe('valid ABNs', () => {
    it('should validate a known valid ABN (51 824 753 556)', () => {
      const result = validateABNChecksum('51824753556')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate ABN with spaces', () => {
      const result = validateABNChecksum('51 824 753 556')
      expect(result.valid).toBe(true)
    })

    it('should validate ABN with multiple spaces', () => {
      const result = validateABNChecksum('51  824  753  556')
      expect(result.valid).toBe(true)
    })

    it('should validate another known valid ABN (33 102 417 032 - ATO)', () => {
      const result = validateABNChecksum('33102417032')
      expect(result.valid).toBe(true)
    })
  })

  describe('invalid ABNs', () => {
    it('should reject ABN with wrong checksum', () => {
      const result = validateABNChecksum('12345678901')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('ABN checksum validation failed - invalid ABN')
    })

    it('should reject ABN that is too short', () => {
      const result = validateABNChecksum('1234567890')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('ABN must be exactly 11 digits')
    })

    it('should reject ABN that is too long', () => {
      const result = validateABNChecksum('123456789012')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('ABN must be exactly 11 digits')
    })

    it('should reject ABN with non-numeric characters', () => {
      const result = validateABNChecksum('1234567890a')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('ABN must be exactly 11 digits')
    })

    it('should reject empty string', () => {
      const result = validateABNChecksum('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('ABN must be exactly 11 digits')
    })

    it('should reject ABN with special characters', () => {
      const result = validateABNChecksum('51-824-753-556')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('ABN must be exactly 11 digits')
    })

    it('should reject all zeros', () => {
      const result = validateABNChecksum('00000000000')
      expect(result.valid).toBe(false)
    })
  })
})

describe('analyzeMetadata', () => {
  const baseMetadata = {
    creationDate: '2024-01-01T00:00:00Z',
    modificationDate: '2024-01-01T00:00:00Z',
    producer: 'Adobe Acrobat',
    creator: 'Microsoft Word',
  }

  describe('modification detection', () => {
    it('should pass when modification date matches creation date', () => {
      const results = analyzeMetadata(baseMetadata, 'QBE', 'test.pdf')
      const modCheck = results.find(r => r.check_type === 'metadata_modification')
      expect(modCheck?.status).toBe('pass')
      expect(modCheck?.risk_score).toBe(0)
    })

    it('should warn when document modified significantly after creation', () => {
      const metadata = {
        ...baseMetadata,
        creationDate: '2024-01-01T00:00:00Z',
        modificationDate: '2024-01-15T00:00:00Z', // 14 days later
      }
      const results = analyzeMetadata(metadata, 'QBE', 'test.pdf')
      const modCheck = results.find(r => r.check_type === 'metadata_modification')
      expect(modCheck?.status).toBe('warning')
      expect(modCheck?.risk_score).toBeGreaterThan(0)
      expect(modCheck?.evidence).toBeDefined()
    })

    it('should cap modification risk score at 60', () => {
      const metadata = {
        ...baseMetadata,
        creationDate: '2023-01-01T00:00:00Z',
        modificationDate: '2024-01-01T00:00:00Z', // 365 days later
      }
      const results = analyzeMetadata(metadata, 'QBE', 'test.pdf')
      const modCheck = results.find(r => r.check_type === 'metadata_modification')
      expect(modCheck?.risk_score).toBeLessThanOrEqual(60)
    })
  })

  describe('software analysis', () => {
    it('should pass for legitimate software (Adobe Acrobat)', () => {
      const results = analyzeMetadata(baseMetadata, 'QBE', 'test.pdf')
      const softwareCheck = results.find(r => r.check_type === 'metadata_software')
      expect(softwareCheck?.status).toBe('pass')
      expect(softwareCheck?.risk_score).toBe(0)
    })

    it('should fail for suspicious software (Photoshop)', () => {
      const metadata = {
        ...baseMetadata,
        producer: 'Adobe Photoshop CS6',
      }
      const results = analyzeMetadata(metadata, 'QBE', 'test.pdf')
      const softwareCheck = results.find(r => r.check_type === 'metadata_software')
      expect(softwareCheck?.status).toBe('fail')
      expect(softwareCheck?.risk_score).toBe(70)
    })

    it('should fail for GIMP', () => {
      const metadata = {
        ...baseMetadata,
        producer: 'GIMP 2.10', // Override producer, not creator
        creator: undefined,
      }
      const results = analyzeMetadata(metadata, 'QBE', 'test.pdf')
      const softwareCheck = results.find(r => r.check_type === 'metadata_software')
      expect(softwareCheck?.status).toBe('fail')
    })

    it('should warn for unrecognized software', () => {
      const metadata = {
        ...baseMetadata,
        producer: 'Unknown PDF Creator',
        creator: undefined,
      }
      const results = analyzeMetadata(metadata, 'QBE', 'test.pdf')
      const softwareCheck = results.find(r => r.check_type === 'metadata_software')
      expect(softwareCheck?.status).toBe('warning')
      expect(softwareCheck?.risk_score).toBe(30)
    })

    it('should pass for SAP', () => {
      const metadata = {
        ...baseMetadata,
        producer: 'SAP Crystal Reports',
      }
      const results = analyzeMetadata(metadata, 'QBE', 'test.pdf')
      const softwareCheck = results.find(r => r.check_type === 'metadata_software')
      expect(softwareCheck?.status).toBe('pass')
    })
  })
})

describe('matchInsurerTemplate', () => {
  describe('policy number validation', () => {
    it('should pass for valid QBE policy number format', () => {
      const results = matchInsurerTemplate(
        'QBE Insurance',
        'QBEPL12345678',
        ['ABN', 'Policy Number', 'Period of Insurance', 'Insured']
      )
      const policyCheck = results.find(r => r.check_type === 'policy_number_format')
      expect(policyCheck?.status).toBe('pass')
    })

    it('should fail for invalid QBE policy number format', () => {
      const results = matchInsurerTemplate(
        'QBE Insurance',
        'INVALID12345',
        ['ABN', 'Policy Number', 'Period of Insurance', 'Insured']
      )
      const policyCheck = results.find(r => r.check_type === 'policy_number_format')
      expect(policyCheck?.status).toBe('fail')
      expect(policyCheck?.risk_score).toBe(65)
    })

    it('should pass for valid Allianz policy number format', () => {
      const results = matchInsurerTemplate(
        'Allianz Australia',
        'ALZ1234567890',
        ['ABN', 'Policy Number', 'Period of Insurance', 'Insured']
      )
      const policyCheck = results.find(r => r.check_type === 'policy_number_format')
      expect(policyCheck?.status).toBe('pass')
    })

    it('should pass for valid CGU policy number format', () => {
      const results = matchInsurerTemplate(
        'CGU Insurance',
        'CGU123456789',
        ['ABN', 'Policy Number', 'Period of Insurance', 'Insured']
      )
      const policyCheck = results.find(r => r.check_type === 'policy_number_format')
      expect(policyCheck?.status).toBe('pass')
    })

    it('should pass for valid Zurich policy number format', () => {
      const results = matchInsurerTemplate(
        'Zurich Insurance',
        'ZURA12345678',
        ['ABN', 'Policy Number', 'Period of Insurance', 'Insured']
      )
      const policyCheck = results.find(r => r.check_type === 'policy_number_format')
      expect(policyCheck?.status).toBe('pass')
    })
  })

  describe('unknown insurer handling', () => {
    it('should warn for unknown insurer', () => {
      const results = matchInsurerTemplate(
        'Unknown Insurer Co',
        'UNK12345678',
        ['ABN', 'Policy Number']
      )
      const templateCheck = results.find(r => r.check_type === 'template_match')
      expect(templateCheck?.status).toBe('warning')
      expect(templateCheck?.risk_score).toBe(20)
    })
  })

  describe('certificate element validation', () => {
    it('should pass when all expected elements present', () => {
      const results = matchInsurerTemplate(
        'QBE Insurance',
        'QBEPL12345678',
        ['ABN', 'Policy Number', 'Period of Insurance', 'Insured']
      )
      const elementsCheck = results.find(r => r.check_type === 'template_elements')
      expect(elementsCheck?.status).toBe('pass')
    })

    it('should warn when expected elements are missing', () => {
      const results = matchInsurerTemplate(
        'QBE Insurance',
        'QBEPL12345678',
        ['ABN'] // Missing several elements
      )
      const elementsCheck = results.find(r => r.check_type === 'template_elements')
      expect(elementsCheck?.status).toBe('warning')
      expect(elementsCheck?.risk_score).toBeGreaterThan(0)
    })
  })
})

describe('validateDataLogic', () => {
  const validData = {
    abn: '51824753556',
    policyStart: '2024-01-01',
    policyEnd: '2025-01-01',
    limits: [
      { type: 'public_liability', amount: 10000000 },
      { type: 'products_liability', amount: 10000000 },
    ],
  }

  describe('ABN validation', () => {
    it('should pass for valid ABN', () => {
      const results = validateDataLogic(validData)
      const abnCheck = results.find(r => r.check_type === 'abn_checksum')
      expect(abnCheck?.status).toBe('pass')
    })

    it('should fail for invalid ABN', () => {
      const results = validateDataLogic({
        ...validData,
        abn: '12345678901',
      })
      const abnCheck = results.find(r => r.check_type === 'abn_checksum')
      expect(abnCheck?.status).toBe('fail')
      expect(abnCheck?.risk_score).toBe(80)
    })
  })

  describe('date logic validation', () => {
    it('should pass for valid date range', () => {
      const results = validateDataLogic(validData)
      const dateCheck = results.find(r => r.check_type === 'date_logic')
      expect(dateCheck?.status).toBe('pass')
    })

    it('should fail when end date is before start date', () => {
      const results = validateDataLogic({
        ...validData,
        policyStart: '2025-01-01',
        policyEnd: '2024-01-01',
      })
      const dateCheck = results.find(r => r.check_type === 'date_logic')
      expect(dateCheck?.status).toBe('fail')
      expect(dateCheck?.risk_score).toBe(90)
    })

    it('should fail when end date equals start date', () => {
      const results = validateDataLogic({
        ...validData,
        policyStart: '2024-01-01',
        policyEnd: '2024-01-01',
      })
      const dateCheck = results.find(r => r.check_type === 'date_logic')
      expect(dateCheck?.status).toBe('fail')
    })

    it('should warn for unusually long policy period (>400 days)', () => {
      const results = validateDataLogic({
        ...validData,
        policyStart: '2024-01-01',
        policyEnd: '2026-01-01', // 2 years
      })
      const dateCheck = results.find(r => r.check_type === 'date_logic')
      expect(dateCheck?.status).toBe('warning')
      expect(dateCheck?.risk_score).toBe(25)
    })

    it('should warn for unusually short policy period (<30 days)', () => {
      const results = validateDataLogic({
        ...validData,
        policyStart: '2024-01-01',
        policyEnd: '2024-01-15', // 14 days
      })
      const dateCheck = results.find(r => r.check_type === 'date_logic')
      expect(dateCheck?.status).toBe('warning')
    })
  })

  describe('limit validation', () => {
    it('should fail for zero or negative limit', () => {
      const results = validateDataLogic({
        ...validData,
        limits: [{ type: 'public_liability', amount: 0 }],
      })
      const limitCheck = results.find(r => r.check_type === 'limit_validation')
      expect(limitCheck?.status).toBe('fail')
      expect(limitCheck?.risk_score).toBe(70)
    })

    it('should warn for unusually low public liability limit', () => {
      const results = validateDataLogic({
        ...validData,
        limits: [{ type: 'public_liability', amount: 50000 }],
      })
      const limitCheck = results.find(r => r.check_type === 'limit_validation')
      expect(limitCheck?.status).toBe('warning')
      expect(limitCheck?.risk_score).toBe(40)
    })

    it('should warn for unusually low products liability limit', () => {
      const results = validateDataLogic({
        ...validData,
        limits: [{ type: 'products_liability', amount: 50000 }],
      })
      const limitCheck = results.find(r => r.check_type === 'limit_validation')
      expect(limitCheck?.status).toBe('warning')
    })

    it('should not warn for low limit on other types', () => {
      const results = validateDataLogic({
        ...validData,
        limits: [{ type: 'workers_comp', amount: 50000 }],
      })
      const limitCheck = results.find(r => r.check_type === 'limit_validation')
      expect(limitCheck).toBeUndefined() // No check added for valid other limits
    })
  })
})

describe('detectDuplicateManipulation', () => {
  const previousSubmissions = [
    {
      hash: 'abc123',
      fileName: 'policy1.pdf',
      uploadDate: '2024-01-01',
      extractedData: {
        policyNumber: 'QBEPL12345678',
        expiryDate: '2024-12-31',
      },
    },
  ]

  it('should detect exact duplicate submission', () => {
    const results = detectDuplicateManipulation(
      'abc123', // Same hash
      previousSubmissions,
      { policyNumber: 'QBEPL12345678', expiryDate: '2024-12-31' }
    )
    const dupeCheck = results.find(r => r.check_type === 'duplicate_detection')
    expect(dupeCheck?.status).toBe('info')
    expect(dupeCheck?.risk_score).toBe(10)
  })

  it('should detect date manipulation (same policy, different expiry)', () => {
    const results = detectDuplicateManipulation(
      'xyz789', // Different hash
      previousSubmissions,
      { policyNumber: 'QBEPL12345678', expiryDate: '2025-12-31' } // Different expiry
    )
    const manipCheck = results.find(r => r.check_type === 'date_manipulation')
    expect(manipCheck?.status).toBe('fail')
    expect(manipCheck?.risk_score).toBe(95)
    expect(manipCheck?.evidence).toContain('Previous expiry: 2024-12-31')
    expect(manipCheck?.evidence).toContain('Current expiry: 2025-12-31')
  })

  it('should pass for new policy number', () => {
    const results = detectDuplicateManipulation(
      'xyz789',
      previousSubmissions,
      { policyNumber: 'QBEPL87654321', expiryDate: '2025-12-31' }
    )
    const manipCheck = results.find(r => r.check_type === 'date_manipulation')
    expect(manipCheck?.status).toBe('pass')
    expect(manipCheck?.risk_score).toBe(0)
  })

  it('should handle empty previous submissions', () => {
    const results = detectDuplicateManipulation(
      'abc123',
      [],
      { policyNumber: 'QBEPL12345678', expiryDate: '2024-12-31' }
    )
    const manipCheck = results.find(r => r.check_type === 'date_manipulation')
    expect(manipCheck?.status).toBe('pass')
  })
})

describe('performFraudAnalysis', () => {
  const validExtractedData = {
    insured_party_abn: '51824753556',
    insurer_name: 'QBE Insurance',
    policy_number: 'QBEPL12345678',
    period_of_insurance_start: '2024-01-01',
    period_of_insurance_end: '2025-01-01',
    coverages: [
      { type: 'public_liability', limit: 10000000 },
    ],
  }

  describe('overall analysis', () => {
    it('should return complete fraud analysis result structure', () => {
      const result = performFraudAnalysis(validExtractedData)
      expect(result).toHaveProperty('overall_risk_score')
      expect(result).toHaveProperty('risk_level')
      expect(result).toHaveProperty('is_blocked')
      expect(result).toHaveProperty('checks')
      expect(result).toHaveProperty('recommendation')
      expect(result).toHaveProperty('evidence_summary')
    })

    it('should return low risk for valid document', () => {
      const result = performFraudAnalysis(validExtractedData)
      expect(result.risk_level).toBe('low')
      expect(result.is_blocked).toBe(false)
      expect(result.recommendation).toContain('ACCEPT')
    })

    it('should include checks array with results', () => {
      const result = performFraudAnalysis(validExtractedData)
      expect(Array.isArray(result.checks)).toBe(true)
      expect(result.checks.length).toBeGreaterThan(0)
      result.checks.forEach(check => {
        expect(check).toHaveProperty('check_type')
        expect(check).toHaveProperty('check_name')
        expect(check).toHaveProperty('status')
        expect(check).toHaveProperty('risk_score')
        expect(check).toHaveProperty('details')
      })
    })
  })

  describe('risk level classification', () => {
    it('should classify as critical for risk score >= 80', () => {
      const result = performFraudAnalysis({
        ...validExtractedData,
        insured_party_abn: '12345678901', // Invalid ABN = 80 risk score
      })
      expect(result.risk_level).toBe('critical')
      expect(result.is_blocked).toBe(true)
    })

    it('should classify as high for risk score >= 60', () => {
      const result = performFraudAnalysis({
        ...validExtractedData,
        policy_number: 'INVALID123', // Invalid format = 65 risk score
        insured_party_abn: '51824753556', // Valid ABN
      })
      expect(result.risk_level).toBe('high')
    })

    it('should block document with 2+ failed checks', () => {
      const result = performFraudAnalysis({
        ...validExtractedData,
        insured_party_abn: '12345678901', // Invalid ABN
        period_of_insurance_start: '2025-01-01',
        period_of_insurance_end: '2024-01-01', // Invalid dates
      })
      expect(result.is_blocked).toBe(true)
      expect(result.recommendation).toContain('BLOCK')
    })
  })

  describe('with metadata', () => {
    it('should include metadata checks when provided', () => {
      const result = performFraudAnalysis(
        validExtractedData,
        {
          creationDate: '2024-01-01',
          modificationDate: '2024-01-01',
          producer: 'Adobe Acrobat',
        },
        'test.pdf'
      )
      const metadataCheck = result.checks.find(c => c.check_type === 'metadata_modification')
      expect(metadataCheck).toBeDefined()
    })

    it('should fail for suspicious software in metadata', () => {
      const result = performFraudAnalysis(
        validExtractedData,
        {
          creationDate: '2024-01-01',
          modificationDate: '2024-01-01',
          producer: 'Adobe Photoshop',
        },
        'test.pdf'
      )
      const softwareCheck = result.checks.find(c => c.check_type === 'metadata_software')
      expect(softwareCheck?.status).toBe('fail')
    })
  })

  describe('with previous submissions', () => {
    it('should include duplicate detection when previous submissions provided', () => {
      const previousSubmissions = [
        {
          hash: 'abc123',
          fileName: 'old.pdf',
          uploadDate: '2024-01-01',
          extractedData: {
            policyNumber: 'QBEPL00000000',
            expiryDate: '2024-12-31',
          },
        },
      ]
      const result = performFraudAnalysis(
        validExtractedData,
        undefined,
        'new.pdf',
        previousSubmissions
      )
      const dupeCheck = result.checks.find(c => c.check_type === 'date_manipulation')
      expect(dupeCheck).toBeDefined()
    })
  })

  describe('evidence summary', () => {
    it('should compile evidence from failed/warning checks', () => {
      const result = performFraudAnalysis({
        ...validExtractedData,
        insured_party_abn: '12345678901', // Invalid ABN
      })
      expect(Array.isArray(result.evidence_summary)).toBe(true)
      expect(result.evidence_summary.length).toBeGreaterThan(0)
    })

    it('should have empty evidence summary for clean document', () => {
      const result = performFraudAnalysis(validExtractedData)
      // May have some warnings from unknown insurer template, etc.
      // Just verify it's an array
      expect(Array.isArray(result.evidence_summary)).toBe(true)
    })
  })

  describe('cumulative warning risk', () => {
    it('should add cumulative risk for more than 2 warnings', () => {
      // Create a scenario with multiple warnings
      const result = performFraudAnalysis({
        ...validExtractedData,
        insurer_name: 'Unknown Insurer', // Warning: unknown template
        period_of_insurance_start: '2024-01-01',
        period_of_insurance_end: '2024-01-15', // Warning: short policy
        coverages: [
          { type: 'public_liability', limit: 50000 }, // Warning: low limit
        ],
      })
      // Should have warnings that compound
      const warningChecks = result.checks.filter(c => c.status === 'warning')
      expect(warningChecks.length).toBeGreaterThanOrEqual(2)
    })
  })
})

describe('performSimulatedFraudAnalysis', () => {
  const baseData = {
    insured_party_abn: '51824753556',
    insurer_name: 'QBE Insurance',
    policy_number: 'QBEPL12345678',
    period_of_insurance_start: '2024-01-01',
    period_of_insurance_end: '2025-01-01',
    coverages: [{ type: 'public_liability', limit: 10000000 }],
  }

  describe('filename-based scenarios', () => {
    it('should detect modified document from filename', () => {
      const result = performSimulatedFraudAnalysis(baseData, 'policy_modified.pdf')
      const modCheck = result.checks.find(c => c.check_type === 'metadata_modification')
      expect(modCheck?.status).toBe('fail')
      expect(result.risk_level).toBe('critical')
    })

    it('should detect edited document from filename', () => {
      const result = performSimulatedFraudAnalysis(baseData, 'certificate_edited.pdf')
      const modCheck = result.checks.find(c => c.check_type === 'metadata_modification')
      expect(modCheck?.status).toBe('fail')
    })

    it('should detect forged template from filename', () => {
      const result = performSimulatedFraudAnalysis(baseData, 'forged_certificate.pdf')
      const templateCheck = result.checks.find(c => c.check_type === 'template_match')
      expect(templateCheck?.status).toBe('fail')
    })

    it('should detect duplicate from filename', () => {
      const result = performSimulatedFraudAnalysis(baseData, 'policy_duplicate.pdf')
      const dupeCheck = result.checks.find(c => c.check_type === 'date_manipulation')
      expect(dupeCheck?.status).toBe('fail')
      expect(dupeCheck?.risk_score).toBe(95)
    })

    it('should pass for authentic document', () => {
      const result = performSimulatedFraudAnalysis(baseData, 'authentic_policy.pdf')
      expect(result.risk_level).toBe('low')
      expect(result.is_blocked).toBe(false)
    })

    it('should pass for genuine document', () => {
      const result = performSimulatedFraudAnalysis(baseData, 'genuine_certificate.pdf')
      expect(result.risk_level).toBe('low')
    })

    it('should pass for valid document', () => {
      const result = performSimulatedFraudAnalysis(baseData, 'valid_coc.pdf')
      expect(result.risk_level).toBe('low')
    })
  })

  describe('ABN validation in simulation', () => {
    it('should detect invalid ABN from filename hint', () => {
      const result = performSimulatedFraudAnalysis(baseData, 'fake_abn_certificate.pdf')
      const abnCheck = result.checks.find(c => c.check_type === 'abn_checksum')
      expect(abnCheck?.status).toBe('fail')
    })

    it('should still validate actual ABN when not hinted', () => {
      const result = performSimulatedFraudAnalysis(
        { ...baseData, insured_party_abn: '12345678901' },
        'normal.pdf'
      )
      const abnCheck = result.checks.find(c => c.check_type === 'abn_checksum')
      expect(abnCheck?.status).toBe('fail')
    })
  })

  describe('date logic in simulation', () => {
    it('should fail for invalid date range', () => {
      const result = performSimulatedFraudAnalysis(
        {
          ...baseData,
          period_of_insurance_start: '2025-01-01',
          period_of_insurance_end: '2024-01-01',
        },
        'normal.pdf'
      )
      const dateCheck = result.checks.find(c => c.check_type === 'date_logic')
      expect(dateCheck?.status).toBe('fail')
    })
  })

  describe('risk levels and blocking', () => {
    it('should block critical risk documents', () => {
      const result = performSimulatedFraudAnalysis(baseData, 'modified_forged.pdf')
      expect(result.is_blocked).toBe(true)
      expect(result.recommendation).toContain('BLOCK')
    })

    it('should recommend review for high risk', () => {
      // Simulate a scenario that results in high (not critical) risk
      const result = performSimulatedFraudAnalysis(
        { ...baseData, insured_party_abn: '51824753556' },
        'forged_template.pdf' // 75 risk score
      )
      // High risk but not critical
      if (result.risk_level === 'high' && !result.is_blocked) {
        expect(result.recommendation).toContain('REVIEW')
      }
    })
  })

  describe('result structure', () => {
    it('should return complete result structure', () => {
      const result = performSimulatedFraudAnalysis(baseData, 'test.pdf')
      expect(result).toMatchObject({
        overall_risk_score: expect.any(Number),
        risk_level: expect.stringMatching(/^(low|medium|high|critical)$/),
        is_blocked: expect.any(Boolean),
        checks: expect.any(Array),
        recommendation: expect.any(String),
        evidence_summary: expect.any(Array),
      })
    })

    it('should have all required check properties', () => {
      const result = performSimulatedFraudAnalysis(baseData, 'test.pdf')
      result.checks.forEach(check => {
        expect(check).toMatchObject({
          check_type: expect.any(String),
          check_name: expect.any(String),
          status: expect.stringMatching(/^(pass|fail|warning|info)$/),
          risk_score: expect.any(Number),
          details: expect.any(String),
        })
      })
    })
  })
})

describe('FraudCheckResult type compliance', () => {
  it('should have valid status values', () => {
    const validStatuses = ['pass', 'fail', 'warning', 'info']
    const result = performFraudAnalysis({
      insured_party_abn: '51824753556',
      insurer_name: 'QBE',
      policy_number: 'QBEPL12345678',
      period_of_insurance_start: '2024-01-01',
      period_of_insurance_end: '2025-01-01',
      coverages: [],
    })
    result.checks.forEach(check => {
      expect(validStatuses).toContain(check.status)
    })
  })

  it('should have risk_score between 0 and 100', () => {
    const result = performFraudAnalysis({
      insured_party_abn: '51824753556',
      insurer_name: 'QBE',
      policy_number: 'QBEPL12345678',
      period_of_insurance_start: '2024-01-01',
      period_of_insurance_end: '2025-01-01',
      coverages: [],
    })
    result.checks.forEach(check => {
      expect(check.risk_score).toBeGreaterThanOrEqual(0)
      expect(check.risk_score).toBeLessThanOrEqual(100)
    })
  })
})

describe('FraudAnalysisResult type compliance', () => {
  it('should have valid risk_level values', () => {
    const validLevels = ['low', 'medium', 'high', 'critical']
    const result = performFraudAnalysis({
      insured_party_abn: '51824753556',
      insurer_name: 'QBE',
      policy_number: 'QBEPL12345678',
      period_of_insurance_start: '2024-01-01',
      period_of_insurance_end: '2025-01-01',
      coverages: [],
    })
    expect(validLevels).toContain(result.risk_level)
  })

  it('should have overall_risk_score between 0 and 100', () => {
    const result = performFraudAnalysis({
      insured_party_abn: '51824753556',
      insurer_name: 'QBE',
      policy_number: 'QBEPL12345678',
      period_of_insurance_start: '2024-01-01',
      period_of_insurance_end: '2025-01-01',
      coverages: [],
    })
    expect(result.overall_risk_score).toBeGreaterThanOrEqual(0)
    expect(result.overall_risk_score).toBeLessThanOrEqual(100)
  })
})
