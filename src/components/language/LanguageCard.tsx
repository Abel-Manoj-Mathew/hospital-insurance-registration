import { cn } from '@/utils/cn'

interface LanguageCardProps {
  value: string
  name: string
  primaryLabel: string
  secondaryLabel: string
  lang: string
  selected: boolean
  onSelect: () => void
}

/** Large radio option. Uses a native radio so arrow keys and screen readers behave as expected. */
export function LanguageCard({ value, name, primaryLabel, secondaryLabel, lang, selected, onSelect }: LanguageCardProps) {
  return (
    <label
      className={cn(
        'flex min-h-[5.5rem] cursor-pointer items-center gap-4 rounded-2xl border bg-white px-5 py-4 transition-[border-color,background-color,box-shadow] duration-150',
        'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-500',
        selected
          ? 'border-primary-700 bg-primary-50 shadow-[inset_0_0_0_1px_var(--color-primary-700)]'
          : 'border-ink-200 hover:border-ink-300',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span lang={lang} className="text-title font-semibold text-ink-900">
          {primaryLabel}
        </span>
        {secondaryLabel !== primaryLabel && <span className="text-small text-ink-600">{secondaryLabel}</span>}
      </span>
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected ? 'border-primary-700' : 'border-ink-300 bg-white',
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            'size-3 rounded-full bg-primary-700 transition-transform duration-150',
            selected ? 'scale-100' : 'scale-0',
          )}
        />
      </span>
    </label>
  )
}
