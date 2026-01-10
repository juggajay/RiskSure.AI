import { useState, useEffect } from 'react'

/**
 * Returns a debounced version of the value that only updates
 * after the specified delay has passed without changes.
 *
 * Useful for search inputs to avoid API calls on every keystroke.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const [query, setQuery] = useState('')
 * const debouncedQuery = useDebouncedValue(query, 300)
 *
 * // debouncedQuery only updates 300ms after the last change to query
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
