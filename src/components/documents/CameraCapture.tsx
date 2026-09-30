import type { Ref } from 'react'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import type { CapturedFile } from '@/types'
import type { CaptureFrame } from '@/utils/documentMeta'
import { cn } from '@/utils/cn'

export interface CameraCaptureHandle {
  capture: () => CapturedFile | null
}

interface CameraCaptureProps {
  ref?: Ref<CameraCaptureHandle>
  frame: CaptureFrame
  /** Bump to restart the camera after a failure. */
  attempt: number
  onReadyChange: (ready: boolean) => void
  onError: () => void
}

const CORNER = 'absolute size-7 border-white'

// Keep in sync with the container/overlay classes rendered below.
const CONTAINER_ASPECT: Record<CaptureFrame, number> = { card: 4 / 3, page: 3 / 4 }
const GUIDE_ASPECT: Record<CaptureFrame, number> = { card: 1.586, page: 0.707 }
const GUIDE_FRACTION: Record<CaptureFrame, number> = { card: 0.84, page: 0.86 }

/** Source rect (in video pixels) for the guide box, accounting for the video's object-cover crop. */
function getGuideSourceRect(video: HTMLVideoElement, frame: CaptureFrame) {
  const containerAspect = CONTAINER_ASPECT[frame]
  const nativeAspect = video.videoWidth / video.videoHeight

  const visible =
    nativeAspect > containerAspect
      ? { w: video.videoHeight * containerAspect, h: video.videoHeight }
      : { w: video.videoWidth, h: video.videoWidth / containerAspect }
  const offsetX = (video.videoWidth - visible.w) / 2
  const offsetY = (video.videoHeight - visible.h) / 2

  // guide box is centered within the container, sized as a fraction of width (card) or height (page)
  const guideWFrac = frame === 'card' ? GUIDE_FRACTION.card : (GUIDE_FRACTION.page * GUIDE_ASPECT.page) / containerAspect
  const guideHFrac = frame === 'card' ? GUIDE_FRACTION.card / GUIDE_ASPECT.card * containerAspect : GUIDE_FRACTION.page

  return {
    sx: offsetX + ((1 - guideWFrac) / 2) * visible.w,
    sy: offsetY + ((1 - guideHFrac) / 2) * visible.h,
    sw: guideWFrac * visible.w,
    sh: guideHFrac * visible.h,
  }
}

export function CameraCapture({ ref, frame, attempt, onReadyChange, onError }: CameraCaptureProps) {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    onReadyChange(false)

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (stream) => {
        // Effects re-run under StrictMode; release a stream that arrives after this run was torn down.
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        if (!cancelled) {
          setReady(true)
          onReadyChange(true)
        }
      })
      .catch(() => {
        if (!cancelled) onError()
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  useImperativeHandle(ref, () => ({
    capture: () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || !ready) return null
      const { sx, sy, sw, sh } = getGuideSourceRect(video, frame)
      canvas.width = Math.round(sw)
      canvas.height = Math.round(sh)
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      return { dataUrl, sizeBytes: Math.round((dataUrl.length * 3) / 4), mimeType: 'image/jpeg', captureMethod: 'camera' }
    },
  }))

  return (
    <div
      className={cn(
        'relative mx-auto w-full overflow-hidden rounded-2xl bg-ink-900',
        // Height-capped so the instruction and the Take photo bar stay visible on short phones.
        frame === 'card' ? 'aspect-[4/3] max-w-[calc(46dvh*4/3)]' : 'aspect-[3/4] max-w-[calc(46dvh*3/4)]',
      )}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        aria-label={t('capture.viewfinderLabel')}
        className="size-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div
          className={cn(
            'relative rounded-lg shadow-[0_0_0_100vmax_rgb(15_26_40/0.45)]',
            frame === 'card' ? 'aspect-[1.586] w-[84%]' : 'aspect-[0.707] h-[86%]',
          )}
        >
          <span className={cn(CORNER, '-top-0.5 -left-0.5 rounded-tl-lg border-t-[3px] border-l-[3px]')} />
          <span className={cn(CORNER, '-top-0.5 -right-0.5 rounded-tr-lg border-t-[3px] border-r-[3px]')} />
          <span className={cn(CORNER, '-bottom-0.5 -left-0.5 rounded-bl-lg border-b-[3px] border-l-[3px]')} />
          <span className={cn(CORNER, '-right-0.5 -bottom-0.5 rounded-br-lg border-r-[3px] border-b-[3px]')} />
        </div>
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink-900 text-small text-white" role="status">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          {t('capture.startingCamera')}
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
