import { Check } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'

export type ProgressStep = 1 | 2 | 3 | 4

const STEP_KEYS = ['progress.language', 'progress.documents', 'progress.preferences', 'progress.review'] as const

interface ProgressIndicatorProps {
  currentStep: ProgressStep
}

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  const { t } = useTranslation()
  const total = STEP_KEYS.length

  return (
    <nav aria-label={t('progress.ariaLabel')} className="mb-6 sm:mb-8">
      <p className="text-meta font-medium text-ink-600" aria-hidden="true">
        {t('progress.stepLabel', { current: currentStep, total })}
      </p>
      <ol className="mt-2 grid grid-cols-4 gap-1.5 sm:gap-2">
        {STEP_KEYS.map((key, index) => {
          const step = index + 1
          const isComplete = step < currentStep
          const isCurrent = step === currentStep
          const label = t(key)
          return (
            <li key={key} aria-current={isCurrent ? 'step' : undefined} className="min-w-0">
              <span
                className={cn(
                  'block h-1 rounded-full transition-colors duration-300',
                  isComplete || isCurrent ? 'bg-primary-700' : 'bg-ink-200',
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'mt-2 hidden items-center gap-1 truncate text-meta sm:flex',
                  isCurrent ? 'font-semibold text-ink-900' : 'text-ink-600',
                )}
                aria-hidden="true"
              >
                {isComplete && <Check className="size-3.5 shrink-0 text-primary-700" strokeWidth={3} />}
                <span className="truncate">{label}</span>
              </span>
              <span className="sr-only">
                {t('progress.stepLabel', { current: step, total })}: {label}
                {isComplete ? `, ${t('progress.completed')}` : ''}
                {isCurrent ? `, ${t('progress.current')}` : ''}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
