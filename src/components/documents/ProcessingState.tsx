import { useEffect, useRef } from 'react'
import { FileText } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import type { CapturedFile } from '@/types'

interface ProcessingStateProps {
  file: CapturedFile
  progress?: number
}

/** Patient-facing view of document checking. Deliberately free of technical detail. */
export function ProcessingState({ file, progress = 0 }: ProcessingStateProps) {
  const { t } = useTranslation()
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const determinate = progress > 0
  const isPdf = file.mimeType === 'application/pdf'

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-8 h-36 w-28 overflow-hidden rounded-xl border border-ink-150 bg-white shadow-[0_1px_2px_rgb(22_34_47/0.06)]">
        {isPdf ? (
          <div className="flex size-full items-center justify-center bg-ink-100 text-ink-600">
            <FileText className="size-10" strokeWidth={1.5} aria-hidden="true" />
          </div>
        ) : (
          <img src={file.dataUrl} alt="" className="size-full object-cover opacity-80" />
        )}
        <span
          className="absolute inset-x-0 top-0 h-full animate-scan border-b-2 border-primary-500 bg-gradient-to-b from-transparent to-primary-500/10 motion-reduce:hidden"
          aria-hidden="true"
        />
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="text-display font-bold text-balance text-ink-900">
        {t('processing.title')}
      </h1>
      <p className="mt-3 max-w-sm text-body text-pretty text-ink-600">{t('processing.subtitle')}</p>

      <div
        className="mt-8 h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-ink-150"
        role="progressbar"
        aria-label={t('processing.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? progress : undefined}
      >
        {determinate ? (
          <div
            className="h-full rounded-full bg-primary-700 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(progress, 6)}%` }}
          />
        ) : (
          <div className="h-full w-2/5 animate-indeterminate rounded-full bg-primary-700" />
        )}
      </div>
    </div>
  )
}
