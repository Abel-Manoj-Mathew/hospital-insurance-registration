import { rectifyCard } from '@/services/ocr/cardCrop'

const TARGET_LONG_SIDE = 2000
const MAX_UPSCALE = 3
const SHARPNESS_LONG_SIDE = 800

export interface PreparedImage {
  /** Contrast-stretched grayscale at OCR resolution. */
  gray: HTMLCanvasElement
  /** Locally thresholded black-on-white copy; removes shadows and uneven lighting. */
  binary: HTMLCanvasElement
  /** Variance of the Laplacian at a fixed resolution; low values mean a blurry photo. */
  sharpness: number
}

export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load'))
    img.src = dataUrl
  })
}

type DrawSource = { image: CanvasImageSource; width: number; height: number }

function drawScaled(source: DrawSource, longSide: number, maxUpscale: number): HTMLCanvasElement {
  const scale = Math.min(longSide / Math.max(source.width, source.height), maxUpscale)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source.image, 0, 0, canvas.width, canvas.height)
  return canvas
}

function toGray(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData
  const gray = new Float32Array(width * height)
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }
  return gray
}

function laplacianVariance(gray: Float32Array, width: number, height: number): number {
  let sum = 0
  let sumSq = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const lap = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i]
      sum += lap
      sumSq += lap * lap
      count++
    }
  }
  if (count === 0) return 0
  const mean = sum / count
  return sumSq / count - mean * mean
}

function percentile(histogram: Uint32Array, total: number, fraction: number): number {
  const target = total * fraction
  let running = 0
  for (let v = 0; v < 256; v++) {
    running += histogram[v]
    if (running >= target) return v
  }
  return 255
}

/** Stretches the 2nd–98th percentile of brightness to the full 0–255 range. */
function stretchContrast(gray: Float32Array): void {
  const histogram = new Uint32Array(256)
  for (const value of gray) histogram[Math.max(0, Math.min(255, Math.round(value)))]++
  const low = percentile(histogram, gray.length, 0.02)
  const high = percentile(histogram, gray.length, 0.98)
  const range = Math.max(1, high - low)
  for (let i = 0; i < gray.length; i++) {
    gray[i] = Math.max(0, Math.min(255, ((gray[i] - low) / range) * 255))
  }
}

/** Mean-of-neighbourhood threshold using an integral image, so shadows/glare don't swallow text. */
function adaptiveThreshold(gray: Float32Array, width: number, height: number): Uint8ClampedArray {
  const stride = width + 1
  const integral = new Float64Array(stride * (height + 1))
  for (let y = 1; y <= height; y++) {
    let rowSum = 0
    for (let x = 1; x <= width; x++) {
      rowSum += gray[(y - 1) * width + (x - 1)]
      integral[y * stride + x] = integral[(y - 1) * stride + x] + rowSum
    }
  }
  const half = Math.max(8, Math.round(width / 40))
  const out = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - half)
    const y1 = Math.min(height, y + half + 1)
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - half)
      const x1 = Math.min(width, x + half + 1)
      const area = (x1 - x0) * (y1 - y0)
      const sum = integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0]
      out[y * width + x] = gray[y * width + x] < (sum / area) * 0.9 ? 0 : 255
    }
  }
  return out
}

function canvasFromGray(values: ArrayLike<number>, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(width, height)
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    imageData.data[i * 4] = v
    imageData.data[i * 4 + 1] = v
    imageData.data[i * 4 + 2] = v
    imageData.data[i * 4 + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

export interface PrepareOptions {
  /** Detect the card's edges, then straighten and crop to it before cleaning up the image. */
  cropCard?: boolean
}

export async function prepareImage(dataUrl: string, options: PrepareOptions = {}): Promise<PreparedImage> {
  const img = await loadImage(dataUrl)
  const rectified = options.cropCard ? await rectifyCard(img) : null
  const source: DrawSource = rectified
    ? { image: rectified, width: rectified.width, height: rectified.height }
    : { image: img, width: img.naturalWidth, height: img.naturalHeight }

  const small = drawScaled(source, SHARPNESS_LONG_SIDE, 1)
  const smallData = small.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, small.width, small.height)
  const sharpness = laplacianVariance(toGray(smallData), small.width, small.height)

  const scaled = drawScaled(source, TARGET_LONG_SIDE, MAX_UPSCALE)
  const { width, height } = scaled
  const gray = toGray(scaled.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height))
  stretchContrast(gray)

  return {
    gray: canvasFromGray(gray, width, height),
    binary: canvasFromGray(adaptiveThreshold(gray, width, height), width, height),
    sharpness,
  }
}
