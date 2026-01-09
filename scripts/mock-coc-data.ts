/**
 * Mock COC Data Generator
 *
 * Generates realistic Australian Certificate of Currency data for testing.
 * Uses actual APRA licensed insurers, valid ABN formats, and realistic coverage values.
 */

// APRA Licensed Australian Insurers with policy number patterns
export const AUSTRALIAN_INSURERS = [
  { name: 'QBE Insurance (Australia) Limited', abn: '28008770864', policyPrefix: 'QBE', pattern: (n: number) => `QBEAU${String(n).padStart(8, '0')}` },
  { name: 'Allianz Australia Insurance Limited', abn: '15000122850', policyPrefix: 'ALZ', pattern: (n: number) => `ALZ${String(n).padStart(10, '0')}` },
  { name: 'CGU Insurance Limited', abn: '27004478371', policyPrefix: 'CGU', pattern: (n: number) => `CGU${String(n).padStart(9, '0')}` },
  { name: 'Suncorp Group Limited', abn: '66145290124', policyPrefix: 'SUN', pattern: (n: number) => `SUN${String(n).padStart(9, '0')}` },
  { name: 'Zurich Australian Insurance Limited', abn: '13000296640', policyPrefix: 'ZUR', pattern: (n: number) => `ZURA${String(n).padStart(8, '0')}` },
  { name: 'Vero Insurance Limited', abn: '48005297807', policyPrefix: 'VER', pattern: (n: number) => `VER${String(n).padStart(9, '0')}` },
  { name: 'AIG Australia Limited', abn: '93004727753', policyPrefix: 'AIG', pattern: (n: number) => `AIG${String(n).padStart(10, '0')}` },
  { name: 'Chubb Insurance Australia Limited', abn: '23001642020', policyPrefix: 'CHB', pattern: (n: number) => `CHB${String(n).padStart(10, '0')}` },
]

// Australian states for workers comp
export const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'] as const

// Company name generators
const PREFIXES = [
  'Alpha', 'Beta', 'Delta', 'Gamma', 'Omega', 'Premier', 'Elite', 'Pro',
  'Master', 'Pacific', 'Metro', 'City', 'National', 'Regional', 'Central',
  'Eastern', 'Western', 'Northern', 'Southern', 'Coastal', 'Highland', 'Valley',
  'Summit', 'Peak', 'River', 'Lake', 'Ocean', 'Mountain', 'Forest', 'Plains',
  'Apex', 'Crown', 'Phoenix', 'Atlas', 'Titan', 'Nova', 'Stellar', 'Prime',
  'Global', 'United', 'Pacific', 'Sydney', 'Melbourne', 'Brisbane', 'Perth'
]

const SUFFIXES = [
  'Construction', 'Builders', 'Contractors', 'Services', 'Solutions',
  'Electrical', 'Plumbing', 'HVAC', 'Roofing', 'Painting', 'Carpentry',
  'Steel', 'Concrete', 'Landscaping', 'Demolition', 'Excavation',
  'Engineering', 'Maintenance', 'Installations', 'Projects', 'Group',
  'Industries', 'Developments', 'Infrastructure', 'Fabrication', 'Welding'
]

const STREET_NAMES = [
  'Main', 'High', 'George', 'King', 'Queen', 'Victoria', 'Elizabeth',
  'William', 'Edward', 'Albert', 'Bridge', 'Market', 'Church', 'Park',
  'Station', 'Railway', 'Commercial', 'Industrial', 'Enterprise', 'Innovation'
]

const STREET_TYPES = ['Street', 'Road', 'Avenue', 'Drive', 'Boulevard', 'Way', 'Place', 'Lane']

const SUBURBS: Record<string, { suburbs: string[], postcodeRange: [number, number] }> = {
  NSW: { suburbs: ['Sydney', 'Parramatta', 'Chatswood', 'Blacktown', 'Liverpool', 'Penrith', 'Newcastle', 'Wollongong'], postcodeRange: [2000, 2999] },
  VIC: { suburbs: ['Melbourne', 'Richmond', 'South Yarra', 'Footscray', 'Geelong', 'Ballarat', 'Bendigo', 'Dandenong'], postcodeRange: [3000, 3999] },
  QLD: { suburbs: ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Cairns', 'Townsville', 'Toowoomba', 'Ipswich', 'Mackay'], postcodeRange: [4000, 4999] },
  WA: { suburbs: ['Perth', 'Fremantle', 'Joondalup', 'Mandurah', 'Bunbury', 'Geraldton', 'Rockingham', 'Armadale'], postcodeRange: [6000, 6999] },
  SA: { suburbs: ['Adelaide', 'Glenelg', 'Mount Barker', 'Murray Bridge', 'Port Augusta', 'Whyalla', 'Port Lincoln'], postcodeRange: [5000, 5999] },
  TAS: { suburbs: ['Hobart', 'Launceston', 'Devonport', 'Burnie', 'Kingston', 'Glenorchy', 'Clarence'], postcodeRange: [7000, 7999] },
  NT: { suburbs: ['Darwin', 'Alice Springs', 'Katherine', 'Palmerston', 'Tennant Creek'], postcodeRange: [800, 899] },
  ACT: { suburbs: ['Canberra', 'Belconnen', 'Woden', 'Tuggeranong', 'Gungahlin', 'Fyshwick'], postcodeRange: [2600, 2699] },
}

const BROKER_NAMES = [
  'Austbrokers', 'Steadfast', 'Insurance House', 'AON Risk Solutions', 'Marsh',
  'Gallagher', 'Willis Towers Watson', 'JLT', 'Lockton', 'Honan Insurance',
  'PSC Insurance', 'Insurance Advisors', 'National Insurance Brokers', 'BJS Insurance',
  'Coverforce', 'Insurance Partners', 'Strategic Insurance', 'Allied Risk'
]

const CONTACT_FIRST_NAMES = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Jessica', 'James', 'Amanda', 'Robert', 'Michelle', 'Andrew', 'Nicole', 'Peter', 'Kate', 'Mark', 'Lisa']
const CONTACT_LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson']

// Utility functions
function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Generate a valid Australian Business Number (ABN)
 * ABN validation: subtract 1 from first digit, apply weights, sum % 89 === 0
 */
export function generateValidABN(): string {
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

  // Generate 10 random digits (positions 2-11)
  const digits = Array.from({ length: 10 }, () => randomInt(0, 9))

  // Calculate what first digit needs to be
  // Sum = (d1 - 1) * 10 + sum of rest
  // Need sum % 89 === 0
  const restSum = digits.reduce((sum, d, i) => sum + d * weights[i + 1], 0)

  // Find first digit that makes sum % 89 === 0
  for (let firstDigit = 1; firstDigit <= 9; firstDigit++) {
    const totalSum = (firstDigit - 1) * 10 + restSum
    if (totalSum % 89 === 0) {
      return [firstDigit, ...digits].join('')
    }
  }

  // Fallback - use a known valid ABN pattern
  return '51824753556'
}

/**
 * Format ABN for display (XX XXX XXX XXX)
 */
export function formatABN(abn: string): string {
  return `${abn.slice(0, 2)} ${abn.slice(2, 5)} ${abn.slice(5, 8)} ${abn.slice(8, 11)}`
}

export interface MockCOCData {
  // Document metadata
  documentId: number
  fileFormat: 'pdf' | 'png' | 'jpg'

  // Insured party
  insuredName: string
  insuredABN: string
  insuredAddress: string

  // Insurer
  insurerName: string
  insurerABN: string

  // Policy details
  policyNumber: string
  startDate: string
  endDate: string

  // Coverages
  coverages: {
    publicLiability?: { limit: number; excess: number }
    productsLiability?: { limit: number; excess: number }
    workersCompensation?: { limit: number; excess: number; state: string }
    professionalIndemnity?: { limit: number; excess: number }
    contractWorks?: { limit: number; excess: number }
    motorVehicle?: { limit: number; excess: number }
  }

  // Endorsements
  endorsements: {
    principalIndemnity: boolean
    crossLiability: boolean
    waiverOfSubrogation: boolean
  }

  // Broker
  brokerName: string
  brokerContact: string
  brokerPhone: string
  brokerEmail: string

  // State for address/workers comp
  state: typeof AUSTRALIAN_STATES[number]
}

export interface GenerationOptions {
  count: number
  formatDistribution?: { pdf: number; png: number; jpg: number }  // percentages
  includeFailures?: boolean  // Include some expired/invalid documents
  failureRate?: number  // 0-1, percentage of documents that should have issues
}

/**
 * Generate a single mock COC document data
 */
export function generateMockCOC(index: number, format: 'pdf' | 'png' | 'jpg' = 'pdf'): MockCOCData {
  const state = randomElement(AUSTRALIAN_STATES)
  const insurer = randomElement(AUSTRALIAN_INSURERS)
  const stateData = SUBURBS[state]

  // Generate company name
  const prefix = PREFIXES[index % PREFIXES.length]
  const suffix = SUFFIXES[Math.floor(index / PREFIXES.length) % SUFFIXES.length]
  const insuredName = `${prefix} ${suffix} Pty Ltd`

  // Generate address
  const streetNum = randomInt(1, 500)
  const streetName = randomElement(STREET_NAMES)
  const streetType = randomElement(STREET_TYPES)
  const suburb = randomElement(stateData.suburbs)
  const postcode = randomInt(stateData.postcodeRange[0], stateData.postcodeRange[1])
  const insuredAddress = `${streetNum} ${streetName} ${streetType}, ${suburb} ${state} ${postcode}`

  // Generate dates (policy valid for 12 months, starting within last 6 months)
  const now = new Date()
  const startOffset = randomInt(-180, 30) // Started anywhere from 6 months ago to 1 month in future
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() + startOffset)
  const endDate = new Date(startDate)
  endDate.setFullYear(endDate.getFullYear() + 1)

  // Generate broker info
  const brokerName = `${randomElement(BROKER_NAMES)} Pty Ltd`
  const brokerFirstName = randomElement(CONTACT_FIRST_NAMES)
  const brokerLastName = randomElement(CONTACT_LAST_NAMES)
  const brokerContact = `${brokerFirstName} ${brokerLastName}`
  const brokerPhone = `0${randomInt(2, 4)} ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`
  const brokerEmail = `${brokerFirstName.toLowerCase()}.${brokerLastName.toLowerCase()}@${brokerName.toLowerCase().replace(/\s+/g, '').replace('ptyltd', '')}.com.au`

  // Generate coverages (vary by company type)
  const isElectrical = suffix.includes('Electrical')
  const isConstruction = suffix.includes('Construction') || suffix.includes('Builders')
  const isProfessional = suffix.includes('Engineering') || suffix.includes('Services')

  // Public liability - always included
  const publicLiabilityLimit = randomElement([5000000, 10000000, 20000000])
  const publicLiabilityExcess = randomElement([500, 1000, 2500, 5000])

  // Products liability - usually included
  const hasProductsLiability = Math.random() > 0.1
  const productsLiabilityLimit = hasProductsLiability ? publicLiabilityLimit : undefined
  const productsLiabilityExcess = hasProductsLiability ? publicLiabilityExcess : undefined

  // Workers comp - usually included
  const hasWorkersComp = Math.random() > 0.15
  const workersCompLimit = hasWorkersComp ? randomElement([1000000, 2000000, 5000000]) : undefined

  // Professional indemnity - for engineering/services
  const hasProfIndemnity = isProfessional || Math.random() > 0.7
  const profIndemnityLimit = hasProfIndemnity ? randomElement([1000000, 2000000, 5000000]) : undefined
  const profIndemnityExcess = hasProfIndemnity ? randomElement([5000, 10000, 25000]) : undefined

  // Contract works - for construction
  const hasContractWorks = isConstruction || Math.random() > 0.6
  const contractWorksLimit = hasContractWorks ? randomElement([500000, 1000000, 2000000, 5000000]) : undefined
  const contractWorksExcess = hasContractWorks ? randomElement([1000, 2500, 5000]) : undefined

  // Motor vehicle - sometimes
  const hasMotorVehicle = Math.random() > 0.7
  const motorVehicleLimit = hasMotorVehicle ? randomElement([1000000, 2000000]) : undefined
  const motorVehicleExcess = hasMotorVehicle ? randomElement([500, 1000, 2000]) : undefined

  // Endorsements - usually all for construction
  const principalIndemnity = isConstruction || Math.random() > 0.3
  const crossLiability = isConstruction || Math.random() > 0.4
  const waiverOfSubrogation = isConstruction || Math.random() > 0.5

  return {
    documentId: index + 1,
    fileFormat: format,
    insuredName,
    insuredABN: generateValidABN(),
    insuredAddress,
    insurerName: insurer.name,
    insurerABN: insurer.abn,
    policyNumber: insurer.pattern(100000 + index),
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    coverages: {
      publicLiability: { limit: publicLiabilityLimit, excess: publicLiabilityExcess },
      ...(productsLiabilityLimit && { productsLiability: { limit: productsLiabilityLimit, excess: productsLiabilityExcess! } }),
      ...(workersCompLimit && { workersCompensation: { limit: workersCompLimit, excess: 0, state } }),
      ...(profIndemnityLimit && { professionalIndemnity: { limit: profIndemnityLimit, excess: profIndemnityExcess! } }),
      ...(contractWorksLimit && { contractWorks: { limit: contractWorksLimit, excess: contractWorksExcess! } }),
      ...(motorVehicleLimit && { motorVehicle: { limit: motorVehicleLimit, excess: motorVehicleExcess! } }),
    },
    endorsements: {
      principalIndemnity,
      crossLiability,
      waiverOfSubrogation,
    },
    brokerName,
    brokerContact,
    brokerPhone,
    brokerEmail,
    state,
  }
}

/**
 * Generate mock COC with intentional issues (for testing failure scenarios)
 */
export function generateFailingMockCOC(index: number, format: 'pdf' | 'png' | 'jpg' = 'pdf'): MockCOCData {
  const base = generateMockCOC(index, format)

  // Randomly apply one of several failure scenarios
  const failureType = randomInt(1, 5)

  switch (failureType) {
    case 1:
      // Expired policy
      const expiredEnd = new Date()
      expiredEnd.setMonth(expiredEnd.getMonth() - randomInt(1, 6))
      const expiredStart = new Date(expiredEnd)
      expiredStart.setFullYear(expiredStart.getFullYear() - 1)
      base.startDate = expiredStart.toISOString().split('T')[0]
      base.endDate = expiredEnd.toISOString().split('T')[0]
      break
    case 2:
      // Very low coverage
      base.coverages.publicLiability = { limit: 100000, excess: 50000 }
      break
    case 3:
      // Missing workers comp
      delete base.coverages.workersCompensation
      break
    case 4:
      // No principal indemnity
      base.endorsements.principalIndemnity = false
      base.endorsements.crossLiability = false
      break
    case 5:
      // Policy expires very soon (within 7 days)
      const soonEnd = new Date()
      soonEnd.setDate(soonEnd.getDate() + randomInt(1, 7))
      const soonStart = new Date(soonEnd)
      soonStart.setFullYear(soonStart.getFullYear() - 1)
      base.startDate = soonStart.toISOString().split('T')[0]
      base.endDate = soonEnd.toISOString().split('T')[0]
      break
  }

  return base
}

/**
 * Generate a batch of mock COC data
 */
export function generateMockCOCBatch(options: GenerationOptions): MockCOCData[] {
  const {
    count,
    formatDistribution = { pdf: 60, png: 25, jpg: 15 },
    includeFailures = true,
    failureRate = 0.1,
  } = options

  const results: MockCOCData[] = []

  // Calculate format counts
  const pdfCount = Math.floor(count * formatDistribution.pdf / 100)
  const pngCount = Math.floor(count * formatDistribution.png / 100)
  const jpgCount = count - pdfCount - pngCount

  let formatIndex = 0
  const formats: ('pdf' | 'png' | 'jpg')[] = [
    ...Array(pdfCount).fill('pdf'),
    ...Array(pngCount).fill('png'),
    ...Array(jpgCount).fill('jpg'),
  ]

  // Shuffle formats
  for (let i = formats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[formats[i], formats[j]] = [formats[j], formats[i]]
  }

  for (let i = 0; i < count; i++) {
    const format = formats[i]
    const shouldFail = includeFailures && Math.random() < failureRate

    if (shouldFail) {
      results.push(generateFailingMockCOC(i, format))
    } else {
      results.push(generateMockCOC(i, format))
    }
  }

  return results
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
