import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from '@/i18n/useTranslation'
import { useSessionStore } from '@/state/sessionStore'
import { DOCUMENT_META_BY_ID } from '@/utils/documentMeta'
import { processDocumentCapture, type DocumentProcessResult } from '@/services/api/documentApi'
import { syncDocumentResult } from '@/services/api/sessionApi'
import type { CaptureMethod, CapturedFile, DocumentTypeId } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { SecondaryButton } from '@/components/common/SecondaryButton'
import { ResultState } from '@/components/common/ResultState'
import { ProcessingState } from '@/components/documents/ProcessingState'

interface LocationState {
  file?: CapturedFile
}

export function DocumentProcessingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { documentType } = useParams<{ documentType: string }>()

  const sessionId = useSessionStore((state) => state.sessionId)
  const language = useSessionStore((state) => state.language)
  const setDocumentProcessing = useSessionStore((state) => state.setDocumentProcessing)
  const setDocumentResult = useSessionStore((state) => state.setDocumentResult)

  const file = (location.state as LocationState | null)?.file
  const [attempt, setAttempt] = useState(1)
  const [result, setResult] = useState<DocumentProcessResult | null>(null)
  const [progress, setProgress] = useState(0)
  const runningRef = useRef(false)

  const validDocumentType = documentType && documentType in DOCUMENT_META_BY_ID

  useEffect(() => {
    if (!file || !sessionId || !validDocumentType || runningRef.current) return
    runningRef.current = true
    setResult(null)
    setProgress(0)
    setDocumentProcessing(documentType as DocumentTypeId)

    processDocumentCapture({
      sessionId,
      documentType: documentType as DocumentTypeId,
      sizeBytes: file.sizeBytes,
      dataUrl: file.dataUrl,
      mimeType: file.mimeType,
      onProgress: setProgress,
    }).then((outcome) => {
      const capturedAt = new Date().toISOString()
      setDocumentResult(documentType as DocumentTypeId, {
        status: outcome.outcome,
        captureMethod: file.captureMethod,
        previewDataUrl: outcome.outcome === 'accepted' || outcome.outcome === 'review_required' ? file.dataUrl : undefined,
        capturedAt,
        rejection: outcome.rejection,
        extractedFields: outcome.extractedFields,
        documentReference: outcome.documentReference,
      })
      syncDocumentResult(sessionId, documentType as DocumentTypeId, {
        status: outcome.outcome,
        captureMethod: file.captureMethod,
        capturedAt,
        rejection: outcome.rejection,
        extractedFields: outcome.extractedFields,
        documentReference: outcome.documentReference,
      }).catch(() => console.warn('Document result sync failed'))
      setResult(outcome)
      runningRef.current = false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, file, sessionId, validDocumentType])

  if (!language) return <Navigate to="/language" replace />
  if (!validDocumentType) return <Navigate to="/documents" replace />
  if (!file) return <Navigate to={`/documents/${documentType}`} replace />

  const meta = DOCUMENT_META_BY_ID[documentType as DocumentTypeId]
  const documentLabel = t(meta.titleKey)
  const sameMethod = file.captureMethod
  const otherMethod: CaptureMethod = sameMethod === 'camera' ? 'upload' : 'camera'

  const goToCapture = (method: CaptureMethod) =>
    navigate(`/documents/${documentType}?mode=${method}`, { replace: true })
  const handleTryAgain = () => setAttempt((a) => a + 1)
  const handleContinue = () => navigate('/documents')

  const retakeLabel = (method: CaptureMethod) =>
    method === 'camera' ? t('processing.retakePhoto') : t('processing.chooseAnotherFile')

  let footer = null
  let content = <ProcessingState file={file} progress={progress} />

  if (result?.outcome === 'accepted') {
    content = (
      <ResultState
        tone="success"
        title={t('processing.acceptedTitle')}
        body={t('processing.acceptedBody', { document: documentLabel })}
      />
    )
    footer = <PrimaryButton onClick={handleContinue}>{t('processing.continue')}</PrimaryButton>
  } else if (result?.outcome === 'review_required') {
    content = <ResultState tone="warning" title={t('processing.reviewTitle')} body={t('processing.reviewBody')} />
    footer = (
      <>
        <PrimaryButton onClick={handleContinue}>{t('processing.continue')}</PrimaryButton>
        <SecondaryButton onClick={() => goToCapture(sameMethod)}>
          {retakeLabel(sameMethod)}
        </SecondaryButton>
      </>
    )
  } else if (result?.outcome === 'retake_required') {
    content = (
      <ResultState
        tone="error"
        title={result.rejection ? t(result.rejection.reasonKey) : t('processing.failedTitle')}
        body={result.rejection?.detailKey ? t(result.rejection.detailKey) : t('processing.failedBody')}
      />
    )
    footer = (
      <>
        <PrimaryButton onClick={() => goToCapture(sameMethod)}>
          {retakeLabel(sameMethod)}
        </PrimaryButton>
        <SecondaryButton onClick={() => goToCapture(otherMethod)}>
          {otherMethod === 'camera' ? t('processing.takePhotoInstead') : t('processing.chooseAnotherFile')}
        </SecondaryButton>
      </>
    )
  } else if (result?.outcome === 'failed') {
    content = <ResultState tone="error" title={t('processing.failedTitle')} body={t('processing.failedBody')} />
    footer = (
      <>
        <PrimaryButton onClick={handleTryAgain}>{t('processing.tryAgain')}</PrimaryButton>
        <SecondaryButton onClick={() => goToCapture(sameMethod)}>
          {retakeLabel(sameMethod)}
        </SecondaryButton>
      </>
    )
  }

  return (
    <AppShell title={result ? documentLabel : t('processing.title')} onBack={handleContinue} footer={footer} centered>
      {content}
    </AppShell>
  )
}
