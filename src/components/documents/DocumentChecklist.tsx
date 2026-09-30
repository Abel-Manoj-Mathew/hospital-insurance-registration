import { OPTIONAL_DOCUMENTS, REQUIRED_DOCUMENTS, type DocumentMeta } from '@/utils/documentMeta'
import { isDocumentSatisfied } from '@/utils/workflow'
import { useSessionStore } from '@/state/sessionStore'
import { useTranslation } from '@/i18n/useTranslation'
import type { CaptureMethod, DocumentTypeId } from '@/types'
import { DocumentCard } from './DocumentCard'

interface DocumentChecklistProps {
  /** `method` undefined lets the capture screen ask how the person wants to add it. */
  onOpenDocument: (documentType: DocumentTypeId, method?: CaptureMethod) => void
}

export function DocumentChecklist({ onOpenDocument }: DocumentChecklistProps) {
  const { t } = useTranslation()
  const documents = useSessionStore((state) => state.documents)
  const requiredDone = REQUIRED_DOCUMENTS.filter((doc) => isDocumentSatisfied(documents[doc.id])).length

  const renderCard = (meta: DocumentMeta) => {
    const record = documents[meta.id]
    return (
      <DocumentCard
        key={meta.id}
        meta={meta}
        record={record}
        onAdd={() => onOpenDocument(meta.id)}
        onRetake={() => onOpenDocument(meta.id, record.captureMethod ?? 'camera')}
        onReplace={() => onOpenDocument(meta.id)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-9">
      <section aria-labelledby="required-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="required-heading" className="text-title font-semibold text-ink-900">
            {t('documents.requiredGroup')}
          </h2>
          <p className="tabular shrink-0 text-small text-ink-600" aria-live="polite">
            {t('documents.requiredCount', { done: requiredDone, total: REQUIRED_DOCUMENTS.length })}
          </p>
        </div>
        <ul className="flex flex-col gap-3">{REQUIRED_DOCUMENTS.map(renderCard)}</ul>
      </section>

      <section aria-labelledby="optional-heading">
        <div className="mb-3">
          <h2 id="optional-heading" className="text-title font-semibold text-ink-900">
            {t('documents.optionalGroup')}
          </h2>
          <p className="mt-0.5 text-small text-ink-600">{t('documents.optionalHint')}</p>
        </div>
        <ul className="flex flex-col gap-3">{OPTIONAL_DOCUMENTS.map(renderCard)}</ul>
      </section>
    </div>
  )
}
