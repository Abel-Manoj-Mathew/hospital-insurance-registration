import { useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useSessionStore } from '@/state/sessionStore'
import { contactInfoComplete, requiredDocumentsSatisfied } from '@/utils/workflow'
import { DOCUMENT_CHECKLIST } from '@/utils/documentMeta'
import { BED_PREFERENCE_META_BY_ID } from '@/utils/bedPreferenceMeta'
import { RELATION_OPTIONS } from '@/utils/relationMeta'
import { submitIntake } from '@/services/api/submissionApi'
import { syncDocumentResult } from '@/services/api/sessionApi'
import { ApiError } from '@/services/api/httpClient'
import type { DocumentTypeId, ExtractedField } from '@/types'
import { cn } from '@/utils/cn'
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
  const contactPhone = useSessionStore((state) => state.contactPhone)
  const contactRelation = useSessionStore((state) => state.contactRelation)
  const documents = useSessionStore((state) => state.documents)
  const bedPreferences = useSessionStore((state) => state.bedPreferences)
  const bedPreferencesConfirmed = useSessionStore((state) => state.bedPreferencesConfirmed)
  const submissionStatus = useSessionStore((state) => state.submissionStatus)
  const setSubmissionStatus = useSessionStore((state) => state.setSubmissionStatus)
  const setSubmissionResult = useSessionStore((state) => state.setSubmissionResult)
  const setDocumentResult = useSessionStore((state) => state.setDocumentResult)

  const [submitError, setSubmitError] = useState<SubmitError | null>(null)
  // Local, not persisted: a 'submitting' status restored after a reload has no request behind it and
  // must not lock the button. The server returns the existing reference for a repeat submit.
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inFlightRef = useRef(false)

  const [editingDetails, setEditingDetails] = useState(false)
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})

  // Only the identity documents (aadhaar, insuranceCard) get a fixed field list so the
  // section stays visible — with blanks the patient can fill in — even when OCR found nothing.
  const detailDocuments = useMemo(
    () => DOCUMENT_CHECKLIST.filter((meta) => meta.reviewFieldKeys || (documents[meta.id]?.extractedFields?.length ?? 0) > 0),
    [documents],
  )

  const fieldKeysFor = (docId: DocumentTypeId): string[] => {
    const meta = DOCUMENT_CHECKLIST.find((item) => item.id === docId)
    return meta?.reviewFieldKeys ?? (documents[docId]?.extractedFields ?? []).map((field) => field.labelKey)
  }

  const valueFor = (docId: DocumentTypeId, labelKey: string): string =>
    documents[docId]?.extractedFields?.find((field) => field.labelKey === labelKey)?.value ?? ''

  const draftKey = (docId: DocumentTypeId, labelKey: string) => `${docId}:${labelKey}`

  const startEditingDetails = () => {
    const draft: Record<string, string> = {}
    detailDocuments.forEach((meta) => {
      fieldKeysFor(meta.id).forEach((labelKey) => {
        draft[draftKey(meta.id, labelKey)] = valueFor(meta.id, labelKey)
      })
    })
    setDraftValues(draft)
    setEditingDetails(true)
  }

  const cancelEditingDetails = () => setEditingDetails(false)

  const saveEditingDetails = () => {
    detailDocuments.forEach((meta) => {
      const updatedFields: ExtractedField[] = fieldKeysFor(meta.id)
        .map((labelKey) => ({ labelKey, value: (draftValues[draftKey(meta.id, labelKey)] ?? '').trim() }))
        .filter((field) => field.value.length > 0)
      setDocumentResult(meta.id, { extractedFields: updatedFields })
      if (sessionId) {
        const record = documents[meta.id]
        syncDocumentResult(sessionId, meta.id, {
          status: record.status,
          captureMethod: record.captureMethod,
          capturedAt: record.capturedAt,
          rejection: record.rejection,
          extractedFields: updatedFields,
          documentReference: record.documentReference,
        }).catch(() => console.warn('Document fields sync failed'))
      }
    })
    setEditingDetails(false)
  }

  const orderedBedPreferences = useMemo(
    () => [...bedPreferences].sort((a, b) => a.rank - b.rank),
    [bedPreferences],
  )

  if (!language) return <Navigate to="/language" replace />
  if (!contactInfoComplete({ contactPhone, contactRelation })) return <Navigate to="/contact" replace />
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
      step={5}
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
          description={detailDocuments.length > 0 ? t('review.detailsHint') : undefined}
          action={
            detailDocuments.length > 0 ? (
              editingDetails ? (
                <div className="-mr-3 flex items-center gap-1">
                  <TextButton onClick={cancelEditingDetails} disabled={isSubmitting}>
                    {t('review.cancel')}
                  </TextButton>
                  <TextButton onClick={saveEditingDetails} disabled={isSubmitting}>
                    {t('review.save')}
                  </TextButton>
                </div>
              ) : (
                <TextButton
                  onClick={startEditingDetails}
                  disabled={isSubmitting}
                  aria-label={`${t('review.edit')}: ${t('review.detailsSection')}`}
                >
                  {t('review.edit')}
                </TextButton>
              )
            ) : undefined
          }
        >
          {detailDocuments.length === 0 ? (
            <p className="text-small text-ink-600">{t('review.noDetails')}</p>
          ) : (
            <div className="flex flex-col gap-5">
              {detailDocuments.map((meta) => (
                <div key={meta.id}>
                  <p className="mb-2 text-small font-semibold text-ink-700">{t(meta.titleKey)}</p>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    {fieldKeysFor(meta.id).map((labelKey) => {
                      const value = valueFor(meta.id, labelKey)
                      return (
                        <div key={labelKey} className="min-w-0">
                          <dt className="text-small text-ink-600">{t(labelKey)}</dt>
                          {editingDetails ? (
                            <input
                              type="text"
                              value={draftValues[draftKey(meta.id, labelKey)] ?? ''}
                              onChange={(event) =>
                                setDraftValues((prev) => ({ ...prev, [draftKey(meta.id, labelKey)]: event.target.value }))
                              }
                              className="mt-1 min-h-11 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-body text-ink-900 outline-none focus:border-primary-700 focus:ring-2 focus:ring-primary-200"
                            />
                          ) : (
                            <dd
                              className={cn(
                                'tabular text-body break-words',
                                value ? 'font-semibold text-ink-900' : 'text-ink-500 italic',
                              )}
                            >
                              {value || t('review.notDetected')}
                            </dd>
                          )}
                        </div>
                      )
                    })}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </ReviewSection>

        <ReviewSection
          id="review-contact"
          title={t('review.contactSection')}
          action={
            <TextButton
              onClick={() => navigate('/contact')}
              disabled={isSubmitting}
              aria-label={`${t('review.edit')}: ${t('review.contactSection')}`}
            >
              {t('review.edit')}
            </TextButton>
          }
        >
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-small text-ink-600">{t('contact.phoneLabel')}</dt>
              <dd className="tabular text-body font-semibold break-words text-ink-900">{contactPhone}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-small text-ink-600">{t('contact.relationLabel')}</dt>
              <dd className="text-body font-semibold break-words text-ink-900">
                {contactRelation ? t(RELATION_OPTIONS.find((option) => option.id === contactRelation)!.titleKey) : ''}
              </dd>
            </div>
          </dl>
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
