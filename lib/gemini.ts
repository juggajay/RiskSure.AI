/**
 * Gemini 3 Flash Document Extraction Module
 *
 * Uses Google's Gemini 2.0 Flash model for AI-powered extraction
 * of Certificate of Currency (COC) documents.
 */

import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai'

// ============================================================================
// Types
// ============================================================================

export interface CoverageDetail {
  limit: number
  excess: number
  currency: string
}

export interface WorkersCompCoverage extends CoverageDetail {
  state: string
}

export interface ExtractedCOCData {
  // Insured Party
  insuredName: string
  insuredABN: string
  insuredAddress: string

  // Insurer
  insurerName: string
  insurerABN: string

  // Policy Details
  policyNumber: string
  startDate: string  // ISO format YYYY-MM-DD
  endDate: string    // ISO format YYYY-MM-DD

  // Coverages
  coverages: {
    publicLiability?: CoverageDetail
    productsLiability?: CoverageDetail
    workersCompensation?: WorkersCompCoverage
    professionalIndemnity?: CoverageDetail
    contractWorks?: CoverageDetail
    motorVehicle?: CoverageDetail
    cyberLiability?: CoverageDetail
  }

  // Endorsements
  endorsements: {
    principalIndemnity: boolean
    crossLiability: boolean
    waiverOfSubrogation: boolean
  }

  // Broker
  brokerName?: string
  brokerContact?: string

  // Additional
  additionalInsuredParties?: string[]

  // Field-level confidence scores (0-1)
  fieldConfidence: Record<string, number>
}

export type ExtractionErrorCode = 'UNREADABLE' | 'INVALID_FORMAT' | 'API_ERROR' | 'RATE_LIMITED'

export interface ExtractionError {
  code: ExtractionErrorCode
  message: string
  retryable: boolean
}

export interface ExtractionResult {
  success: boolean
  data?: ExtractedCOCData
  error?: ExtractionError
  confidence: number
  extractionModel: string
  extractionTimestamp: string
}

// ============================================================================
// Gemini Client
// ============================================================================

const GEMINI_MODEL = 'gemini-3-flash-preview'

let genAI: GoogleGenerativeAI | null = null
let model: GenerativeModel | null = null

function getGeminiClient(): GenerativeModel {
  if (!model) {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set')
    }
    genAI = new GoogleGenerativeAI(apiKey)
    model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
  }
  return model
}

// ============================================================================
// Extraction Prompt
// ============================================================================

const EXTRACTION_PROMPT = `You are an expert document analyzer specializing in Australian insurance Certificates of Currency (COC).

Analyze the provided document and extract all insurance information in a structured JSON format.

IMPORTANT EXTRACTION RULES:
1. Extract exact values as they appear in the document
2. Convert all monetary values to numbers (remove $ and commas)
3. Convert dates to ISO format (YYYY-MM-DD)
4. For ABN, extract all 11 digits without spaces
5. For coverages, identify the coverage type and extract limit and excess values
6. For endorsements, check if Principal Indemnity, Cross Liability, or Waiver of Subrogation are mentioned
7. Provide a confidence score (0-1) for each field based on how clearly it was visible/readable

Return ONLY valid JSON in this exact structure (no markdown, no explanation):

{
  "insuredName": "string - The insured party/policyholder name",
  "insuredABN": "string - 11 digit ABN without spaces",
  "insuredAddress": "string - Full address of insured party",
  "insurerName": "string - Insurance company name",
  "insurerABN": "string - Insurer's ABN if visible",
  "policyNumber": "string - Policy/certificate number",
  "startDate": "string - Policy start date in YYYY-MM-DD format",
  "endDate": "string - Policy end date in YYYY-MM-DD format",
  "coverages": {
    "publicLiability": { "limit": number, "excess": number, "currency": "AUD" },
    "productsLiability": { "limit": number, "excess": number, "currency": "AUD" },
    "workersCompensation": { "limit": number, "excess": number, "currency": "AUD", "state": "string - NSW/VIC/QLD/etc" },
    "professionalIndemnity": { "limit": number, "excess": number, "currency": "AUD" },
    "contractWorks": { "limit": number, "excess": number, "currency": "AUD" },
    "motorVehicle": { "limit": number, "excess": number, "currency": "AUD" },
    "cyberLiability": { "limit": number, "excess": number, "currency": "AUD" }
  },
  "endorsements": {
    "principalIndemnity": boolean,
    "crossLiability": boolean,
    "waiverOfSubrogation": boolean
  },
  "brokerName": "string or null",
  "brokerContact": "string or null - broker contact person name",
  "additionalInsuredParties": ["array of strings or empty array"],
  "fieldConfidence": {
    "insuredName": number 0-1,
    "insuredABN": number 0-1,
    "insuredAddress": number 0-1,
    "insurerName": number 0-1,
    "insurerABN": number 0-1,
    "policyNumber": number 0-1,
    "startDate": number 0-1,
    "endDate": number 0-1,
    "publicLiability": number 0-1,
    "productsLiability": number 0-1,
    "workersCompensation": number 0-1,
    "professionalIndemnity": number 0-1,
    "contractWorks": number 0-1,
    "motorVehicle": number 0-1,
    "cyberLiability": number 0-1,
    "principalIndemnity": number 0-1,
    "crossLiability": number 0-1,
    "waiverOfSubrogation": number 0-1,
    "brokerName": number 0-1,
    "brokerContact": number 0-1
  },
  "overallConfidence": number 0-1
}

If a coverage type is not present in the document, omit it from the coverages object entirely.
If broker information is not present, set brokerName and brokerContact to null.
For endorsements, set to false if not explicitly mentioned in the document.

If the document is unreadable, corrupted, or not a Certificate of Currency, return:
{
  "error": "UNREADABLE",
  "message": "Brief description of why extraction failed"
}
`

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract document data from a Certificate of Currency using Gemini 3 Flash
 */
export async function extractDocumentData(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ExtractionResult> {
  const startTime = Date.now()

  try {
    const gemini = getGeminiClient()

    // Validate mime type
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]

    if (!supportedTypes.includes(mimeType)) {
      return {
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: `Unsupported file type: ${mimeType}. Please upload a PDF or image file.`,
          retryable: false
        },
        confidence: 0,
        extractionModel: GEMINI_MODEL,
        extractionTimestamp: new Date().toISOString()
      }
    }

    // Convert buffer to base64 for Gemini
    const base64Data = fileBuffer.toString('base64')

    // Create the document part for Gemini
    const documentPart: Part = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    }

    // Call Gemini API
    const result = await gemini.generateContent([
      EXTRACTION_PROMPT,
      documentPart
    ])

    const response = result.response
    const text = response.text()

    // Parse the JSON response
    let extractedJson: Record<string, unknown>
    try {
      // Clean up the response - remove any markdown code blocks if present
      let cleanedText = text.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7)
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3)
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3)
      }
      cleanedText = cleanedText.trim()

      extractedJson = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('[Gemini] Failed to parse response:', text)
      return {
        success: false,
        error: {
          code: 'UNREADABLE',
          message: 'Failed to parse extracted data from document. The document may be corrupted or not a valid Certificate of Currency.',
          retryable: true
        },
        confidence: 0,
        extractionModel: GEMINI_MODEL,
        extractionTimestamp: new Date().toISOString()
      }
    }

    // Check if Gemini returned an error
    if (extractedJson.error) {
      return {
        success: false,
        error: {
          code: 'UNREADABLE',
          message: String(extractedJson.message) || 'Could not extract data from document',
          retryable: true
        },
        confidence: 0,
        extractionModel: GEMINI_MODEL,
        extractionTimestamp: new Date().toISOString()
      }
    }

    // Convert Gemini response to our ExtractedCOCData format
    const data = convertToExtractedCOCData(extractedJson)
    const overallConfidence = typeof extractedJson.overallConfidence === 'number'
      ? extractedJson.overallConfidence
      : calculateOverallConfidence(data.fieldConfidence)

    console.log(`[Gemini] Extraction completed in ${Date.now() - startTime}ms, confidence: ${(overallConfidence * 100).toFixed(1)}%`)

    return {
      success: true,
      data,
      confidence: overallConfidence,
      extractionModel: GEMINI_MODEL,
      extractionTimestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('[Gemini] Extraction error:', error)

    // Handle specific error types
    if (error instanceof Error) {
      // Rate limiting
      if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Service is temporarily busy. Please try again in a few moments.',
            retryable: true
          },
          confidence: 0,
          extractionModel: GEMINI_MODEL,
          extractionTimestamp: new Date().toISOString()
        }
      }

      // API errors
      if (error.message.includes('API') || error.message.includes('network')) {
        return {
          success: false,
          error: {
            code: 'API_ERROR',
            message: 'Failed to connect to AI service. Please try again.',
            retryable: true
          },
          confidence: 0,
          extractionModel: GEMINI_MODEL,
          extractionTimestamp: new Date().toISOString()
        }
      }
    }

    // Generic error
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'An unexpected error occurred during document extraction.',
        retryable: true
      },
      confidence: 0,
      extractionModel: GEMINI_MODEL,
      extractionTimestamp: new Date().toISOString()
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function convertToExtractedCOCData(json: Record<string, unknown>): ExtractedCOCData {
  const coverages = json.coverages as Record<string, unknown> | undefined
  const endorsements = json.endorsements as Record<string, unknown> | undefined
  const fieldConfidence = json.fieldConfidence as Record<string, number> | undefined

  return {
    insuredName: String(json.insuredName || ''),
    insuredABN: String(json.insuredABN || '').replace(/\s/g, ''),
    insuredAddress: String(json.insuredAddress || ''),
    insurerName: String(json.insurerName || ''),
    insurerABN: String(json.insurerABN || '').replace(/\s/g, ''),
    policyNumber: String(json.policyNumber || ''),
    startDate: String(json.startDate || ''),
    endDate: String(json.endDate || ''),
    coverages: {
      publicLiability: coverages?.publicLiability ? convertCoverage(coverages.publicLiability) : undefined,
      productsLiability: coverages?.productsLiability ? convertCoverage(coverages.productsLiability) : undefined,
      workersCompensation: coverages?.workersCompensation ? convertWorkersCompCoverage(coverages.workersCompensation) : undefined,
      professionalIndemnity: coverages?.professionalIndemnity ? convertCoverage(coverages.professionalIndemnity) : undefined,
      contractWorks: coverages?.contractWorks ? convertCoverage(coverages.contractWorks) : undefined,
      motorVehicle: coverages?.motorVehicle ? convertCoverage(coverages.motorVehicle) : undefined,
      cyberLiability: coverages?.cyberLiability ? convertCoverage(coverages.cyberLiability) : undefined,
    },
    endorsements: {
      principalIndemnity: Boolean(endorsements?.principalIndemnity),
      crossLiability: Boolean(endorsements?.crossLiability),
      waiverOfSubrogation: Boolean(endorsements?.waiverOfSubrogation),
    },
    brokerName: json.brokerName ? String(json.brokerName) : undefined,
    brokerContact: json.brokerContact ? String(json.brokerContact) : undefined,
    additionalInsuredParties: Array.isArray(json.additionalInsuredParties)
      ? json.additionalInsuredParties.map(String)
      : [],
    fieldConfidence: fieldConfidence || generateDefaultConfidence(),
  }
}

function convertCoverage(coverage: unknown): CoverageDetail {
  const cov = coverage as Record<string, unknown>
  return {
    limit: Number(cov.limit) || 0,
    excess: Number(cov.excess) || 0,
    currency: String(cov.currency || 'AUD'),
  }
}

function convertWorkersCompCoverage(coverage: unknown): WorkersCompCoverage {
  const cov = coverage as Record<string, unknown>
  return {
    limit: Number(cov.limit) || 0,
    excess: Number(cov.excess) || 0,
    currency: String(cov.currency || 'AUD'),
    state: String(cov.state || ''),
  }
}

function generateDefaultConfidence(): Record<string, number> {
  return {
    insuredName: 0.5,
    insuredABN: 0.5,
    insuredAddress: 0.5,
    insurerName: 0.5,
    insurerABN: 0.5,
    policyNumber: 0.5,
    startDate: 0.5,
    endDate: 0.5,
    publicLiability: 0.5,
    productsLiability: 0.5,
    workersCompensation: 0.5,
    professionalIndemnity: 0.5,
    contractWorks: 0.5,
    motorVehicle: 0.5,
    cyberLiability: 0.5,
    principalIndemnity: 0.5,
    crossLiability: 0.5,
    waiverOfSubrogation: 0.5,
    brokerName: 0.5,
    brokerContact: 0.5,
  }
}

function calculateOverallConfidence(fieldConfidence: Record<string, number>): number {
  const values = Object.values(fieldConfidence)
  if (values.length === 0) return 0.5
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

// ============================================================================
// Conversion Functions for API Routes
// ============================================================================

/**
 * Convert ExtractedCOCData to the format expected by existing verification logic
 */
export function convertToLegacyFormat(
  data: ExtractedCOCData,
  subcontractor: { name: string; abn: string }
): Record<string, unknown> {
  const coverages = []

  if (data.coverages.publicLiability) {
    coverages.push({
      type: 'public_liability',
      limit: data.coverages.publicLiability.limit,
      limit_type: 'per_occurrence',
      excess: data.coverages.publicLiability.excess,
      principal_indemnity: data.endorsements.principalIndemnity,
      cross_liability: data.endorsements.crossLiability,
      waiver_of_subrogation: data.endorsements.waiverOfSubrogation,
      principal_naming_type: data.endorsements.principalIndemnity ? 'principal_named' : null
    })
  }

  if (data.coverages.productsLiability) {
    coverages.push({
      type: 'products_liability',
      limit: data.coverages.productsLiability.limit,
      limit_type: 'aggregate',
      excess: data.coverages.productsLiability.excess,
      principal_indemnity: data.endorsements.principalIndemnity,
      cross_liability: data.endorsements.crossLiability,
      waiver_of_subrogation: data.endorsements.waiverOfSubrogation,
      principal_naming_type: data.endorsements.principalIndemnity ? 'principal_named' : null
    })
  }

  if (data.coverages.workersCompensation) {
    coverages.push({
      type: 'workers_comp',
      limit: data.coverages.workersCompensation.limit,
      limit_type: 'statutory',
      excess: data.coverages.workersCompensation.excess,
      state: data.coverages.workersCompensation.state,
      employer_indemnity: true,
      waiver_of_subrogation: data.endorsements.waiverOfSubrogation
    })
  }

  if (data.coverages.professionalIndemnity) {
    coverages.push({
      type: 'professional_indemnity',
      limit: data.coverages.professionalIndemnity.limit,
      limit_type: 'per_claim',
      excess: data.coverages.professionalIndemnity.excess,
      retroactive_date: '2020-01-01',
      waiver_of_subrogation: data.endorsements.waiverOfSubrogation
    })
  }

  if (data.coverages.motorVehicle) {
    coverages.push({
      type: 'motor_vehicle',
      limit: data.coverages.motorVehicle.limit,
      limit_type: 'per_occurrence',
      excess: data.coverages.motorVehicle.excess
    })
  }

  if (data.coverages.contractWorks) {
    coverages.push({
      type: 'contract_works',
      limit: data.coverages.contractWorks.limit,
      limit_type: 'per_project',
      excess: data.coverages.contractWorks.excess
    })
  }

  if (data.coverages.cyberLiability) {
    coverages.push({
      type: 'cyber_liability',
      limit: data.coverages.cyberLiability.limit,
      limit_type: 'aggregate',
      excess: data.coverages.cyberLiability.excess
    })
  }

  return {
    insured_party_name: data.insuredName || subcontractor.name,
    insured_party_abn: data.insuredABN || subcontractor.abn,
    insured_party_address: data.insuredAddress || 'Address not extracted',
    insurer_name: data.insurerName,
    insurer_abn: data.insurerABN,
    policy_number: data.policyNumber,
    period_of_insurance_start: data.startDate,
    period_of_insurance_end: data.endDate,
    coverages,
    broker_name: data.brokerName || 'Not specified',
    broker_contact: data.brokerContact || 'Not specified',
    broker_phone: '',
    broker_email: '',
    currency: 'AUD',
    territory: 'Australia and New Zealand',
    extraction_timestamp: new Date().toISOString(),
    extraction_model: GEMINI_MODEL,
    extraction_confidence: calculateOverallConfidence(data.fieldConfidence),
    field_confidences: data.fieldConfidence
  }
}

// ============================================================================
// Test Toggle Functions
// ============================================================================

/**
 * Determine if fraud detection should be skipped based on filename and query params
 * @param filename - The uploaded file's name
 * @param searchParams - URL search params from the request
 * @returns true if fraud detection should be skipped
 */
export function shouldSkipFraudDetection(filename: string, searchParams?: URLSearchParams): boolean {
  // Query param takes precedence
  if (searchParams?.has('skip_fraud')) {
    return searchParams.get('skip_fraud') === 'true'
  }

  // Then check filename patterns
  if (filename.includes('_TEST_SKIP_FRAUD_')) return true
  if (filename.includes('_TEST_FRAUD_')) return false

  // Default: run fraud detection
  return false
}
