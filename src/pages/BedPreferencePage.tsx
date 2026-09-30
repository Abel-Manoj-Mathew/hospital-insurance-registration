import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from '@/i18n/useTranslation'
import { useSessionStore } from '@/state/sessionStore'
import { requiredDocumentsSatisfied } from '@/utils/workflow'
import { syncBedPreferences } from '@/services/api/sessionApi'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { Notice } from '@/components/common/Notice'
import { BedPreferenceList } from '@/components/bedPreference/BedPreferenceList'

export function BedPreferencePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sessionId = useSessionStore((state) => state.sessionId)
  const language = useSessionStore((state) => state.language)
  const documents = useSessionStore((state) => state.documents)
  const bedPreferences = useSessionStore((state) => state.bedPreferences)
  const confirmBedPreferences = useSessionStore((state) => state.confirmBedPreferences)
  const [searchParams] = useSearchParams()

  // Dev-only preview bypass — stripped from production builds since import.meta.env.DEV is false there.
  // Lets you open this screen directly via /preferences?dev=1 without completing prior steps.
  const devBypass = import.meta.env.DEV && searchParams.get('dev') === '1'

  if (!devBypass) {
    if (!language) return <Navigate to="/language" replace />
    if (!requiredDocumentsSatisfied(documents)) return <Navigate to="/documents" replace />
  }

  const handleContinue = () => {
    confirmBedPreferences()
    if (sessionId) {
      syncBedPreferences(sessionId, bedPreferences, true).catch(() => console.warn('Bed preference sync failed'))
    }
    navigate('/review')
  }

  return (
    <AppShell
      title={t('bedPreference.title')}
      step={3}
      onBack={() => navigate('/documents')}
      footer={<PrimaryButton onClick={handleContinue}>{t('bedPreference.continueButton')}</PrimaryButton>}
    >
      <PageHeader title={t('bedPreference.title')} description={t('bedPreference.subtitle')} />
      <BedPreferenceList />
      <Notice className="mt-6" title={t('bedPreference.disclaimerTitle')}>
        {t('bedPreference.disclaimer')}
      </Notice>
    </AppShell>
  )
}
