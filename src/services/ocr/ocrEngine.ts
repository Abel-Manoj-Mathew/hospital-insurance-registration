import { createWorker, type Worker } from 'tesseract.js'

export interface OcrResult {
  text: string
  confidence: number
}

let workerPromise: Promise<Worker> | null = null
let activeProgressListener: ((percent: number) => void) | null = null

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
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

/**
 * Runs client-side OCR (Tesseract.js) against an image data URL. Only one
 * recognition runs at a time in this app, so the module-level progress
 * listener is safe and avoids re-loading Tesseract's language data per call.
 */
export async function recognizeDocumentText(
  imageDataUrl: string,
  onProgress?: (percent: number) => void,
): Promise<OcrResult> {
  const worker = await getWorker()
  activeProgressListener = onProgress ?? null
  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(imageDataUrl)
    return { text, confidence }
  } finally {
    activeProgressListener = null
  }
}
