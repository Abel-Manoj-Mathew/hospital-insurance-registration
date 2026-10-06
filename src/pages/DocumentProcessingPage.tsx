import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from '@/i18n/useTranslation'
import { useSessionStore } from '@/state/sessionStore'
import { DOCUMENT_META_BY_ID } from '@/utils/documentMeta'
import { makeThumbnail } from '@/utils/thumbnail'
import {
  processDocumentBackSide,
  processDocumentCapture,
  processDocumentFrontSide,
  type DocumentProcessResult,
} from '@/services/api/documentApi'
import { syncDocumentResult } from '@/services/api/sessionApi'
import type { CaptureMethod, CapturedFile, CapturedSideResult, DocumentSide, DocumentTypeId } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { SecondaryButton } from '@/components/common/SecondaryButton'
import { ResultState } from '@/components/common/ResultState'
import { ProcessingState } from '@/components/documents/ProcessingState'

interface LocationState {
  file?: CapturedFile
  side?: DocumentSide
  front?: CapturedSideResult
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

  const locationState = location.state as LocationState | null
  const file = locationState?.file
  const side = locationState?.side
  const frontState = locationState?.front

  const [attempt, setAttempt] = useState(1)
  const [result, setResult] = useState<DocumentProcessResult | null>(null)
  const [frontResult, setFrontResult] = useState<CapturedSideResult | null>(null)
  const [progress, setProgress] = useState(0)
  const runningRef = useRef(false)

  const validDocumentType = documentType && documentType in DOCUMENT_META_BY_ID

  useEffect(() => {
    if (!file || !sessionId || !validDocumentType || runningRef.current) return
    const meta = DOCUMENT_META_BY_ID[documentType as DocumentTypeId]
    const isFrontStep = Boolean(meta.requiresBackSide) && side === 'front' && file.mimeType !== 'application/pdf'
    const isBackStep = Boolean(meta.requiresBackSide) && side === 'back' && Boolean(frontState)

    // Back side was requested but the front side's OCR text is gone (e.g. a refresh mid-flow);
    // the render guard below sends the user back to capture the front side again.
    if (Boolean(meta.requiresBackSide) && side === 'back' && !frontState) return

    runningRef.current = true
    setResult(null)
    setFrontResult(null)
    setProgress(0)

    if (isFrontStep) {
      processDocumentFrontSide({ documentType: documentType as DocumentTypeId, sizeBytes: file.sizeBytes, dataUrl: file.dataUrl, onProgress: setProgress }).then(
        (outcome) => {
          if (outcome.outcome === 'ok') {
            setFrontResult({
              dataUrl: file.dataUrl,
              captureMethod: file.captureMethod,
              ocrText: outcome.ocrText,
              confidence: outcome.confidence,
            })
          } else if (outcome.outcome === 'retake_required') {
            setResult({ outcome: 'retake_required', rejection: outcome.rejection })
          } else {
            setResult({ outcome: 'failed' })
          }
          runningRef.current = false
        },
      )
      return
    }

    setDocumentProcessing(documentType as DocumentTypeId)

    const run =
      isBackStep && frontState
        ? processDocumentBackSide({
            sessionId,
            documentType: documentType as DocumentTypeId,
            front: { ocrText: frontState.ocrText, confidence: frontState.confidence },
            sizeBytes: file.sizeBytes,
            dataUrl: file.dataUrl,
            mimeType: file.mimeType,
            onProgress: setProgress,
          })
        : processDocumentCapture({
            sessionId,
            documentType: documentType as DocumentTypeId,
            sizeBytes: file.sizeBytes,
            dataUrl: file.dataUrl,
            mimeType: file.mimeType,
            onProgress: setProgress,
          })

    run.then(async (outcome) => {
      const capturedAt = new Date().toISOString()
      const previewSource =
        outcome.outcome === 'accepted' || outcome.outcome === 'review_required'
          ? isBackStep && frontState
            ? frontState.dataUrl
            : file.dataUrl
          : undefined
      const previewDataUrl = previewSource ? (await makeThumbnail(previewSource)) || undefined : undefined
      setDocumentResult(documentType as DocumentTypeId, {
        status: outcome.outcome,
        captureMethod: file.captureMethod,
        previewDataUrl,
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
  }, [attempt, file, sessionId, validDocumentType, side])

  if (!language) return <Navigate to="/language" replace />
  if (!validDocumentType) return <Navigate to="/documents" replace />
  if (!file) return <Navigate to={`/documents/${documentType}`} replace />

  const meta = DOCUMENT_META_BY_ID[documentType as DocumentTypeId]
  if (meta.requiresBackSide && side === 'back' && !frontState) {
    return <Navigate to={`/documents/${documentType}`} replace />
  }

  const documentLabel = t(meta.titleKey)
  const sameMethod = file.captureMethod
  const otherMethod: CaptureMethod = sameMethod === 'camera' ? 'upload' : 'camera'
  const isBackStep = Boolean(meta.requiresBackSide) && side === 'back'

  const goToCapture = (method: CaptureMethod) =>
    isBackStep
      ? navigate(`/documents/${documentType}?mode=${method}&side=back`, { replace: true, state: { front: frontState } })
      : navigate(`/documents/${documentType}?mode=${method}`, { replace: true })
  const goToBackSide = () =>
    frontResult && navigate(`/documents/${documentType}?side=back`, { state: { front: frontResult } })
  const handleTryAgain = () => setAttempt((a) => a + 1)
  const handleContinue = () => navigate('/documents')

  const retakeLabel = (method: CaptureMethod) =>
    method === 'camera' ? t('processing.retakePhoto') : t('processing.chooseAnotherFile')

  let footer = null
  let content = <ProcessingState file={file} progress={progress} />

  if (frontResult && !result) {
    content = <ResultState tone="success" title={t('capture.frontCapturedTitle')} body={t('capture.frontCapturedBody')} />
    footer = (
      <>
        <PrimaryButton onClick={goToBackSide}>{t('capture.continueToBack')}</PrimaryButton>
        <SecondaryButton onClick={() => goToCapture(sameMethod)}>{t('capture.retake')}</SecondaryButton>
      </>
    )
  } else if (result?.outcome === 'accepted') {
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

  const title = result ? documentLabel : frontResult ? t('capture.frontCapturedTitle') : t('processing.title')

  return (
    <AppShell title={title} onBack={handleContinue} footer={footer} centered>
      {content}
    </AppShell>
  )
}
