import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PrimaryButton } from './PrimaryButton'
import { SecondaryButton } from './SecondaryButton'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  tone?: 'primary' | 'danger'
}

export function ConfirmationDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'primary',
}: ConfirmationDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 px-4 pb-6 backdrop-blur-[1px] sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirmation-dialog-title" className="text-lg font-bold text-ink-900">
          {title}
        </h2>
        <div className="mt-2 text-[15px] leading-relaxed text-ink-700">{body}</div>
        <div className="mt-6 flex flex-col gap-3">
          <PrimaryButton tone={tone} onClick={onConfirm}>
            {confirmLabel}
          </PrimaryButton>
          <SecondaryButton onClick={onCancel}>{cancelLabel}</SecondaryButton>
        </div>
      </div>
    </div>,
    document.body,
  )
}
