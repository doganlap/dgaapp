import { createContext, useContext, useEffect, useState } from 'react'

const LocaleContext = createContext({ locale: 'ar', dir: 'rtl', toggleLocale: () => {} })

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem('locale') || 'ar')

  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('dir', dir)
    localStorage.setItem('locale', locale)
  }, [locale])

  const toggleLocale = () => setLocale(prev => (prev === 'ar' ? 'en' : 'ar'))

  const value = { locale, dir: locale === 'ar' ? 'rtl' : 'ltr', toggleLocale }
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  return useContext(LocaleContext)
}

