import { useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Camera, CameraOff, FileUp } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useSessionStore } from '@/state/sessionStore'
import { DOCUMENT_META_BY_ID } from '@/utils/documentMeta'
import type { CaptureMethod, CapturedFile, CapturedSideResult, DocumentTypeId } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { SecondaryButton } from '@/components/common/SecondaryButton'
import { TextButton } from '@/components/common/TextButton'
import { Notice } from '@/components/common/Notice'
import { ErrorState } from '@/components/common/ErrorState'
import { CaptureMethodChooser } from '@/components/documents/CaptureMethodChooser'
import { CameraCapture, type CameraCaptureHandle } from '@/components/documents/CameraCapture'
import { UploadDropzone } from '@/components/documents/UploadDropzone'
import { CapturePreview } from '@/components/documents/CapturePreview'

type Mode = 'choose' | CaptureMethod

function parseMode(value: string | null): Mode {
  return value === 'camera' || value === 'upload' ? value : 'choose'
}

export function DocumentCapturePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { documentType } = useParams<{ documentType: string }>()
  const [searchParams] = useSearchParams()
  const language = useSessionStore((state) => state.language)
  const record = useSessionStore((state) =>
    documentType && documentType in DOCUMENT_META_BY_ID ? state.documents[documentType as DocumentTypeId] : undefined,
  )

  const [mode, setMode] = useState<Mode>(() => parseMode(searchParams.get('mode')))
  const [captured, setCaptured] = useState<CapturedFile | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraFailed, setCameraFailed] = useState(false)
  const [cameraAttempt, setCameraAttempt] = useState(0)
  const cameraRef = useRef<CameraCaptureHandle | null>(null)

  if (!language) return <Navigate to="/language" replace />
  if (!documentType || !(documentType in DOCUMENT_META_BY_ID)) return <Navigate to="/documents" replace />

  const meta = DOCUMENT_META_BY_ID[documentType as DocumentTypeId]
  const isBackSide = Boolean(meta.requiresBackSide) && searchParams.get('side') === 'back'
  const frontSideResult = (location.state as { front?: CapturedSideResult } | null)?.front

  // Lost the front side's OCR text (e.g. a refresh mid-flow) — start the two-side capture over.
  if (isBackSide && !frontSideResult) return <Navigate to={`/documents/${documentType}`} replace />

  const title = t(meta.titleKey)
  const pageTitle = meta.requiresBackSide ? `${title} — ${t(isBackSide ? 'capture.backSideLabel' : 'capture.frontSideLabel')}` : title
  const isOptional = meta.requirement === 'optional'
  const canSkip = isOptional && (!record || record.status === 'not_uploaded')

  const switchMode = (next: Mode) => {
    setCameraFailed(false)
    setMode(next)
  }

  const handleTakePhoto = () => {
    const file = cameraRef.current?.capture()
    if (file) setCaptured(file)
  }

  const handleRetake = () => setCaptured(null)

  const handleConfirm = () => {
    if (!captured) return
    if (meta.requiresBackSide) {
      navigate(`/documents/${documentType}/processing`, {
        state: isBackSide ? { file: captured, side: 'back', front: frontSideResult } : { file: captured, side: 'front' },
      })
    } else {
      navigate(`/documents/${documentType}/processing`, { state: { file: captured } })
    }
  }

  const skipButton = canSkip ? (
    <SecondaryButton onClick={() => navigate('/documents')}>{t('capture.skipForNow')}</SecondaryButton>
  ) : null

  let footer = null
  if (captured) {
    footer = (
      <>
        <PrimaryButton onClick={handleConfirm}>{t('capture.useThis')}</PrimaryButton>
        <SecondaryButton onClick={handleRetake}>
          {t(captured.captureMethod === 'camera' ? 'capture.retake' : 'capture.chooseDifferent')}
        </SecondaryButton>
      </>
    )
  } else if (mode === 'camera' && !cameraFailed) {
    footer = (
      <PrimaryButton onClick={handleTakePhoto} disabled={!cameraReady}>
        <Camera className="size-5" aria-hidden="true" />
        {t('capture.takePhoto')}
      </PrimaryButton>
    )
  } else if (skipButton) {
    footer = skipButton
  }

  return (
    <AppShell title={pageTitle} onBack={() => navigate('/documents')} footer={footer}>
      <PageHeader title={pageTitle} description={t(meta.descriptionKey)} className="mb-5" />

      {meta.requiresBackSide && !captured && mode !== 'camera' && (
        <Notice className="mb-6">{t(isBackSide ? 'capture.backSideNotice' : 'capture.frontSideNotice')}</Notice>
      )}

      {isOptional && !captured && mode !== 'camera' && (
        <Notice className="mb-6">{t('capture.optionalNotice')}</Notice>
      )}

      {captured ? (
        <CapturePreview file={captured} documentLabel={title} />
      ) : mode === 'choose' ? (
        <CaptureMethodChooser onChoose={switchMode} />
      ) : mode === 'camera' ? (
        cameraFailed ? (
          <ErrorState
            icon={CameraOff}
            title={t('capture.cameraUnavailable.title')}
            body={t('capture.cameraUnavailable.body')}
            actions={
              <>
                <PrimaryButton onClick={() => switchMode('upload')}>
                  {t('capture.useFileInstead')}
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    setCameraFailed(false)
                    setCameraAttempt((attempt) => attempt + 1)
                  }}
                >
                  {t('capture.cameraUnavailable.retry')}
                </SecondaryButton>
              </>
            }
          />
        ) : (
          <>
            <p className="mb-3 text-center text-body font-medium text-ink-900">{t('capture.frameInstruction')}</p>
            <CameraCapture
              ref={cameraRef}
              frame={meta.captureFrame}
              attempt={cameraAttempt}
              onReadyChange={setCameraReady}
              onError={() => setCameraFailed(true)}
            />
            <div className="mt-3 text-center">
              <p className="text-small text-ink-600">{t('capture.qualityInstruction')}</p>
              <TextButton onClick={() => switchMode('upload')} className="mt-3">
                <FileUp className="size-4" aria-hidden="true" />
                {t('capture.useFileInstead')}
              </TextButton>
            </div>
          </>
        )
      ) : (
        <>
          <UploadDropzone onFile={setCaptured} />
          <div className="mt-3 text-center">
            <TextButton onClick={() => switchMode('camera')}>
              <Camera className="size-4" aria-hidden="true" />
              {t('capture.useCameraInstead')}
            </TextButton>
          </div>
        </>
      )}
    </AppShell>
  )
}
