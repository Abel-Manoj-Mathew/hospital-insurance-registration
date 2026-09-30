import type { ChangeEvent, DragEvent } from 'react'
import { useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import type { CapturedFile } from '@/types'
import { cn } from '@/utils/cn'
import { Notice } from '@/components/common/Notice'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_BYTES = 10 * 1024 * 1024

interface UploadDropzoneProps {
  onFile: (file: CapturedFile) => void
}

export function UploadDropzone({ onFile }: UploadDropzoneProps) {
  const { t } = useTranslation()
  const [fileError, setFileError] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const readFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_BYTES) {
      setFileError(true)
      return
    }
    setFileError(false)
    const reader = new FileReader()
    reader.onload = () => {
      onFile({
        dataUrl: typeof reader.result === 'string' ? reader.result : '',
        sizeBytes: file.size,
        mimeType: file.type,
        captureMethod: 'upload',
        fileName: file.name,
      })
    }
    reader.onerror = () => setFileError(true)
    reader.readAsDataURL(file)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) readFile(file)
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) readFile(file)
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        aria-describedby={fileError ? 'upload-error' : 'upload-hint'}
        className={cn(
          'flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed bg-white px-6 py-10 text-center transition-colors',
          dragging ? 'border-primary-500 bg-primary-50' : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50',
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <FileUp className="size-7" aria-hidden="true" />
        </span>
        <span className="text-title font-semibold text-ink-900">{t('capture.dropzoneTitle')}</span>
        <span id="upload-hint" className="text-small text-ink-600">
          {t('capture.dropzoneHint')}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        tabIndex={-1}
        onChange={handleChange}
      />
      {fileError && (
        <Notice tone="error" role="alert" id="upload-error">
          {t('capture.unsupportedFile')}
        </Notice>
      )}
    </div>
  )
}
