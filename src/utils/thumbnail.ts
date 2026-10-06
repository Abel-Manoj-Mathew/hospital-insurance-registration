const THUMBNAIL_LONG_SIDE = 480
const THUMBNAIL_JPEG_QUALITY = 0.7

/**
 * Shrinks a captured photo to a small preview. The full-size capture can be several MB, and the whole
 * session is persisted to localStorage (about 5MB), so only the thumbnail may be kept in the store.
 */
export function makeThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, THUMBNAIL_LONG_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', THUMBNAIL_JPEG_QUALITY))
    }
    // A PDF or unreadable file has no raster preview; callers treat '' as "none".
    img.onerror = () => resolve('')
    img.src = dataUrl
  })
}
