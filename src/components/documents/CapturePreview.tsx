import { FileText } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import type { CapturedFile } from '@/types'

interface CapturePreviewProps {
  file: CapturedFile
  documentLabel: string
}

export function CapturePreview({ file, documentLabel }: CapturePreviewProps) {
  const { t } = useTranslation()
  const isPdf = file.mimeType === 'application/pdf'

  return (
    <div className="animate-enter">
      <h2 className="text-title font-semibold text-ink-900">{t(isPdf ? 'capture.previewTitlePdf' : 'capture.previewTitle')}</h2>
      <p className="mt-1 text-small text-ink-600">{t('capture.previewInstruction')}</p>
      <figure className="mt-4 overflow-hidden rounded-2xl border border-ink-150 bg-ink-900">
        {isPdf ? (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 bg-ink-100 text-ink-700">
            <FileText className="size-12" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-body font-medium">{t('capture.pdfLabel')}</span>
          </div>
        ) : (
          <img
            src={file.dataUrl}
            alt={t('capture.previewAlt', { document: documentLabel })}
            className="mx-auto max-h-[58dvh] w-full object-contain"
          />
        )}
      </figure>
    </div>
  )
}
