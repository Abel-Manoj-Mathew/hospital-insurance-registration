import { ChevronLeft } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { BrandMark } from '@/components/common/BrandMark'

interface AppHeaderProps {
  onBack?: () => void
  backLabel?: string
  backDisabled?: boolean
}

export function AppHeader({ onBack, backLabel, backDisabled = false }: AppHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-30 border-b border-ink-150 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-xl items-center gap-1 px-2 sm:px-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={backDisabled}
            aria-label={backLabel ?? t('common.back')}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-800 transition-colors hover:bg-ink-100 active:bg-ink-150 disabled:text-ink-300 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
        )}
        <div className={onBack ? 'flex min-w-0 items-center gap-2.5' : 'flex min-w-0 items-center gap-2.5 pl-2'}>
          <BrandMark className="size-6" />
          <span className="truncate text-small font-semibold text-ink-900">{t('app.name')}</span>
        </div>
      </div>
    </header>
  )
}
