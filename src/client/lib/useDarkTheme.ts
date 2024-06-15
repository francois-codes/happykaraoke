import { useEffect, useState } from 'react'

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.localStorage.theme
}

export const useDarkTheme = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme())

  useEffect(() => {
    if (theme === 'dark') {
      window.localStorage.setItem('theme', 'dark')
      document.documentElement.classList.add('dark')
    } else {
      window.localStorage.setItem('theme', 'light')
      document.documentElement.classList.remove('dark')
    }

    localStorage.theme = theme
  }, [theme])

  return {
    theme,
    toggleTheme: () => {
      const newValue = theme === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem('theme', newValue)
      setTheme(newValue)
    },
    removeLocalPreference: () => localStorage.removeItem('theme')
  }
}
