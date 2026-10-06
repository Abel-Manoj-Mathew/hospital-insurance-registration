import { createWorker, PSM, type Worker } from 'tesseract.js'
import { prepareImage, type PreparedImage } from '@/services/ocr/imagePreprocess'
import { isServerOcrEnabled, recognizeOnServer } from '@/services/ocr/serverOcr'

export type OcrLayout = 'card' | 'page'

export interface OcrResult {
  text: string
  confidence: number
  /** Laplacian variance of the photo; low values mean it is blurry. Undefined if preprocessing failed. */
  sharpness?: number
}

/** If the first pass is at least this confident, the second (alternate) pass is skipped. */
const GOOD_ENOUGH_CONFIDENCE = 65

let workerPromise: Promise<Worker> | null = null
let activeProgressListener: ((percent: number) => void) | null = null
let lastPrepared: { key: string; prepared: Promise<PreparedImage> } | null = null

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    // The default language data is already the "best" LSTM model, so no custom langPath is needed.
    workerPromise = createWorker('eng', 1, {
      logger: (message) => {
        if (message.status === 'recognizing text' && typeof message.progress === 'number') {
          activeProgressListener?.(Math.round(message.progress * 100))
        }
      },
    })
  }
  return workerPromise
}

/** Preprocessing is the same for every pass over one capture, so keep the last result. */
function preparedFor(dataUrl: string, layout: OcrLayout): Promise<PreparedImage> {
  const key = `${layout}|${dataUrl}`
  if (lastPrepared?.key !== key) {
    // Only ID cards are cropped to their edges; full pages are used as photographed.
    lastPrepared = { key, prepared: prepareImage(dataUrl, { cropCard: layout === 'card' }) }
  }
  return lastPrepared.prepared
}

async function recognizeWith(
  worker: Worker,
  image: HTMLCanvasElement | string,
  pageSegMode: PSM,
  whitelist = '',
): Promise<OcrResult> {
  await worker.setParameters({ tessedit_pageseg_mode: pageSegMode, tessedit_char_whitelist: whitelist })
  const {
    data: { text, confidence },
  } = await worker.recognize(image)
  return { text, confidence }
}

/**
 * Runs client-side OCR (Tesseract.js). The photo is first cleaned up (grayscale, contrast stretch,
 * local thresholding). Cards/IDs are read as one text block; if confidence is still low a
 * second pass on the plain grayscale image in sparse-text mode is tried and the better result kept.
 * Only one recognition runs at a time in this app, so the module-level progress listener is safe.
 */
export async function recognizeDocumentText(
  imageDataUrl: string,
  onProgress?: (percent: number) => void,
  layout: OcrLayout = 'card',
): Promise<OcrResult> {
  if (isServerOcrEnabled) {
    try {
      const server = await recognizeOnServer(imageDataUrl)
      // Sharpness still comes from the local preprocessing so the blur check behaves the same.
      const sharpness = await preparedFor(imageDataUrl, layout).then((p) => p.sharpness).catch(() => undefined)
      onProgress?.(100)
      return { ...server, sharpness }
    } catch {
      // Service down or offline: fall through to in-browser Tesseract.
    }
  }

  const worker = await getWorker()
  activeProgressListener = onProgress ?? null
  try {
    let prepared: PreparedImage
    try {
      prepared = await preparedFor(imageDataUrl, layout)
    } catch {
      // Preprocessing is an optimisation; fall back to the raw photo if the canvas work fails.
      return await recognizeWith(worker, imageDataUrl, PSM.AUTO)
    }

    const firstMode = layout === 'card' ? PSM.SINGLE_BLOCK : PSM.AUTO
    const first = await recognizeWith(worker, prepared.binary, firstMode)
    if (first.confidence >= GOOD_ENOUGH_CONFIDENCE) return { ...first, sharpness: prepared.sharpness }

    const secondMode = layout === 'card' ? PSM.SPARSE_TEXT : PSM.AUTO
    const second = await recognizeWith(worker, prepared.gray, secondMode)
    const best = second.confidence > first.confidence ? second : first
    return { ...best, sharpness: prepared.sharpness }
  } finally {
    activeProgressListener = null
  }
}

/**
 * Digits-only pass over the whole image. Used to re-read an Aadhaar number when the general pass
 * misread a digit: restricting the alphabet removes look-alike letters (O/0, I/1, S/5, B/8).
 */
export async function recognizeDigitsOnly(imageDataUrl: string): Promise<string> {
  const worker = await getWorker()
  try {
    const prepared = await preparedFor(imageDataUrl, 'card')
    const { text } = await recognizeWith(worker, prepared.gray, PSM.SPARSE_TEXT, '0123456789 ')
    return text
  } catch {
    return ''
  }
}
