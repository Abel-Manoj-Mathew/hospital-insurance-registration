import type { DocumentRejection, DocumentStatus, DocumentTypeId, ExtractedField } from '@/types'
import { recognizeDigitsOnly, recognizeDocumentText, type OcrLayout } from '@/services/ocr/ocrEngine'
import { extractFieldsForDocument, hasVerifiedAadhaarNumber } from '@/services/ocr/fieldExtraction'
import { DOCUMENT_META_BY_ID } from '@/utils/documentMeta'
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
// Laplacian variance of the photo at 800px; deliberately low so only clearly out-of-focus shots are rejected.
const MIN_SHARPNESS = 12

function rejectionFor(reasonKey: 'blurry' | 'lowResolution' | 'cropped'): DocumentRejection {
  return {
    reasonKey: `processing.reasons.${reasonKey}.title`,
    detailKey: `processing.reasons.${reasonKey}.body`,
  }
}

function referenceFor(documentType: DocumentTypeId, sessionId: string, text: string): string {
  const hash = hashString(`${sessionId}|${documentType}|${text}`)
  return `DOC-${documentType}-${hash % 1_000_000}`
}

type SideOcrOutcome =
  | { status: 'ok'; text: string; confidence: number }
  | { status: 'retake'; rejection: DocumentRejection }
  | { status: 'failed' }

/**
 * If the general OCR pass didn't read a checksum-valid 12-digit Aadhaar number, re-reads the image
 * with a digits-only alphabet and appends the result.
 */
async function enrichAadhaarText(text: string, dataUrl: string): Promise<string> {
  if (hasVerifiedAadhaarNumber(text)) return text
  const digits = await recognizeDigitsOnly(dataUrl)
  return digits.trim() ? `${text}
${digits}` : text
}

async function ocrForImage(params: {
  documentType: DocumentTypeId
  sizeBytes: number
  dataUrl: string
  onProgress?: (percent: number) => void
}): Promise<SideOcrOutcome> {
  if (params.sizeBytes < MIN_ACCEPTABLE_SIZE_BYTES) {
    return { status: 'retake', rejection: rejectionFor('lowResolution') }
  }
  const layout: OcrLayout = DOCUMENT_META_BY_ID[params.documentType].captureFrame
  let ocr: { text: string; confidence: number; sharpness?: number }
  try {
    ocr = await recognizeDocumentText(params.dataUrl, params.onProgress, layout)
  } catch {
    return { status: 'failed' }
  }
  if (ocr.sharpness !== undefined && ocr.sharpness < MIN_SHARPNESS) {
    return { status: 'retake', rejection: rejectionFor('blurry') }
  }
  if (ocr.text.trim().length < MIN_TEXT_LENGTH) {
    return { status: 'retake', rejection: rejectionFor('blurry') }
  }
  if (ocr.confidence < LOW_CONFIDENCE_THRESHOLD) {
    return { status: 'retake', rejection: rejectionFor('lowResolution') }
  }
  let text = ocr.text
  if (params.documentType === 'aadhaar') text = await enrichAadhaarText(text, params.dataUrl)
  return { status: 'ok', text, confidence: ocr.confidence }
}

/**
 * Renders a PDF's pages to images and OCRs each one, joining the text (so a two-page e-Aadhaar gives
 * name/DOB/number from the front page and the address from the back). Pages that can't be read are
 * skipped; returns undefined if the PDF can't be opened or no page yielded text, so the caller can
 * fall back to manual review.
 */
async function ocrForPdf(
  documentType: DocumentTypeId,
  dataUrl: string,
  onProgress?: (percent: number) => void,
): Promise<{ text: string; confidence: number } | undefined> {
  let pages: { dataUrl: string; sizeBytes: number }[]
  try {
    // Loaded on demand so pdf.js stays out of the main bundle for photo uploads.
    const { renderPdfPages } = await import('@/services/ocr/pdfRender')
    pages = await renderPdfPages(dataUrl)
  } catch {
    return undefined
  }

  const reads: { text: string; confidence: number }[] = []
  for (const [index, page] of pages.entries()) {
    const result = await ocrForImage({
      documentType,
      sizeBytes: page.sizeBytes,
      dataUrl: page.dataUrl,
      onProgress: onProgress && ((percent) => onProgress(Math.round(((index + percent / 100) / pages.length) * 100))),
    })
    if (result.status === 'ok') reads.push(result)
  }
  if (reads.length === 0) return undefined
  return {
    text: reads.map((read) => read.text).join('\n'),
    confidence: Math.min(...reads.map((read) => read.confidence)),
  }
}

function finalizeFromOcr(
  documentType: DocumentTypeId,
  sessionId: string,
  text: string,
  confidence: number,
): DocumentProcessResult {
  if (import.meta.env.DEV) console.debug(`[ocr:${documentType}] confidence=${confidence}
${text}`)
  const { fields, primaryFieldFound } = extractFieldsForDocument(documentType, text)
  const documentReference = referenceFor(documentType, sessionId, text)

  if (!primaryFieldFound || confidence < REVIEW_CONFIDENCE_THRESHOLD) {
    return { outcome: 'review_required', extractedFields: fields, documentReference }
  }
  return { outcome: 'accepted', extractedFields: fields, documentReference }
}

export async function processDocumentCapture(params: ProcessDocumentParams): Promise<DocumentProcessResult> {
  const { sessionId, documentType, sizeBytes, dataUrl, mimeType, onProgress } = params

  if (sizeBytes < MIN_ACCEPTABLE_SIZE_BYTES) {
    return { outcome: 'retake_required', rejection: rejectionFor('lowResolution') }
  }

  if (mimeType === 'application/pdf') {
    const pdfText = await ocrForPdf(documentType, dataUrl, onProgress)
    // Unreadable PDF (e.g. password-protected or scanned too poorly): queue for manual review.
    if (!pdfText) return { outcome: 'review_required', documentReference: referenceFor(documentType, sessionId, 'pdf') }
    return finalizeFromOcr(documentType, sessionId, pdfText.text, pdfText.confidence)
  }

  const result = await ocrForImage({ documentType, sizeBytes, dataUrl, onProgress })
  if (result.status === 'retake') return { outcome: 'retake_required', rejection: result.rejection }
  if (result.status === 'failed') return { outcome: 'failed' }

  return finalizeFromOcr(documentType, sessionId, result.text, result.confidence)
}

export interface DocumentFrontSideParams {
  documentType: DocumentTypeId
  sizeBytes: number
  dataUrl: string
  onProgress?: (percent: number) => void
}

export type DocumentFrontSideResult =
  | { outcome: 'ok'; ocrText: string; confidence: number }
  | { outcome: 'retake_required'; rejection: DocumentRejection }
  | { outcome: 'failed' }

/**
 * OCR-only pass for the first side of a two-sided document (e.g. the front of an Aadhaar card).
 * Nothing is finalized yet — the document's status is decided once the back side has also been read.
 */
export async function processDocumentFrontSide(params: DocumentFrontSideParams): Promise<DocumentFrontSideResult> {
  const result = await ocrForImage(params)
  if (result.status === 'ok') return { outcome: 'ok', ocrText: result.text, confidence: result.confidence }
  if (result.status === 'retake') return { outcome: 'retake_required', rejection: result.rejection }
  return { outcome: 'failed' }
}

export interface DocumentBackSideParams {
  sessionId: string
  documentType: DocumentTypeId
  front: { ocrText: string; confidence: number }
  sizeBytes: number
  dataUrl: string
  mimeType: string
  onProgress?: (percent: number) => void
}

/**
 * Completes a two-sided document: OCRs the back side, merges its text with the already-read front
 * side (so e.g. an Aadhaar's address from the back joins the name/DOB/number from the front), then
 * extracts fields and finalizes the document's status.
 */
export async function processDocumentBackSide(params: DocumentBackSideParams): Promise<DocumentProcessResult> {
  const { sessionId, documentType, front, sizeBytes, dataUrl, mimeType, onProgress } = params

  if (sizeBytes < MIN_ACCEPTABLE_SIZE_BYTES) {
    return { outcome: 'retake_required', rejection: rejectionFor('lowResolution') }
  }

  let backText: string
  let backConfidence: number
  if (mimeType === 'application/pdf') {
    const pdfText = await ocrForPdf(documentType, dataUrl, onProgress)
    if (!pdfText) {
      // The back side couldn't be read, so the address can't be confirmed automatically.
      const { fields } = extractFieldsForDocument(documentType, front.ocrText)
      return {
        outcome: 'review_required',
        extractedFields: fields,
        documentReference: referenceFor(documentType, sessionId, `${front.ocrText}|pdf-back`),
      }
    }
    backText = pdfText.text
    backConfidence = pdfText.confidence
  } else {
    const result = await ocrForImage({ documentType, sizeBytes, dataUrl, onProgress })
    if (result.status === 'retake') return { outcome: 'retake_required', rejection: result.rejection }
    if (result.status === 'failed') return { outcome: 'failed' }
    backText = result.text
    backConfidence = result.confidence
  }

  const combinedText = `${front.ocrText}\n${backText}`
  const combinedConfidence = Math.min(front.confidence, backConfidence)
  return finalizeFromOcr(documentType, sessionId, combinedText, combinedConfidence)
}
