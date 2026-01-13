/**
 * Procore Types Tests
 *
 * Tests for ABN extraction, state code validation, and type mappings.
 */

import {
  extractABNFromVendor,
  isAustralianStateCode,
  AUSTRALIAN_STATE_CODES,
  SHIELD_TO_PROCORE_INSURANCE_TYPE,
  type ProcoreVendor,
} from '@/lib/procore/types'

describe('Procore Types', () => {
  describe('extractABNFromVendor', () => {
    const baseVendor: ProcoreVendor = {
      id: 1,
      name: 'Test Vendor',
      abbreviated_name: null,
      entity_type: null,
      entity_id: null,
      license_number: null,
      tax_id: null,
      business_id: null,
      email_address: null,
      business_phone: null,
      fax_number: null,
      website: null,
      address: null,
      city: null,
      state_code: null,
      country_code: null,
      zip: null,
      dba: null,
      is_active: true,
      vendor_group: null,
      primary_contact: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      erp_vendor_id: null,
    }

    it('should extract ABN from entity_id when entity_type is abn', () => {
      const vendor: ProcoreVendor = {
        ...baseVendor,
        entity_type: 'abn',
        entity_id: '12345678901',
      }
      expect(extractABNFromVendor(vendor)).toBe('12345678901')
    })

    it('should not extract ABN when entity_type is not abn', () => {
      const vendor: ProcoreVendor = {
        ...baseVendor,
        entity_type: 'ein',
        entity_id: '12345678901',
      }
      expect(extractABNFromVendor(vendor)).toBe(null)
    })

    it('should extract ABN from tax_id when it matches 11 digit pattern', () => {
      const vendor: ProcoreVendor = {
        ...baseVendor,
        tax_id: '12345678901',
      }
      expect(extractABNFromVendor(vendor)).toBe('12345678901')
    })

    it('should extract ABN from tax_id with spaces', () => {
      const vendor: ProcoreVendor = {
        ...baseVendor,
        tax_id: '12 345 678 901',
      }
      expect(extractABNFromVendor(vendor)).toBe('12345678901')
    })

    it('should not extract ABN from tax_id if not 11 digits', () => {
      const vendor: ProcoreVendor = {
        ...baseVendor,
        tax_id: '123456789', // Only 9 digits
      }
      expect(extractABNFromVendor(vendor)).toBe(null)
    })

    it('should extract ABN from business_id when it matches 11 digit pattern', () => {
      const vendor: ProcoreVendor = {
        ...baseVendor,
        business_id: '98765432109',
      }
      expect(extractABNFromVendor(vendor)).toBe('98765432109')
    })

    it('should extract ABN from abbreviated_name when it matches 11 digit pattern', () => {
      const vendor: ProcoreVendor = {
        ...baseVendor,
        abbreviated_name: '11122233344',
      }
      expect(extractABNFromVendor(vendor)).toBe('11122233344')
    })

    it('should prioritize entity_id over other fields', () => {
      const vendor: ProcoreVendor = {
        ...baseVendor,
        entity_type: 'abn',
        entity_id: '11111111111',
        tax_id: '22222222222',
        business_id: '33333333333',
      }
      expect(extractABNFromVendor(vendor)).toBe('11111111111')
    })

    it('should return null when no ABN found', () => {
      expect(extractABNFromVendor(baseVendor)).toBe(null)
    })

    it('should handle vendor with all null fields', () => {
      const vendor: ProcoreVendor = {
        ...baseVendor,
        entity_type: null,
        entity_id: null,
        tax_id: null,
        business_id: null,
        abbreviated_name: null,
      }
      expect(extractABNFromVendor(vendor)).toBe(null)
    })
  })

  describe('isAustralianStateCode', () => {
    it('should return true for valid Australian state codes', () => {
      expect(isAustralianStateCode('NSW')).toBe(true)
      expect(isAustralianStateCode('VIC')).toBe(true)
      expect(isAustralianStateCode('QLD')).toBe(true)
      expect(isAustralianStateCode('WA')).toBe(true)
      expect(isAustralianStateCode('SA')).toBe(true)
      expect(isAustralianStateCode('TAS')).toBe(true)
      expect(isAustralianStateCode('ACT')).toBe(true)
      expect(isAustralianStateCode('NT')).toBe(true)
    })

    it('should return false for US state codes', () => {
      expect(isAustralianStateCode('CA')).toBe(false)
      expect(isAustralianStateCode('NY')).toBe(false)
      expect(isAustralianStateCode('TX')).toBe(false)
    })

    it('should return false for null', () => {
      expect(isAustralianStateCode(null)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isAustralianStateCode('')).toBe(false)
    })

    it('should return false for lowercase codes', () => {
      expect(isAustralianStateCode('nsw')).toBe(false)
      expect(isAustralianStateCode('vic')).toBe(false)
    })

    it('should return false for invalid codes', () => {
      expect(isAustralianStateCode('INVALID')).toBe(false)
      expect(isAustralianStateCode('AU')).toBe(false)
    })
  })

  describe('AUSTRALIAN_STATE_CODES', () => {
    it('should contain all 8 Australian state/territory codes', () => {
      expect(AUSTRALIAN_STATE_CODES).toHaveLength(8)
    })

    it('should contain NSW', () => {
      expect(AUSTRALIAN_STATE_CODES).toContain('NSW')
    })

    it('should contain VIC', () => {
      expect(AUSTRALIAN_STATE_CODES).toContain('VIC')
    })

    it('should contain QLD', () => {
      expect(AUSTRALIAN_STATE_CODES).toContain('QLD')
    })

    it('should contain all territories', () => {
      expect(AUSTRALIAN_STATE_CODES).toContain('ACT')
      expect(AUSTRALIAN_STATE_CODES).toContain('NT')
    })
  })

  describe('SHIELD_TO_PROCORE_INSURANCE_TYPE', () => {
    it('should map public_liability to general_liability', () => {
      expect(SHIELD_TO_PROCORE_INSURANCE_TYPE['public_liability']).toBe('general_liability')
    })

    it('should map products_liability to general_liability', () => {
      expect(SHIELD_TO_PROCORE_INSURANCE_TYPE['products_liability']).toBe('general_liability')
    })

    it('should map workers_comp to workers_compensation', () => {
      expect(SHIELD_TO_PROCORE_INSURANCE_TYPE['workers_comp']).toBe('workers_compensation')
    })

    it('should map professional_indemnity to professional_liability', () => {
      expect(SHIELD_TO_PROCORE_INSURANCE_TYPE['professional_indemnity']).toBe('professional_liability')
    })

    it('should map motor_vehicle to auto_liability', () => {
      expect(SHIELD_TO_PROCORE_INSURANCE_TYPE['motor_vehicle']).toBe('auto_liability')
    })

    it('should map contract_works to builders_risk', () => {
      expect(SHIELD_TO_PROCORE_INSURANCE_TYPE['contract_works']).toBe('builders_risk')
    })

    it('should return undefined for unmapped types', () => {
      expect(SHIELD_TO_PROCORE_INSURANCE_TYPE['unknown_type']).toBeUndefined()
    })
  })
})
