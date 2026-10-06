import { apiRequest } from '@/services/api/httpClient'
import { useSessionStore } from '@/state/sessionStore'
import { loadImage } from '@/services/ocr/imagePreprocess'

const UPLOAD_LONG_SIDE = 2000
const UPLOAD_JPEG_QUALITY = 0.9

export interface ServerOcrResult {
  text: string
  confidence: number
}

/** True when the app is configured to read documents with the PaddleOCR service instead of the browser. */
export const isServerOcrEnabled = import.meta.env.VITE_OCR_ENGINE === 'paddle'

/** Downscales to a sensible upload size; phone photos can be 10MB+. */
async function compressForUpload(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, UPLOAD_LONG_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', UPLOAD_JPEG_QUALITY)
}

/** Sends the photo to the API, which forwards it to PaddleOCR. Throws on any failure so callers can fall back. */
export async function recognizeOnServer(imageDataUrl: string): Promise<ServerOcrResult> {
  const sessionId = useSessionStore.getState().sessionId
  if (!sessionId) throw new Error('No session for server OCR')
  const image = await compressForUpload(imageDataUrl)
  return apiRequest<ServerOcrResult>('/api/ocr', { method: 'POST', body: JSON.stringify({ sessionId, image }) })
}
