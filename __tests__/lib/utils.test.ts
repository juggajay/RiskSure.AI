import {
  cn,
  formatDate,
  formatCurrency,
  formatABN,
  isValidABN,
  daysUntil,
  getStatusColor,
  getStatusBadgeClasses,
  truncate,
  debounce,
  TimeoutError,
  isTimeoutError,
} from '@/lib/utils'

describe('cn (className utility)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
  })

  it('should handle undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })
})

describe('formatDate', () => {
  it('should format Date object correctly', () => {
    const date = new Date('2024-03-15')
    const result = formatDate(date)
    // Format: "15 Mar 2024" (en-AU format)
    expect(result).toMatch(/15\s+Mar\s+2024/)
  })

  it('should format date string correctly', () => {
    const result = formatDate('2024-12-25')
    expect(result).toMatch(/25\s+Dec\s+2024/)
  })

  it('should handle ISO date strings', () => {
    const result = formatDate('2024-01-01T12:00:00Z')
    expect(result).toMatch(/Jan\s+2024/)
  })
})

describe('formatCurrency', () => {
  it('should format currency in AUD', () => {
    const result = formatCurrency(1000)
    expect(result).toContain('$')
    expect(result).toContain('1,000') // or '1000' depending on locale
  })

  it('should format zero correctly', () => {
    const result = formatCurrency(0)
    expect(result).toContain('$')
    expect(result).toContain('0')
  })

  it('should format large numbers correctly', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain('1,000,000')
  })

  it('should format without decimal places', () => {
    const result = formatCurrency(1234.56)
    // minimumFractionDigits: 0, maximumFractionDigits: 0
    expect(result).not.toContain('.56')
  })
})

describe('formatABN', () => {
  it('should format valid ABN with spaces', () => {
    expect(formatABN('12345678901')).toBe('12 345 678 901')
  })

  it('should handle ABN with existing spaces', () => {
    expect(formatABN('12 345 678 901')).toBe('12 345 678 901')
  })

  it('should return original if not 11 digits', () => {
    expect(formatABN('1234567890')).toBe('1234567890')
    expect(formatABN('123456789012')).toBe('123456789012')
  })

  it('should handle empty string', () => {
    expect(formatABN('')).toBe('')
  })
})

describe('isValidABN', () => {
  it('should return true for valid 11-digit ABN', () => {
    expect(isValidABN('12345678901')).toBe(true)
  })

  it('should return true for ABN with spaces', () => {
    expect(isValidABN('12 345 678 901')).toBe(true)
  })

  it('should return false for short ABN', () => {
    expect(isValidABN('1234567890')).toBe(false)
  })

  it('should return false for long ABN', () => {
    expect(isValidABN('123456789012')).toBe(false)
  })

  it('should return false for non-numeric ABN', () => {
    expect(isValidABN('1234567890a')).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isValidABN('')).toBe(false)
  })
})

describe('daysUntil', () => {
  it('should calculate positive days for future date', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    const result = daysUntil(futureDate)
    expect(result).toBeGreaterThanOrEqual(4)
    expect(result).toBeLessThanOrEqual(6)
  })

  it('should calculate negative days for past date', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)
    const result = daysUntil(pastDate)
    expect(result).toBeLessThanOrEqual(-4)
    expect(result).toBeGreaterThanOrEqual(-6)
  })

  it('should handle date string input', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 10)
    const result = daysUntil(futureDate.toISOString())
    expect(result).toBeGreaterThanOrEqual(9)
    expect(result).toBeLessThanOrEqual(11)
  })
})

describe('getStatusColor', () => {
  it('should return success color for compliant', () => {
    expect(getStatusColor('compliant')).toBe('text-success')
    expect(getStatusColor('Compliant')).toBe('text-success')
    expect(getStatusColor('pass')).toBe('text-success')
  })

  it('should return error color for non_compliant', () => {
    expect(getStatusColor('non_compliant')).toBe('text-error')
    expect(getStatusColor('fail')).toBe('text-error')
  })

  it('should return warning color for exception', () => {
    expect(getStatusColor('exception')).toBe('text-warning')
    expect(getStatusColor('warning')).toBe('text-warning')
  })

  it('should return info color for pending', () => {
    expect(getStatusColor('pending')).toBe('text-info')
    expect(getStatusColor('review')).toBe('text-info')
  })

  it('should return default color for unknown status', () => {
    expect(getStatusColor('unknown')).toBe('text-slate-500')
  })
})

describe('getStatusBadgeClasses', () => {
  it('should return success classes for compliant', () => {
    const result = getStatusBadgeClasses('compliant')
    expect(result).toContain('bg-success-light')
    expect(result).toContain('text-success')
  })

  it('should return error classes for non_compliant', () => {
    const result = getStatusBadgeClasses('non_compliant')
    expect(result).toContain('bg-error-light')
    expect(result).toContain('text-error')
  })

  it('should return warning classes for exception', () => {
    const result = getStatusBadgeClasses('exception')
    expect(result).toContain('bg-warning-light')
    expect(result).toContain('text-warning')
  })

  it('should return info classes for pending', () => {
    const result = getStatusBadgeClasses('pending')
    expect(result).toContain('bg-info-light')
    expect(result).toContain('text-info')
  })

  it('should return default classes for unknown status', () => {
    const result = getStatusBadgeClasses('unknown')
    expect(result).toContain('bg-slate-100')
    expect(result).toContain('text-slate-500')
  })
})

describe('truncate', () => {
  it('should truncate text longer than limit', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
  })

  it('should not truncate text shorter than limit', () => {
    expect(truncate('Hello', 10)).toBe('Hello')
  })

  it('should not truncate text equal to limit', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })

  it('should handle empty string', () => {
    expect(truncate('', 5)).toBe('')
  })
})

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should debounce function calls', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 100)

    debouncedFn()
    debouncedFn()
    debouncedFn()

    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(100)

    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should pass arguments to debounced function', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 100)

    debouncedFn('arg1', 'arg2')
    jest.advanceTimersByTime(100)

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should reset timer on subsequent calls', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 100)

    debouncedFn()
    jest.advanceTimersByTime(50)
    debouncedFn()
    jest.advanceTimersByTime(50)

    expect(mockFn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(50)

    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})

describe('TimeoutError', () => {
  it('should create error with default message', () => {
    const error = new TimeoutError()
    expect(error.message).toBe('Request timed out')
    expect(error.name).toBe('TimeoutError')
  })

  it('should create error with custom message', () => {
    const error = new TimeoutError('Custom timeout message')
    expect(error.message).toBe('Custom timeout message')
    expect(error.name).toBe('TimeoutError')
  })

  it('should be instance of Error', () => {
    const error = new TimeoutError()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(TimeoutError)
  })
})

describe('isTimeoutError', () => {
  it('should return true for TimeoutError', () => {
    const error = new TimeoutError()
    expect(isTimeoutError(error)).toBe(true)
  })

  it('should return true for AbortError', () => {
    const error = new Error('Aborted')
    error.name = 'AbortError'
    expect(isTimeoutError(error)).toBe(true)
  })

  it('should return false for regular Error', () => {
    const error = new Error('Regular error')
    expect(isTimeoutError(error)).toBe(false)
  })

  it('should return false for non-Error values', () => {
    expect(isTimeoutError('string')).toBe(false)
    expect(isTimeoutError(null)).toBe(false)
    expect(isTimeoutError(undefined)).toBe(false)
    expect(isTimeoutError({})).toBe(false)
  })
})
