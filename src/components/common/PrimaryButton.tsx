import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  loading?: boolean
  fullWidth?: boolean
  tone?: 'primary' | 'danger'
}

export function PrimaryButton({
  children,
  loading = false,
  fullWidth = true,
  tone = 'primary',
  disabled,
  className,
  ...rest
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex min-h-14 items-center justify-center gap-2.5 rounded-xl px-6 py-3 text-center text-body leading-snug font-semibold transition-[background-color,transform] duration-150',
        fullWidth && 'w-full',
        loading
          ? 'cursor-progress bg-primary-800 text-white'
          : disabled
            ? 'cursor-not-allowed bg-ink-150 text-ink-500'
            : tone === 'danger'
              ? 'bg-error-600 text-white hover:bg-error-700 active:scale-[0.985]'
              : 'bg-primary-700 text-white hover:bg-primary-800 active:scale-[0.985] active:bg-primary-900',
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
