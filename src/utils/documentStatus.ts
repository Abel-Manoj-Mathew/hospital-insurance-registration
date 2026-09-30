import type { LucideIcon } from 'lucide-react'
import { Check, Circle, Info, Loader2, RotateCcw } from 'lucide-react'
import type { StatusTone } from '@/components/common/StatusBadge'
import type { DocumentStatus } from '@/types'

export interface DocumentStatusDisplay {
  tone: StatusTone
  icon: LucideIcon
  labelKey: string
  spin?: boolean
}

export const DOCUMENT_STATUS_DISPLAY: Record<DocumentStatus, DocumentStatusDisplay> = {
  not_uploaded: { tone: 'neutral', icon: Circle, labelKey: 'documents.status.notAdded' },
  processing: { tone: 'info', icon: Loader2, labelKey: 'documents.status.processing', spin: true },
  accepted: { tone: 'success', icon: Check, labelKey: 'documents.status.received' },
  review_required: { tone: 'warning', icon: Info, labelKey: 'documents.status.review' },
  retake_required: { tone: 'error', icon: RotateCcw, labelKey: 'documents.status.retake' },
  failed: { tone: 'error', icon: RotateCcw, labelKey: 'documents.status.failed' },
}
