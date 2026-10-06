import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/i18n/useTranslation'
import { useSessionStore } from '@/state/sessionStore'
import type { LanguageCode } from '@/types'
import { syncSessionLanguage } from '@/services/api/sessionApi'
import { AppShell } from '@/components/layout/AppShell'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { LanguageCard } from '@/components/language/LanguageCard'
import { en } from '@/i18n/locales/en'
import { ml } from '@/i18n/locales/ml'

export function LanguagePage() {
  const navigate = useNavigate()
  const sessionId = useSessionStore((state) => state.sessionId)
  const storedLanguage = useSessionStore((state) => state.language)
  const setLanguage = useSessionStore((state) => state.setLanguage)
  const [selected, setSelected] = useState<LanguageCode | null>(storedLanguage)
  // Supporting copy and the button follow the highlighted option, so the choice is confirmed before saving.
  const { t, language } = useTranslation(selected)

  const handleContinue = () => {
    if (!selected) return
    setLanguage(selected)
    if (sessionId) {
      syncSessionLanguage(sessionId, selected).catch(() => console.warn('Language sync failed'))
    }
    navigate('/contact')
  }

  return (
    <AppShell
      title={t('language.title')}
      step={1}
      onBack={() => navigate('/welcome')}
      footer={
        <PrimaryButton lang={language} onClick={handleContinue} disabled={!selected}>
          {t('language.continue')}
        </PrimaryButton>
      }
    >
      <div className="mb-6">
        <h1 id="language-heading" className="text-display font-bold text-ink-900">
          <span lang="en" className="block">
            {en.language.title}
          </span>
          <span lang="ml" className="mt-1 block text-[1.375rem] leading-normal font-semibold text-ink-700">
            {ml.language.title}
          </span>
        </h1>
        <p lang={language} className="mt-3 text-body text-pretty text-ink-600">
          {t('language.subtitle')}
        </p>
      </div>

      <div role="radiogroup" aria-labelledby="language-heading" className="flex flex-col gap-3">
        <LanguageCard
          name="language"
          value="en"
          lang="en"
          primaryLabel={en.language.englishNative}
          secondaryLabel={en.language.english}
          selected={selected === 'en'}
          onSelect={() => setSelected('en')}
        />
        <LanguageCard
          name="language"
          value="ml"
          lang="ml"
          primaryLabel={ml.language.malayalamNative}
          secondaryLabel={en.language.malayalam}
          selected={selected === 'ml'}
          onSelect={() => setSelected('ml')}
        />
      </div>
    </AppShell>
  )
}
