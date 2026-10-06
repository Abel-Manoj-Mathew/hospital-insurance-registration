import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/** An e-Aadhaar PDF has the front and back on pages 1 and 2; nothing we read needs more than a few pages. */
const MAX_PAGES = 3
const RENDER_LONG_SIDE = 2000
const JPEG_QUALITY = 0.92

export interface RenderedPdfPage {
  dataUrl: string
  sizeBytes: number
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Draws the first pages of a PDF onto canvases and returns them as JPEG data URLs, so they can go
 * through the same OCR path as a photo. Throws if the PDF can't be opened (e.g. it is password-protected).
 */
export async function renderPdfPages(pdfDataUrl: string): Promise<RenderedPdfPage[]> {
  const loadingTask = pdfjs.getDocument({ data: dataUrlToBytes(pdfDataUrl) })
  const pdf = await loadingTask.promise
  try {
    const pages: RenderedPdfPage[] = []
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, MAX_PAGES); pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: RENDER_LONG_SIDE / Math.max(base.width, base.height) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const canvasContext = canvas.getContext('2d')
      if (!canvasContext) throw new Error('Canvas unavailable')
      // PDFs are transparent by default; OCR needs dark text on a white page.
      canvasContext.fillStyle = '#fff'
      canvasContext.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvas, canvasContext, viewport }).promise
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      pages.push({ dataUrl, sizeBytes: Math.round(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4) })
    }
    return pages
  } finally {
    void loadingTask.destroy()
  }
}
