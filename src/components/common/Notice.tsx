import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/utils/cn'

type NoticeTone = 'info' | 'success' | 'warning' | 'error'

const TONES: Record<NoticeTone, { icon: LucideIcon; box: string; iconClass: string }> = {
  info: { icon: Info, box: 'bg-ink-100 text-ink-800', iconClass: 'text-ink-600' },
  success: { icon: CheckCircle2, box: 'bg-success-50 text-success-700', iconClass: 'text-success-600' },
  warning: { icon: TriangleAlert, box: 'bg-warning-50 text-warning-700', iconClass: 'text-warning-600' },
  error: { icon: AlertCircle, box: 'bg-error-50 text-error-700', iconClass: 'text-error-600' },
}

interface NoticeProps {
  tone?: NoticeTone
  title?: string
  children?: ReactNode
  icon?: LucideIcon
  role?: 'alert' | 'status'
  id?: string
  className?: string
}

export function Notice({ tone = 'info', title, children, icon, role, id, className }: NoticeProps) {
  const config = TONES[tone]
  const Icon = icon ?? config.icon
  return (
    <div id={id} role={role} className={cn('flex gap-3 rounded-xl px-4 py-3.5', config.box, className)}>
      <Icon className={cn('mt-0.5 size-5 shrink-0', config.iconClass)} aria-hidden="true" />
      <div className="min-w-0 text-small">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  )
}
