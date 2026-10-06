import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ChevronDown, Users } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useSessionStore } from '@/state/sessionStore'
import { isValidPhoneNumber } from '@/utils/phone'
import { RELATION_OPTIONS } from '@/utils/relationMeta'
import { cn } from '@/utils/cn'
import type { RelationToPatient } from '@/types'
import { syncContactInfo } from '@/services/api/sessionApi'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton } from '@/components/common/PrimaryButton'

export function ContactInfoPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sessionId = useSessionStore((state) => state.sessionId)
  const language = useSessionStore((state) => state.language)
  const storedPhone = useSessionStore((state) => state.contactPhone)
  const storedRelation = useSessionStore((state) => state.contactRelation)
  const setContactInfo = useSessionStore((state) => state.setContactInfo)

  const [phone, setPhone] = useState(storedPhone ?? '')
  const [relation, setRelation] = useState<RelationToPatient | null>(storedRelation)
  const [touched, setTouched] = useState(false)

  if (!language) {
    return <Navigate to="/language" replace />
  }

  const phoneValid = isValidPhoneNumber(phone)
  const canContinue = phoneValid && relation !== null

  const handleContinue = () => {
    setTouched(true)
    if (!canContinue || !relation) return
    setContactInfo(phone.trim(), relation)
    if (sessionId) {
      syncContactInfo(sessionId, phone.trim(), relation).catch(() => console.warn('Contact info sync failed'))
    }
    navigate('/documents')
  }

  return (
    <AppShell
      title={t('contact.title')}
      step={2}
      onBack={() => navigate('/language')}
      footer={
        <PrimaryButton onClick={handleContinue} disabled={!canContinue}>
          {t('contact.continueButton')}
        </PrimaryButton>
      }
    >
      <PageHeader title={t('contact.title')} description={t('contact.subtitle')} />

      <div className="flex flex-col gap-6">
        <div>
          <label htmlFor="contact-phone" className="mb-2 block text-small font-semibold text-ink-800">
            {t('contact.phoneLabel')}
          </label>
          <input
            id="contact-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={t('contact.phonePlaceholder')}
            aria-invalid={touched && !phoneValid ? true : undefined}
            aria-describedby={touched && !phoneValid ? 'contact-phone-error' : 'contact-phone-hint'}
            className="min-h-14 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-body text-ink-900 outline-none focus:border-primary-700 focus:ring-2 focus:ring-primary-200"
          />
          {touched && !phoneValid ? (
            <p id="contact-phone-error" className="mt-2 text-small text-error-600">
              {t('contact.phoneInvalid')}
            </p>
          ) : (
            <p id="contact-phone-hint" className="mt-2 text-small text-ink-600">
              {t('contact.phoneHint')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contact-relation" className="mb-2 block text-small font-semibold text-ink-800">
            {t('contact.relationLabel')}
          </label>
          <p id="contact-relation-hint" className="mb-3 text-small text-ink-600">
            {t('contact.relationHint')}
          </p>
          <div className="relative">
            <span
              className="pointer-events-none absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg bg-primary-50 text-primary-700"
              aria-hidden="true"
            >
              <Users className="size-5" />
            </span>
            <select
              id="contact-relation"
              value={relation ?? ''}
              onChange={(event) => setRelation(event.target.value as RelationToPatient)}
              aria-describedby="contact-relation-hint"
              className={cn(
                'min-h-14 w-full cursor-pointer appearance-none rounded-xl border border-ink-200 bg-white py-3 pr-11 pl-16 text-body outline-none transition-colors duration-150 hover:border-ink-300 focus:border-primary-700 focus:ring-2 focus:ring-primary-200',
                relation ? 'font-semibold text-ink-900' : 'text-ink-500',
              )}
            >
              <option value="" disabled>
                {t('contact.relationPlaceholder')}
              </option>
              {RELATION_OPTIONS.map((option) => (
                <option key={option.id} value={option.id} className="text-ink-900">
                  {t(option.titleKey)}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-500"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
