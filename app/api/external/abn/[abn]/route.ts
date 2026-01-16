import { NextRequest, NextResponse } from 'next/server'

// ABN validation helper - uses Australian checksum algorithm
function validateABNChecksum(abn: string): boolean {
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const digits = abn.split('').map(Number)
  digits[0] = digits[0] - 1 // Subtract 1 from first digit
  const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0)
  return sum % 89 === 0
}

// ABR API response interface
interface ABRBusinessEntity {
  entityName: string
  tradingName?: string
  entityType: string
  status: string
  address?: {
    street?: string
    suburb?: string
    state?: string
    postcode?: string
  }
  gstRegistered?: boolean
  acn?: string
}

// Call the real ABR (Australian Business Register) API
async function lookupABR(abn: string): Promise<ABRBusinessEntity | null> {
  const ABR_GUID = process.env.ABR_GUID

  // If no ABR GUID configured, use mock data
  if (!ABR_GUID) {
    return getMockABRData(abn)
  }

  try {
    // ABR provides an XML web service
    // Documentation: https://abr.business.gov.au/Documentation/WebServiceResponse
    const url = `https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/SearchByABNv202001?searchString=${abn}&includeHistoricalDetails=N&authenticationGuid=${ABR_GUID}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/xml',
      },
    })

    if (!response.ok) {
      console.error('ABR API error:', response.status)
      return getMockABRData(abn)
    }

    const xmlText = await response.text()

    // Parse the XML response
    const entity = parseABRXmlResponse(xmlText)
    return entity
  } catch (error) {
    console.error('ABR lookup error:', error)
    return getMockABRData(abn)
  }
}

// Parse ABR XML response
function parseABRXmlResponse(xml: string): ABRBusinessEntity | null {
  try {
    // Extract entity status
    const statusMatch = xml.match(/<entityStatusCode>([^<]+)<\/entityStatusCode>/)
    const status = statusMatch?.[1] || 'Unknown'

    // If cancelled/deregistered, still return the data but with inactive status
    const isActive = status === 'Active'

    // Extract main name (could be organisation name or individual name)
    let entityName = ''

    // Try organisation name first
    const orgNameMatch = xml.match(/<organisationName>([^<]+)<\/organisationName>/)
    if (orgNameMatch) {
      entityName = orgNameMatch[1]
    } else {
      // Try individual name components
      const familyNameMatch = xml.match(/<familyName>([^<]+)<\/familyName>/)
      const givenNameMatch = xml.match(/<givenName>([^<]+)<\/givenName>/)
      if (familyNameMatch) {
        entityName = givenNameMatch
          ? `${givenNameMatch[1]} ${familyNameMatch[1]}`
          : familyNameMatch[1]
      }
    }

    if (!entityName) {
      return null
    }

    // Extract trading/business name
    let tradingName: string | undefined
    const businessNameMatch = xml.match(/<mainBusinessPhysicalAddress>[\s\S]*?<organisationName>([^<]+)<\/organisationName>/)
    if (!businessNameMatch) {
      // Look for business name in different location
      const tradingNameMatch = xml.match(/<mainTradingName>([^<]+)<\/mainTradingName>/)
      if (tradingNameMatch) {
        tradingName = tradingNameMatch[1]
      }
    }

    // Extract entity type
    const entityTypeMatch = xml.match(/<entityTypeCode>([^<]+)<\/entityTypeCode>/)
    const entityTypeDescMatch = xml.match(/<entityDescription>([^<]+)<\/entityDescription>/)
    const entityType = entityTypeDescMatch?.[1] || entityTypeMatch?.[1] || 'Business'

    // Extract address
    const stateMatch = xml.match(/<mainBusinessPhysicalAddress>[\s\S]*?<stateCode>([^<]+)<\/stateCode>/)
    const postcodeMatch = xml.match(/<mainBusinessPhysicalAddress>[\s\S]*?<postcode>([^<]+)<\/postcode>/)

    // GST registration
    const gstMatch = xml.match(/<goodsAndServicesTax>[\s\S]*?<effectiveFrom>/)
    const gstRegistered = !!gstMatch

    // ACN if available
    const acnMatch = xml.match(/<ASICNumber>([^<]+)<\/ASICNumber>/)
    const acn = acnMatch?.[1]

    return {
      entityName: entityName.trim(),
      tradingName: tradingName?.trim(),
      entityType,
      status: isActive ? 'Active' : status,
      address: {
        state: stateMatch?.[1],
        postcode: postcodeMatch?.[1],
      },
      gstRegistered,
      acn,
    }
  } catch (error) {
    console.error('Error parsing ABR XML:', error)
    return null
  }
}

// Mock ABR data for development (when ABR_GUID is not configured)
function getMockABRData(abn: string): ABRBusinessEntity | null {
  const MOCK_DATA: Record<string, ABRBusinessEntity> = {
    '51824753556': {
      entityName: 'AUSTRALIAN BROADCASTING CORPORATION',
      entityType: 'Commonwealth Entity',
      status: 'Active',
      address: { state: 'NSW', postcode: '2000' },
      gstRegistered: true,
    },
    '33102417032': {
      entityName: 'TELSTRA GROUP LIMITED',
      tradingName: 'Telstra',
      entityType: 'Public Company',
      status: 'Active',
      address: { state: 'VIC', postcode: '3000' },
      gstRegistered: true,
      acn: '102417032',
    },
    '12345678901': {
      entityName: 'ABC ELECTRICAL PTY LTD',
      tradingName: 'ABC Electrical',
      entityType: 'Private Company',
      status: 'Active',
      address: { state: 'NSW', postcode: '2150' },
      gstRegistered: true,
    },
    '99887766554': {
      entityName: 'TEST PLUMBING SERVICES PTY LTD',
      tradingName: 'Test Plumbing',
      entityType: 'Private Company',
      status: 'Active',
      address: { state: 'VIC', postcode: '3000' },
      gstRegistered: true,
    },
    '11222333444': {
      entityName: 'TEST SUBCONTRACTOR PTY LTD',
      entityType: 'Private Company',
      status: 'Active',
      address: { state: 'QLD', postcode: '4000' },
      gstRegistered: false,
    },
    '74158818056': {
      entityName: 'RYOX CARPENTRY & BUILDING SOLUTIONS PTY LTD',
      tradingName: 'Ryox Carpentry',
      entityType: 'Private Company',
      status: 'Active',
      address: { state: 'NSW', postcode: '2170' },
      gstRegistered: true,
    },
    '53004085616': {
      entityName: 'COMMONWEALTH BANK OF AUSTRALIA',
      tradingName: 'CommBank',
      entityType: 'Public Company',
      status: 'Active',
      address: { state: 'NSW', postcode: '2000' },
      gstRegistered: true,
      acn: '004085616',
    },
    '88000014675': {
      entityName: 'WESTPAC BANKING CORPORATION',
      entityType: 'Public Company',
      status: 'Active',
      address: { state: 'NSW', postcode: '2000' },
      gstRegistered: true,
    },
  }

  return MOCK_DATA[abn] || null
}

// GET /api/external/abn/[abn] - Validate ABN and lookup entity details
export async function GET(
  request: NextRequest,
  { params }: { params: { abn: string } }
) {
  try {
    const abn = params.abn?.replace(/\s/g, '')

    if (!abn) {
      return NextResponse.json({ error: 'ABN is required' }, { status: 400 })
    }

    // Validate format (11 digits)
    if (!/^\d{11}$/.test(abn)) {
      return NextResponse.json({
        valid: false,
        error: 'ABN must be exactly 11 digits'
      }, { status: 400 })
    }

    // Validate checksum
    if (!validateABNChecksum(abn)) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid ABN checksum - please verify the ABN is correct'
      }, { status: 400 })
    }

    // Look up ABN in ABR
    const abrData = await lookupABR(abn)

    if (abrData) {
      return NextResponse.json({
        valid: true,
        abn: abn,
        entityName: abrData.entityName,
        tradingName: abrData.tradingName || null,
        status: abrData.status,
        entityType: abrData.entityType,
        address: abrData.address || null,
        gstRegistered: abrData.gstRegistered || false,
        acn: abrData.acn || null,
        source: process.env.ABR_GUID ? 'abr' : 'mock'
      })
    }

    // ABN format is valid but not found in lookup
    return NextResponse.json({
      valid: true,
      abn: abn,
      entityName: null,
      tradingName: null,
      status: 'Unknown',
      entityType: null,
      address: null,
      gstRegistered: false,
      acn: null,
      message: 'ABN format is valid but entity not found in lookup. Entity details not available.',
      source: process.env.ABR_GUID ? 'abr' : 'mock'
    })

  } catch (error) {
    console.error('ABN validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
