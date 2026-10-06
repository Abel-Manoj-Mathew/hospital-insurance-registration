// OpenCV.js is ~10MB, so it is loaded from a CDN only when a card is scanned and cached by the browser.
// Any failure (offline, no card edges found) just means the photo is OCR'd uncropped.
const OPENCV_URL = 'https://docs.opencv.org/4.10.0/opencv.js'
const OPENCV_LOAD_TIMEOUT_MS = 25_000
const DETECT_LONG_SIDE = 800
const OUTPUT_LONG_SIDE = 2000
/** The detected card must cover at least this share of the photo, or it is probably something else. */
const MIN_CARD_AREA_SHARE = 0.2
/** If the card already fills the photo this much there is nothing worth cropping. */
const MAX_CARD_AREA_SHARE = 0.96
const CARD_ASPECT_RANGE = [1.2, 2.1] as const

// OpenCV.js has no bundled types; the surface used here is small.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenCv = any

declare global {
  interface Window {
    cv?: OpenCv
  }
}

let openCvPromise: Promise<OpenCv> | null = null

function loadOpenCv(): Promise<OpenCv> {
  if (!openCvPromise) {
    openCvPromise = new Promise<OpenCv>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('OpenCV load timed out')), OPENCV_LOAD_TIMEOUT_MS)
      const done = (cv: OpenCv) => {
        window.clearTimeout(timer)
        resolve(cv)
      }
      const onScriptLoaded = () => {
        const cv = window.cv
        if (!cv) return reject(new Error('OpenCV missing after load'))
        if (typeof cv.then === 'function') {
          // Some builds expose a thenable; it must drop its own `then` or resolving would loop forever.
          cv.then((ready: OpenCv) => {
            delete ready.then
            done(ready)
          })
        } else if (cv.Mat) {
          done(cv)
        } else {
          cv.onRuntimeInitialized = () => done(cv)
        }
      }
      const script = document.createElement('script')
      script.src = OPENCV_URL
      script.async = true
      script.onload = onScriptLoaded
      script.onerror = () => reject(new Error('OpenCV failed to load'))
      document.head.appendChild(script)
    }).catch((error) => {
      openCvPromise = null // allow a retry on the next scan
      throw error
    })
  }
  return openCvPromise
}

type Point = { x: number; y: number }

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Orders four corners as top-left, top-right, bottom-right, bottom-left. */
function orderCorners(points: Point[]): [Point, Point, Point, Point] {
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y))
  const byDiff = [...points].sort((a, b) => a.y - a.x - (b.y - b.x))
  return [bySum[0], byDiff[0], bySum[3], byDiff[3]]
}

/** Finds the largest convex 4-corner outline (the card edge) in detection-resolution coordinates. */
function findCardQuad(cv: OpenCv, canvas: HTMLCanvasElement): { corners: Point[]; areaShare: number } | null {
  const src = cv.imread(canvas)
  const gray = new cv.Mat()
  const edges = new cv.Mat()
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U)
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0)
    cv.Canny(gray, edges, 50, 150)
    cv.dilate(edges, edges, kernel)
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    const imageArea = canvas.width * canvas.height
    let best: { corners: Point[]; area: number } | null = null
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const approx = new cv.Mat()
      try {
        cv.approxPolyDP(contour, approx, 0.02 * cv.arcLength(contour, true), true)
        if (approx.rows !== 4 || !cv.isContourConvex(approx)) continue
        const area = cv.contourArea(approx)
        if (area / imageArea < MIN_CARD_AREA_SHARE || (best && area <= best.area)) continue
        const corners: Point[] = []
        for (let p = 0; p < 4; p++) corners.push({ x: approx.data32S[p * 2], y: approx.data32S[p * 2 + 1] })
        best = { corners, area }
      } finally {
        approx.delete()
        contour.delete()
      }
    }
    return best ? { corners: best.corners, areaShare: best.area / imageArea } : null
  } finally {
    src.delete()
    gray.delete()
    edges.delete()
    kernel.delete()
    contours.delete()
    hierarchy.delete()
  }
}

/**
 * Detects the card's four edges, then straightens and crops it (perspective warp, which also removes
 * tilt). Returns null when no plausible card outline is found, so callers fall back to the original.
 */
export async function rectifyCard(img: HTMLImageElement): Promise<HTMLCanvasElement | null> {
  try {
    const cv = await loadOpenCv()

    const detectScale = Math.min(1, DETECT_LONG_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const detect = document.createElement('canvas')
    detect.width = Math.round(img.naturalWidth * detectScale)
    detect.height = Math.round(img.naturalHeight * detectScale)
    detect.getContext('2d')!.drawImage(img, 0, 0, detect.width, detect.height)

    const found = findCardQuad(cv, detect)
    if (!found || found.areaShare > MAX_CARD_AREA_SHARE) return null

    const [tl, tr, br, bl] = orderCorners(found.corners).map((p) => ({ x: p.x / detectScale, y: p.y / detectScale }))
    const width = Math.max(distance(tl, tr), distance(bl, br))
    const height = Math.max(distance(tl, bl), distance(tr, br))
    const aspect = Math.max(width, height) / Math.min(width, height)
    if (aspect < CARD_ASPECT_RANGE[0] || aspect > CARD_ASPECT_RANGE[1]) return null

    const outScale = Math.min(1, OUTPUT_LONG_SIDE / Math.max(width, height))
    const outW = Math.round(width * outScale)
    const outH = Math.round(height * outScale)

    const full = document.createElement('canvas')
    full.width = img.naturalWidth
    full.height = img.naturalHeight
    full.getContext('2d')!.drawImage(img, 0, 0)

    const src = cv.imread(full)
    const dst = new cv.Mat()
    const from = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y])
    const to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, outW, 0, outW, outH, 0, outH])
    const transform = cv.getPerspectiveTransform(from, to)
    try {
      cv.warpPerspective(src, dst, transform, new cv.Size(outW, outH), cv.INTER_CUBIC, cv.BORDER_REPLICATE)
      const out = document.createElement('canvas')
      out.width = outW
      out.height = outH
      cv.imshow(out, dst)
      return out
    } finally {
      src.delete()
      dst.delete()
      from.delete()
      to.delete()
      transform.delete()
    }
  } catch {
    return null
  }
}
