import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Circle, Clock, ShieldCheck } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useSessionStore } from '@/state/sessionStore'
import { getResumeTarget, hasSessionProgress, isDocumentSatisfied } from '@/utils/workflow'
import { REQUIRED_DOCUMENTS } from '@/utils/documentMeta'
import { registerSession } from '@/services/api/sessionApi'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { SecondaryButton } from '@/components/common/SecondaryButton'
import { cn } from '@/utils/cn'

export function WelcomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const startOrResumeSession = useSessionStore((state) => state.startOrResumeSession)
  const resetSession = useSessionStore((state) => state.resetSession)
  const sessionId = useSessionStore((state) => state.sessionId)
  const language = useSessionStore((state) => state.language)
  const documents = useSessionStore((state) => state.documents)
  const bedPreferencesConfirmed = useSessionStore((state) => state.bedPreferencesConfirmed)
  const submissionStatus = useSessionStore((state) => state.submissionStatus)

  useEffect(() => {
    startOrResumeSession()
  }, [startOrResumeSession])

  useEffect(() => {
    if (!sessionId) return
    registerSession(sessionId).catch(() => console.warn('Session registration failed'))
  }, [sessionId])

  const resuming =
    submissionStatus !== 'submitted' &&
    hasSessionProgress({ language, documents, bedPreferencesConfirmed, submissionStatus })

  const requiredAdded = REQUIRED_DOCUMENTS.filter((doc) => isDocumentSatisfied(documents[doc.id])).length

  const handleContinue = () => {
    navigate(getResumeTarget({ language, documents, bedPreferencesConfirmed, submissionStatus }))
  }

  const handleStartNew = () => {
    resetSession()
    startOrResumeSession()
    navigate('/language')
  }

  return (
    <AppShell
      title={resuming ? t('welcome.resumeTitle') : t('welcome.title')}
      footer={
        <>
          <PrimaryButton onClick={handleContinue}>
            {resuming ? t('welcome.continueSubmission') : t('welcome.getStarted')}
          </PrimaryButton>
          {resuming && <SecondaryButton onClick={handleStartNew}>{t('welcome.startNew')}</SecondaryButton>}
        </>
      }
    >
      {resuming ? (
        <>
          <PageHeader title={t('welcome.resumeTitle')} description={t('welcome.resumeBody')} />
          <section aria-labelledby="resume-heading" className="rounded-2xl border border-ink-150 bg-white px-5 pt-4 pb-1">
            <h2 id="resume-heading" className="text-title font-semibold text-ink-900">
              {t('welcome.progressTitle')}
            </h2>
            <ul className="mt-1 divide-y divide-ink-150">
              {[
                {
                  label: t('progress.language'),
                  done: Boolean(language),
                  value: language === 'ml' ? 'മലയാളം' : language === 'en' ? 'English' : t('welcome.stepNotYet'),
                },
                {
                  label: t('progress.documents'),
                  done: requiredAdded === REQUIRED_DOCUMENTS.length,
                  value: t('documents.requiredCount', { done: requiredAdded, total: REQUIRED_DOCUMENTS.length }),
                },
                {
                  label: t('progress.preferences'),
                  done: bedPreferencesConfirmed,
                  value: bedPreferencesConfirmed ? t('welcome.stepDone') : t('welcome.stepNotYet'),
                },
              ].map((row) => (
                <li key={row.label} className="flex items-center gap-3 py-3.5">
                  {row.done ? (
                    <Check className="size-5 shrink-0 text-success-600" strokeWidth={2.75} aria-hidden="true" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-ink-300" aria-hidden="true" />
                  )}
                  <span className="flex-1 text-body text-ink-900">{row.label}</span>
                  <span className={cn('text-right text-small', row.done ? 'text-ink-600' : 'text-ink-500')}>
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <>
          <PageHeader title={t('welcome.title')} description={t('welcome.subtitle')} />

          <section aria-labelledby="needs-heading" className="rounded-2xl border border-ink-150 bg-white p-5">
            <h2 id="needs-heading" className="text-title font-semibold text-ink-900">
              {t('welcome.needTitle')}
            </h2>
            <ul className="mt-4 flex flex-col gap-3.5">
              {REQUIRED_DOCUMENTS.map((doc) => {
                const Icon = doc.icon
                return (
                  <li key={doc.id} className="flex items-center gap-3 text-body text-ink-800">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    {t(doc.titleKey)}
                  </li>
                )
              })}
            </ul>
            <p className="mt-5 border-t border-ink-150 pt-4 text-small text-ink-600">{t('welcome.needOptional')}</p>
          </section>

          <p className="mt-5 flex items-center gap-2 text-small text-ink-600">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            {t('welcome.duration')}
          </p>
        </>
      )}

      <p className="mt-8 flex items-start gap-2.5 text-small text-ink-600">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ink-500" aria-hidden="true" />
        <span>{t('welcome.privacyNote')}</span>
      </p>
    </AppShell>
  )
}
