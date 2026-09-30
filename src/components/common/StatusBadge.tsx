import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'text-ink-600',
  info: 'text-primary-700',
  success: 'text-success-700',
  warning: 'text-warning-700',
  error: 'text-error-600',
}

interface StatusBadgeProps {
  tone: StatusTone
  icon: LucideIcon
  label: string
  spin?: boolean
  className?: string
}

/** Icon + text status. Colour is never the only signal. */
export function StatusBadge({ tone, icon: Icon, label, spin = false, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-start gap-1.5 text-small font-medium', TONE_CLASSES[tone], className)}>
      <Icon
        className={cn('mt-[0.2em] size-4 shrink-0', spin && 'animate-spin')}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  )
}
