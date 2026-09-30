import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'
import { AppHeader } from './AppHeader'
import { BottomActionBar } from './BottomActionBar'
import { ProgressIndicator, type ProgressStep } from './ProgressIndicator'

interface AppShellProps {
  /** Used for the browser tab title. */
  title: string
  step?: ProgressStep
  onBack?: () => void
  backDisabled?: boolean
  footer?: ReactNode
  /** Vertically centre short status screens (processing, success). */
  centered?: boolean
  children: ReactNode
}

export function AppShell({ title, step, onBack, backDisabled, footer, centered = false, children }: AppShellProps) {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${title} – ${t('app.name')}`
  }, [title, t])

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader onBack={onBack} backDisabled={backDisabled} />
      <div className={cn('flex flex-1 flex-col', centered && 'sm:justify-center sm:pb-[8vh]')}>
        <main
          className={cn(
            'mx-auto flex w-full max-w-xl flex-1 animate-enter flex-col px-4 pt-5 pb-10 sm:flex-none sm:px-6 sm:pt-10',
            centered && 'justify-center',
          )}
        >
          {step && <ProgressIndicator currentStep={step} />}
          {children}
        </main>
        {footer && <BottomActionBar>{footer}</BottomActionBar>}
      </div>
    </div>
  )
}
