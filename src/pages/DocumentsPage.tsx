import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from '@/i18n/useTranslation'
import { useSessionStore } from '@/state/sessionStore'
import { requiredDocumentsSatisfied } from '@/utils/workflow'
import type { CaptureMethod, DocumentTypeId } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { DocumentChecklist } from '@/components/documents/DocumentChecklist'

export function DocumentsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const documents = useSessionStore((state) => state.documents)
  const language = useSessionStore((state) => state.language)

  if (!language) {
    return <Navigate to="/language" replace />
  }

  const isComplete = requiredDocumentsSatisfied(documents)

  const handleOpenDocument = (documentType: DocumentTypeId, method?: CaptureMethod) => {
    navigate(method ? `/documents/${documentType}?mode=${method}` : `/documents/${documentType}`)
  }

  return (
    <AppShell
      title={t('documents.title')}
      step={2}
      onBack={() => navigate('/language')}
      footer={
        <>
          {!isComplete && (
            <p id="documents-continue-hint" className="text-center text-small text-ink-600">
              {t('documents.requiredHint')}
            </p>
          )}
          <PrimaryButton
            disabled={!isComplete}
            aria-describedby={isComplete ? undefined : 'documents-continue-hint'}
            onClick={() => navigate('/preferences')}
          >
            {t('documents.continueButton')}
          </PrimaryButton>
        </>
      }
    >
      <PageHeader title={t('documents.title')} description={t('documents.subtitle')} />
      <DocumentChecklist onOpenDocument={handleOpenDocument} />
    </AppShell>
  )
}
