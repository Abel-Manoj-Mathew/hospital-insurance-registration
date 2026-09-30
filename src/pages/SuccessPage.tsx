import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from '@/i18n/useTranslation'
import { useSessionStore } from '@/state/sessionStore'
import { AppShell } from '@/components/layout/AppShell'
import { ResultState } from '@/components/common/ResultState'
import { SecondaryButton } from '@/components/common/SecondaryButton'

export function SuccessPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const submissionStatus = useSessionStore((state) => state.submissionStatus)
  const submissionResult = useSessionStore((state) => state.submissionResult)
  const resetSession = useSessionStore((state) => state.resetSession)
  const startOrResumeSession = useSessionStore((state) => state.startOrResumeSession)

  if (submissionStatus !== 'submitted' || !submissionResult) {
    return <Navigate to="/welcome" replace />
  }

  const handleBackToStart = () => {
    resetSession()
    startOrResumeSession()
    navigate('/welcome')
  }

  return (
    <AppShell
      title={t('success.title')}
      footer={<SecondaryButton onClick={handleBackToStart}>{t('success.backToStart')}</SecondaryButton>}
      centered
    >
      <ResultState tone="success" title={t('success.title')} body={t('success.subtitle')}>
        {submissionResult.referenceId && (
          <div className="mt-8 w-full rounded-2xl border border-ink-150 bg-white px-5 py-5">
            <p className="text-small text-ink-600">{t('success.referenceLabel')}</p>
            <p className="tabular mt-1 text-[2rem] leading-tight font-bold tracking-wide text-ink-900 select-all">
              {submissionResult.referenceId}
            </p>
            <p className="mt-2 text-small text-ink-600">{t('success.referenceHint')}</p>
          </div>
        )}

        <div className="mt-4 w-full rounded-2xl bg-ink-100 px-5 py-4 text-left">
          <h2 className="text-body font-semibold text-ink-900">{t('success.nextStepsTitle')}</h2>
          <p className="mt-1 text-small text-ink-700">{t('success.nextStepsBody')}</p>
        </div>
      </ResultState>
    </AppShell>
  )
}
