import type { DocumentRejection, DocumentStatus, DocumentTypeId, ExtractedField } from '@/types'
import { recognizeDocumentText } from '@/services/ocr/ocrEngine'
import { extractFieldsForDocument } from '@/services/ocr/fieldExtraction'
import { hashString } from '@/services/mock/prng'

export interface DocumentProcessResult {
  outcome: DocumentStatus
  rejection?: DocumentRejection
  extractedFields?: ExtractedField[]
  documentReference?: string
}

export interface ProcessDocumentParams {
  sessionId: string
  documentType: DocumentTypeId
  sizeBytes: number
  dataUrl: string
  mimeType: string
  onProgress?: (percent: number) => void
}

const MIN_ACCEPTABLE_SIZE_BYTES = 15_000
const MIN_TEXT_LENGTH = 8
const LOW_CONFIDENCE_THRESHOLD = 35
const REVIEW_CONFIDENCE_THRESHOLD = 65

function retake(reasonKey: 'blurry' | 'lowResolution' | 'cropped'): DocumentProcessResult {
  return {
    outcome: 'retake_required',
    rejection: {
      reasonKey: `processing.reasons.${reasonKey}.title`,
      detailKey: `processing.reasons.${reasonKey}.body`,
    },
  }
}

function referenceFor(documentType: DocumentTypeId, sessionId: string, text: string): string {
  const hash = hashString(`${sessionId}|${documentType}|${text}`)
  return `DOC-${documentType}-${hash % 1_000_000}`
}

export async function processDocumentCapture(params: ProcessDocumentParams): Promise<DocumentProcessResult> {
  const { sessionId, documentType, sizeBytes, dataUrl, mimeType, onProgress } = params

  if (sizeBytes < MIN_ACCEPTABLE_SIZE_BYTES) {
    return retake('lowResolution')
  }

  if (mimeType === 'application/pdf') {
    // Tesseract.js only reads raster images in the browser; PDFs are queued for manual review.
    return { outcome: 'review_required', documentReference: referenceFor(documentType, sessionId, 'pdf') }
  }

  let ocr: { text: string; confidence: number }
  try {
    ocr = await recognizeDocumentText(dataUrl, onProgress)
  } catch {
    return { outcome: 'failed' }
  }

  if (ocr.text.trim().length < MIN_TEXT_LENGTH) {
    return retake('blurry')
  }
  if (ocr.confidence < LOW_CONFIDENCE_THRESHOLD) {
    return retake('lowResolution')
  }

  const { fields, primaryFieldFound } = extractFieldsForDocument(documentType, ocr.text)
  const documentReference = referenceFor(documentType, sessionId, ocr.text)

  if (!primaryFieldFound || ocr.confidence < REVIEW_CONFIDENCE_THRESHOLD) {
    return { outcome: 'review_required', extractedFields: fields, documentReference }
  }

  return { outcome: 'accepted', extractedFields: fields, documentReference }
}
