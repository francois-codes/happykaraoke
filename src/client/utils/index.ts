import { useEffect, useState } from 'react'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function makeArray(length: number) {
  return Array.from({ length }, (_, i) => i + 1)
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export const titleize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
