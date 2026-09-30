import { Check, Plus, RotateCcw } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import type { DocumentMeta } from '@/utils/documentMeta'
import { DOCUMENT_STATUS_DISPLAY } from '@/utils/documentStatus'
import type { DocumentRecord } from '@/types'
import { cn } from '@/utils/cn'
import { StatusBadge } from '@/components/common/StatusBadge'
import { TextButton } from '@/components/common/TextButton'

interface DocumentCardProps {
  meta: DocumentMeta
  record: DocumentRecord
  onAdd: () => void
  onRetake: () => void
  onReplace: () => void
}

export function DocumentCard({ meta, record, onAdd, onRetake, onReplace }: DocumentCardProps) {
  const { t } = useTranslation()
  const Icon = meta.icon
  const title = t(meta.titleKey)
  const status = DOCUMENT_STATUS_DISPLAY[record.status]
  const isEmpty = record.status === 'not_uploaded'
  const isSettled = record.status === 'accepted' || record.status === 'review_required'
  const needsRetry = record.status === 'retake_required' || record.status === 'failed'
  const titleId = `doc-${meta.id}-title`

  return (
    <li
      aria-labelledby={titleId}
      className={cn(
        'rounded-2xl border bg-white p-4 transition-colors sm:p-5',
        needsRetry ? 'border-error-100' : 'border-ink-150',
      )}
    >
      <div className="flex gap-3.5">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors',
            record.status === 'accepted' ? 'bg-success-50 text-success-600' : 'bg-ink-100 text-ink-700',
          )}
          aria-hidden="true"
        >
          {record.status === 'accepted' ? (
            <Check className="size-5 animate-pop" strokeWidth={2.75} />
          ) : (
            <Icon className="size-5" />
          )}
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <h3 id={titleId} className="text-body font-semibold text-ink-900">
            {title}
          </h3>

          {isEmpty ? (
            <p className="mt-0.5 text-small text-ink-600">{t(meta.descriptionKey)}</p>
          ) : (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
              <StatusBadge tone={status.tone} icon={status.icon} label={t(status.labelKey)} spin={status.spin} />
              {(isSettled || record.status === 'processing') && (
                <TextButton
                  onClick={isSettled ? onReplace : onRetake}
                  aria-label={`${t(isSettled ? 'documents.replaceAction' : 'documents.retakeAction')}: ${title}`}
                  className="-mr-3 ml-auto"
                >
                  {t(isSettled ? 'documents.replaceAction' : 'documents.retakeAction')}
                </TextButton>
              )}
            </div>
          )}
        </div>
      </div>

      {(isEmpty || needsRetry) && (
        <button
          type="button"
          onClick={isEmpty ? onAdd : onRetake}
          aria-label={`${t(isEmpty ? 'documents.addAction' : 'documents.retakeAction')}: ${title}`}
          className={cn(
            'mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-body font-semibold transition-[background-color,transform] duration-150 active:scale-[0.985]',
            needsRetry
              ? 'bg-primary-700 text-white hover:bg-primary-800'
              : 'border border-ink-200 bg-white text-primary-700 hover:border-ink-300 hover:bg-ink-50',
          )}
        >
          {isEmpty ? (
            <Plus className="size-5" aria-hidden="true" />
          ) : (
            <RotateCcw className="size-5" aria-hidden="true" />
          )}
          {t(isEmpty ? 'documents.addAction' : 'documents.retakeAction')}
        </button>
      )}
    </li>
  )
}
