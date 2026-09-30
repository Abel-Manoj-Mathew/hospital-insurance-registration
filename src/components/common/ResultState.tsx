import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, Info, RotateCcw, TriangleAlert } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ResultTone = 'success' | 'warning' | 'error' | 'neutral'

const TONES: Record<ResultTone, { icon: LucideIcon; ring: string; iconClass: string }> = {
  success: { icon: Check, ring: 'bg-success-50', iconClass: 'text-success-600' },
  warning: { icon: Info, ring: 'bg-warning-50', iconClass: 'text-warning-600' },
  error: { icon: RotateCcw, ring: 'bg-error-50', iconClass: 'text-error-600' },
  neutral: { icon: TriangleAlert, ring: 'bg-ink-100', iconClass: 'text-ink-600' },
}

interface ResultStateProps {
  tone: ResultTone
  title: string
  body?: ReactNode
  icon?: LucideIcon
  /** Primary and secondary actions, stacked full width. */
  actions?: ReactNode
  children?: ReactNode
}

/** Centred outcome screen. The heading takes focus so the result is announced. */
export function ResultState({ tone, title, body, icon, actions, children }: ResultStateProps) {
  const config = TONES[tone]
  const Icon = icon ?? config.icon
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [title])

  return (
    <div className="flex flex-col items-center text-center">
      <div className={cn('mb-6 flex size-16 animate-pop items-center justify-center rounded-full', config.ring)}>
        <Icon className={cn('size-8', config.iconClass)} strokeWidth={2.25} aria-hidden="true" />
      </div>
      <h1 ref={headingRef} tabIndex={-1} className="text-display font-bold text-balance text-ink-900">
        {title}
      </h1>
      {body && <p className="mt-3 max-w-sm text-body text-pretty text-ink-600">{body}</p>}
      {children}
      {actions && <div className="mt-8 flex w-full max-w-sm flex-col gap-3">{actions}</div>}
    </div>
  )
}
