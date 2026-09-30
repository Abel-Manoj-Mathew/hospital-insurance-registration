import { useNavigate } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { AppShell } from '@/components/layout/AppShell'
import { ResultState } from '@/components/common/ResultState'
import { PrimaryButton } from '@/components/common/PrimaryButton'

export function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <AppShell
      title={t('errors.notFound.title')}
      footer={<PrimaryButton onClick={() => navigate('/welcome')}>{t('errors.notFound.cta')}</PrimaryButton>}
      centered
    >
      <ResultState
        tone="neutral"
        icon={FileQuestion}
        title={t('errors.notFound.title')}
        body={t('errors.notFound.body')}
      />
    </AppShell>
  )
}
