import type { ReactNode } from 'react'

interface ReviewSectionProps {
  id: string
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function ReviewSection({ id, title, description, action, children }: ReviewSectionProps) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-ink-150 bg-white px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
        <h2 id={id} className="text-title font-semibold text-ink-900">
          {title}
        </h2>
        {action && <div className="-mr-3">{action}</div>}
      </div>
      {description && <p className="-mt-1 mb-3 text-small text-ink-600">{description}</p>}
      {children}
    </section>
  )
}
