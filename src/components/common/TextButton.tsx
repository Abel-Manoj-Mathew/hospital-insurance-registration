import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface TextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

/** Low-emphasis inline action (Replace, Edit, Change). Keeps a 44px touch target without visual bulk. */
export function TextButton({ children, className, disabled, ...rest }: TextButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-small font-semibold transition-colors',
        disabled ? 'cursor-not-allowed text-ink-400' : 'text-primary-700 hover:bg-primary-50 active:bg-primary-100',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
