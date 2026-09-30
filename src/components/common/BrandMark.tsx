import { cn } from '@/utils/cn'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7 shrink-0', className)} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--color-primary-700)" />
      <path fill="#fff" d="M13.5 8h5v5.5H24v5h-5.5V24h-5v-5.5H8v-5h5.5z" />
    </svg>
  )
}
