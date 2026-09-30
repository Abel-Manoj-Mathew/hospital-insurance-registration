import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  fullWidth?: boolean
}

export function SecondaryButton({ children, fullWidth = true, disabled, className, ...rest }: SecondaryButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex min-h-14 items-center justify-center gap-2.5 rounded-xl border border-ink-200 bg-white px-6 py-3 text-center text-body leading-snug font-semibold transition-[background-color,border-color,transform] duration-150',
        fullWidth && 'w-full',
        disabled
          ? 'cursor-not-allowed text-ink-400'
          : 'text-ink-900 hover:border-ink-300 hover:bg-ink-50 active:scale-[0.985] active:bg-ink-100',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
