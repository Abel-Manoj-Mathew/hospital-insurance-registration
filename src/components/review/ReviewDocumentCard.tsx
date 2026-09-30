import { Minus } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import type { DocumentMeta } from '@/utils/documentMeta'
import { DOCUMENT_STATUS_DISPLAY } from '@/utils/documentStatus'
import { isDocumentSatisfied } from '@/utils/workflow'
import type { DocumentRecord } from '@/types'
import { cn } from '@/utils/cn'
import { TextButton } from '@/components/common/TextButton'

interface ReviewDocumentCardProps {
  meta: DocumentMeta
  record: DocumentRecord
  disabled?: boolean
  onReplace: () => void
  onAdd: () => void
}

const TILE_BY_TONE = {
  neutral: 'bg-ink-100 text-ink-500',
  info: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  error: 'bg-error-50 text-error-600',
} as const

const TEXT_BY_TONE = {
  neutral: 'text-ink-600',
  info: 'text-primary-700',
  success: 'text-success-700',
  warning: 'text-warning-700',
  error: 'text-error-600',
} as const

export function ReviewDocumentCard({ meta, record, disabled, onReplace, onAdd }: ReviewDocumentCardProps) {
  const { t } = useTranslation()
  const title = t(meta.titleKey)
  const isEmpty = record.status === 'not_uploaded'
  const provided = isDocumentSatisfied(record)
  const display = DOCUMENT_STATUS_DISPLAY[record.status]
  const Icon = isEmpty ? Minus : display.icon
  const statusLabel = isEmpty
    ? t(meta.requirement === 'optional' ? 'review.optionalNotAdded' : 'review.notAdded')
    : t(display.labelKey)
  const actionLabel = provided ? t('review.replace') : isEmpty ? t('review.add') : t('documents.retakeAction')

  return (
    <li className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
      <span
        className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TILE_BY_TONE[display.tone])}
        aria-hidden="true"
      >
        <Icon className={cn('size-5', display.spin && 'animate-spin')} strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body leading-snug font-medium text-ink-900">{title}</p>
        <p className={cn('text-small', TEXT_BY_TONE[display.tone])}>{statusLabel}</p>
      </div>
      <TextButton
        onClick={provided ? onReplace : onAdd}
        disabled={disabled}
        aria-label={`${actionLabel}: ${title}`}
        className="-mr-3"
      >
        {actionLabel}
      </TextButton>
    </li>
  )
}
