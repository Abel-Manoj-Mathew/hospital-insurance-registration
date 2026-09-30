import { useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useSessionStore } from '@/state/sessionStore'
import { requiredDocumentsSatisfied } from '@/utils/workflow'
import { DOCUMENT_CHECKLIST } from '@/utils/documentMeta'
import { BED_PREFERENCE_META_BY_ID } from '@/utils/bedPreferenceMeta'
import { submitIntake } from '@/services/api/submissionApi'
import { ApiError } from '@/services/api/httpClient'
import type { ExtractedField } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { TextButton } from '@/components/common/TextButton'
import { Notice } from '@/components/common/Notice'
import { ReviewSection } from '@/components/review/ReviewSection'
import { ReviewDocumentCard } from '@/components/review/ReviewDocumentCard'

type SubmitError = 'incomplete' | 'network'

export function ReviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const sessionId = useSessionStore((state) => state.sessionId)
  const language = useSessionStore((state) => state.language)
  const documents = useSessionStore((state) => state.documents)
  const bedPreferences = useSessionStore((state) => state.bedPreferences)
  const bedPreferencesConfirmed = useSessionStore((state) => state.bedPreferencesConfirmed)
  const submissionStatus = useSessionStore((state) => state.submissionStatus)
  const setSubmissionStatus = useSessionStore((state) => state.setSubmissionStatus)
  const setSubmissionResult = useSessionStore((state) => state.setSubmissionResult)

  const [submitError, setSubmitError] = useState<SubmitError | null>(null)
  // Local, not persisted: a 'submitting' status restored after a reload has no request behind it and
  // must not lock the button. The server returns the existing reference for a repeat submit.
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inFlightRef = useRef(false)

  const patientFields = useMemo(() => {
    const seen = new Set<string>()
    const fields: ExtractedField[] = []
    DOCUMENT_CHECKLIST.forEach((meta) => {
      documents[meta.id]?.extractedFields?.forEach((field) => {
        if (!seen.has(field.labelKey)) {
          seen.add(field.labelKey)
          fields.push(field)
        }
      })
    })
    return fields
  }, [documents])

  const orderedBedPreferences = useMemo(
    () => [...bedPreferences].sort((a, b) => a.rank - b.rank),
    [bedPreferences],
  )

  if (!language) return <Navigate to="/language" replace />
  if (!requiredDocumentsSatisfied(documents)) return <Navigate to="/documents" replace />
  if (!bedPreferencesConfirmed) return <Navigate to="/preferences" replace />
  if (submissionStatus === 'submitted') return <Navigate to="/success" replace />

  const handleSubmit = async () => {
    if (!sessionId || inFlightRef.current) return
    inFlightRef.current = true
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmissionStatus('submitting')
    try {
      const result = await submitIntake(sessionId)
      setSubmissionResult(result)
      navigate('/success')
    } catch (error) {
      setSubmissionStatus('failed')
      setSubmitError(error instanceof ApiError && error.status === 422 ? 'incomplete' : 'network')
    } finally {
      inFlightRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell
      title={t('review.title')}
      step={4}
      onBack={() => navigate('/preferences')}
      backDisabled={isSubmitting}
      footer={
        <>
          {submitError && (
            <Notice tone="error" role="alert" title={t('review.errorTitle')}>
              {t(submitError === 'incomplete' ? 'review.incompleteBody' : 'review.networkBody')}
            </Notice>
          )}
          <p id="submit-confirmation" className="text-center text-small text-ink-600">
            {t('review.confirmNote')}
          </p>
          <PrimaryButton onClick={handleSubmit} loading={isSubmitting} aria-describedby="submit-confirmation">
            {isSubmitting ? t('review.submittingButton') : submitError ? t('review.retryButton') : t('review.submitButton')}
          </PrimaryButton>
        </>
      }
    >
      <PageHeader title={t('review.title')} description={t('review.subtitle')} />

      <div className="flex flex-col gap-4">
        <ReviewSection id="review-documents" title={t('review.documentsSection')}>
          <ul className="divide-y divide-ink-150">
            {DOCUMENT_CHECKLIST.map((meta) => (
              <ReviewDocumentCard
                key={meta.id}
                meta={meta}
                record={documents[meta.id]}
                disabled={isSubmitting}
                onReplace={() => navigate(`/documents/${meta.id}`)}
                onAdd={() => navigate(`/documents/${meta.id}`)}
              />
            ))}
          </ul>
        </ReviewSection>

        <ReviewSection
          id="review-details"
          title={t('review.detailsSection')}
          description={patientFields.length > 0 ? t('review.detailsHint') : undefined}
        >
          {patientFields.length === 0 ? (
            <p className="text-small text-ink-600">{t('review.noDetails')}</p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {patientFields.map((field) => (
                <div key={field.labelKey} className="min-w-0">
                  <dt className="text-small text-ink-600">{t(field.labelKey)}</dt>
                  <dd className="tabular text-body font-semibold break-words text-ink-900">{field.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </ReviewSection>

        <ReviewSection
          id="review-preferences"
          title={t('review.preferencesSection')}
          action={
            <TextButton
              onClick={() => navigate('/preferences')}
              disabled={isSubmitting}
              aria-label={`${t('review.edit')}: ${t('review.preferencesSection')}`}
            >
              {t('review.edit')}
            </TextButton>
          }
        >
          <ol className="flex flex-col gap-2.5">
            {orderedBedPreferences.map((pref) => (
              <li key={pref.id} className="flex items-baseline gap-3">
                <span className="tabular w-5 shrink-0 text-title font-bold text-primary-700" aria-hidden="true">
                  {pref.rank}
                </span>
                <span className="text-body text-ink-900">
                  <span className="sr-only">{t('bedPreference.rankLabel', { rank: pref.rank })}: </span>
                  {t(BED_PREFERENCE_META_BY_ID[pref.id].titleKey)}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-small text-ink-600">{t('review.preferencesNote')}</p>
        </ReviewSection>

        <ReviewSection
          id="review-language"
          title={t('review.languageSection')}
          action={
            <TextButton
              onClick={() => navigate('/language')}
              disabled={isSubmitting}
              aria-label={`${t('review.change')}: ${t('review.languageSection')}`}
            >
              {t('review.change')}
            </TextButton>
          }
        >
          <p className="text-body text-ink-900">{language === 'en' ? 'English' : 'മലയാളം'}</p>
        </ReviewSection>

        <p className="mt-2 flex items-start gap-2.5 text-small text-ink-600">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ink-500" aria-hidden="true" />
          {t('review.secureNote')}
        </p>
      </div>
    </AppShell>
  )
}
