import { useCallback } from 'react'
import { useSessionStore } from '@/state/sessionStore'
import type { LanguageCode } from '@/types'
import { en } from './locales/en'
import { ml } from './locales/ml'
import { interpolate, resolvePath } from './translate'

const DICTIONARIES: Record<LanguageCode, Record<string, unknown>> = { en, ml }

/** `languageOverride` previews another language before it is saved, e.g. on the language screen. */
export function useTranslation(languageOverride?: LanguageCode | null) {
  const storedLanguage = useSessionStore((state) => state.language)
  const language = languageOverride ?? storedLanguage ?? 'en'

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICTIONARIES[language]
      const value = resolvePath(dict, key) ?? resolvePath(en, key)
      if (typeof value !== 'string') return key
      return interpolate(value, vars)
    },
    [language],
  )

  return { t, language }
}
