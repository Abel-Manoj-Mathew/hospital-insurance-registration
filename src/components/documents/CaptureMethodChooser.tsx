import type { LucideIcon } from 'lucide-react'
import { Camera, ChevronRight, FileUp } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import type { CaptureMethod } from '@/types'

interface CaptureMethodChooserProps {
  onChoose: (method: CaptureMethod) => void
}

export function CaptureMethodChooser({ onChoose }: CaptureMethodChooserProps) {
  const { t } = useTranslation()

  const options: { method: CaptureMethod; icon: LucideIcon; title: string; hint: string }[] = [
    { method: 'camera', icon: Camera, title: t('capture.cameraOption'), hint: t('capture.cameraOptionHint') },
    { method: 'upload', icon: FileUp, title: t('capture.fileOption'), hint: t('capture.fileOptionHint') },
  ]

  return (
    <section aria-labelledby="chooser-heading">
      <h2 id="chooser-heading" className="mb-3 text-title font-semibold text-ink-900">
        {t('capture.chooseTitle')}
      </h2>
      <div className="flex flex-col gap-3">
        {options.map(({ method, icon: Icon, title, hint }) => (
          <button
            key={method}
            type="button"
            onClick={() => onChoose(method)}
            className="flex min-h-20 w-full items-center gap-4 rounded-2xl border border-ink-200 bg-white px-4 py-4 text-left transition-[background-color,border-color,transform] duration-150 hover:border-ink-300 hover:bg-ink-50 active:scale-[0.99] sm:px-5"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-body font-semibold text-ink-900">{title}</span>
              <span className="text-small text-ink-600">{hint}</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink-400" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}
