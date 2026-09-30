import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { cn } from '@/utils/cn'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  align?: 'start' | 'center'
  /** Move focus to the heading on mount so screen readers announce the new screen. */
  focusOnMount?: boolean
  className?: string
}

export function PageHeader({ title, description, align = 'start', focusOnMount = true, className }: PageHeaderProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus({ preventScroll: true })
  }, [focusOnMount, title])

  return (
    <div className={cn('mb-6', align === 'center' && 'text-center', className)}>
      <h1 ref={headingRef} tabIndex={-1} className="text-display font-bold text-balance text-ink-900">
        {title}
      </h1>
      {description && (
        <p className={cn('mt-2 text-body text-pretty text-ink-600', align === 'center' && 'mx-auto max-w-sm')}>
          {description}
        </p>
      )}
    </div>
  )
}
