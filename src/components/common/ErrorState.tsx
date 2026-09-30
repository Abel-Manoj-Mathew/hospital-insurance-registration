import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { TriangleAlert } from 'lucide-react'

interface ErrorStateProps {
  icon?: LucideIcon
  title: string
  body: string
  actions?: ReactNode
}

/** Inline problem panel for a section of a screen (e.g. the camera area). */
export function ErrorState({ icon: Icon = TriangleAlert, title, body, actions }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-ink-150 bg-white px-5 py-8 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-ink-100">
        <Icon className="size-6 text-ink-700" aria-hidden="true" />
      </div>
      <h2 className="text-title font-semibold text-ink-900">{title}</h2>
      <p className="mt-2 max-w-sm text-small text-ink-600">{body}</p>
      {actions && <div className="mt-6 flex w-full max-w-sm flex-col gap-3">{actions}</div>}
    </div>
  )
}
