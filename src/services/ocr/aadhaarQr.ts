import jsQR from 'jsqr'
import { loadImage } from '@/services/ocr/imagePreprocess'

export interface AadhaarQrData {
  name: string
  dateOfBirth?: string
  address?: string
}

/** Prefix of the line appended to a side's OCR text so QR data travels with it through the capture flow. */
export const AADHAAR_QR_PREFIX = 'AADHAAR_QR::'

// Aadhaar's QR is small relative to the card, and phone photos blur it, so one jsQR pass is not enough.
// Strategy: the browser's native detector (fast, robust, Chrome/Android) -> whole image at several
// scales -> overlapping tiles blown up so a small QR gets enough pixels per module.
const QR_FULL_WIDTHS = [2000, 1400, 1000, 700]
/** Each tile covers this share of the image per axis; 3x3 tiles at 0/20/40% offsets overlap by 20%. */
const QR_TILE_FRACTION = 0.6
const QR_TILE_STEPS = 3
const QR_TILE_WIDTH = 900

interface NativeBarcodeDetector {
  detect(image: CanvasImageSource): Promise<Array<{ rawValue: string }>>
}
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => NativeBarcodeDetector
  }
}

function jsQrScan(source: HTMLCanvasElement): string | undefined {
  const ctx = source.getContext('2d', { willReadFrequently: true })!
  const { data, width, height } = ctx.getImageData(0, 0, source.width, source.height)
  return jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })?.data || undefined
}

function cropToCanvas(img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, outWidth: number): HTMLCanvasElement {
  const scale = outWidth / sw
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Scans the image for a QR code; returns its raw text and the image size (for diagnostics). */
async function scanQrText(dataUrl: string): Promise<{ text?: string; size: string; method?: string }> {
  const img = await loadImage(dataUrl)
  const { naturalWidth: w, naturalHeight: h } = img
  const size = `${w}x${h}`

  if (window.BarcodeDetector) {
    try {
      const found = await new window.BarcodeDetector({ formats: ['qr_code'] }).detect(img)
      if (found[0]?.rawValue) return { text: found[0].rawValue, size, method: 'native' }
    } catch {
      // Unsupported format list or platform: continue with jsQR.
    }
  }

  for (const width of QR_FULL_WIDTHS) {
    const text = jsQrScan(cropToCanvas(img, 0, 0, w, h, Math.min(width, w * 2)))
    if (text) return { text, size, method: `full@${width}` }
  }

  const tileW = w * QR_TILE_FRACTION
  const tileH = h * QR_TILE_FRACTION
  for (let row = 0; row < QR_TILE_STEPS; row++) {
    for (let col = 0; col < QR_TILE_STEPS; col++) {
      const sx = (col / (QR_TILE_STEPS - 1)) * (w - tileW)
      const sy = (row / (QR_TILE_STEPS - 1)) * (h - tileH)
      const text = jsQrScan(cropToCanvas(img, sx, sy, tileW, tileH, QR_TILE_WIDTH))
      if (text) return { text, size, method: `tile${row}${col}` }
    }
  }
  return { size }
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function decimalToBytes(decimal: string): Uint8Array<ArrayBuffer> {
  let hex = BigInt(decimal).toString(16)
  if (hex.length % 2) hex = `0${hex}`
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function joinAddress(parts: Array<string | undefined>): string | undefined {
  const joined = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ')
  return joined || undefined
}

/** UIDAI "secure QR": a big decimal number -> bytes -> gzip -> 0xFF-delimited text fields. */
async function parseSecureQr(text: string): Promise<AadhaarQrData | undefined> {
  const payload = await gunzip(decimalToBytes(text))
  const fields: string[] = []
  let start = 0
  for (let i = 0; i < payload.length; i++) {
    if (payload[i] === 255) {
      fields.push(new TextDecoder('utf-8').decode(payload.slice(start, i)))
      start = i + 1
    }
  }
  // Newer QR versions begin with a "V2" marker before the email/mobile indicator.
  const offset = /^V\d/.test(fields[0] ?? '') ? 1 : 0
  const at = (index: number) => fields[index + offset]
  const name = at(2)?.trim()
  const pincode = at(10)?.trim()
  if (!name || !/^\d{6}$/.test(pincode ?? '')) return undefined
  return {
    name,
    dateOfBirth: at(3)?.trim().replace(/-/g, '/'),
    address: joinAddress([at(5), at(8), at(13), at(7), at(9), at(15), at(11), at(14), at(6), at(12), pincode]),
  }
}

/** Pre-2018 Aadhaar QR codes are plain XML with attributes. */
function parseXmlQr(text: string): AadhaarQrData | undefined {
  const attr = (key: string) => new RegExp(`\\b${key}="([^"]*)"`).exec(text)?.[1]
  const name = attr('name')?.trim()
  if (!name) return undefined
  return {
    name,
    dateOfBirth: attr('dob')?.replace(/-/g, '/'),
    address: joinAddress([
      attr('co'),
      attr('house'),
      attr('street'),
      attr('lm'),
      attr('loc'),
      attr('vtc'),
      attr('po'),
      attr('subdist'),
      attr('dist'),
      attr('state'),
      attr('pc'),
    ]),
  }
}

/** Dev-only diagnostics: console plus the API log, since a phone has no reachable console. Never includes personal data. */
function reportQr(message: string): void {
  if (!import.meta.env.DEV) return
  console.debug(`[qr] ${message}`)
  fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/ocr/debug`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `qr: ${message}` }),
  }).catch(() => undefined)
}

function describe(data: AadhaarQrData | undefined): string {
  return data ? `decoded (name=${Boolean(data.name)}, dob=${Boolean(data.dateOfBirth)}, address=${Boolean(data.address)})` : 'unparseable'
}

export async function decodeAadhaarQr(dataUrl: string): Promise<AadhaarQrData | undefined> {
  try {
    const { text, size, method } = await scanQrText(dataUrl)
    if (!text) {
      reportQr(`no QR code found in image (${size}, native detector ${window.BarcodeDetector ? 'available' : 'unavailable'})`)
      return undefined
    }
    const trimmed = text.trim()
    if (trimmed.startsWith('<')) {
      const data = parseXmlQr(trimmed)
      reportQr(`XML QR via ${method} ${describe(data)}`)
      return data
    }
    if (/^\d{100,}$/.test(trimmed)) {
      const data = await parseSecureQr(trimmed)
      reportQr(`secure QR via ${method} (${trimmed.length} digits) ${describe(data)}`)
      return data
    }
    reportQr(`QR found but not an Aadhaar format (${trimmed.length} chars)`)
  } catch (error) {
    reportQr(`QR decode error: ${error instanceof Error ? error.message : 'unknown'}`)
  }
  return undefined
}

export function encodeQrLine(data: AadhaarQrData): string {
  return `${AADHAAR_QR_PREFIX}${JSON.stringify(data)}`
}

export function extractQrLine(ocrText: string): AadhaarQrData | undefined {
  const line = ocrText.split(/\r?\n/).find((l) => l.startsWith(AADHAAR_QR_PREFIX))
  if (!line) return undefined
  try {
    return JSON.parse(line.slice(AADHAAR_QR_PREFIX.length)) as AadhaarQrData
  } catch {
    return undefined
  }
}
