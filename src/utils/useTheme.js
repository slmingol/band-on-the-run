import { useState, useEffect } from 'react'

const THEME_KEY = 'band_on_the_run_theme'

// Get system preference
const getSystemTheme = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

// Get effective theme based on preference
const getEffectiveTheme = (preference) => {
  if (preference === 'system') {
    return getSystemTheme()
  }
  return preference
}

export const useTheme = () => {
  const [themePreference, setThemePreference] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY)
    return stored || 'system'
  })

  const [effectiveTheme, setEffectiveTheme] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY) || 'system'
    return getEffectiveTheme(stored)
  })

  useEffect(() => {
    // Save preference
    localStorage.setItem(THEME_KEY, themePreference)
    
    // Update effective theme
    const newEffectiveTheme = getEffectiveTheme(themePreference)
    setEffectiveTheme(newEffectiveTheme)
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newEffectiveTheme)
  }, [themePreference])

  useEffect(() => {
    // Listen for system theme changes when using 'system' preference
    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = (e) => {
        const newTheme = e.matches ? 'dark' : 'light'
        setEffectiveTheme(newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
      }
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [themePreference])

  return {
    themePreference,
    effectiveTheme,
    setTheme: setThemePreference
  }
}
