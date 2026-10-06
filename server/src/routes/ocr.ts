import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prismaClient.js'
import { asyncHandler, HttpError } from '../lib/errors.js'

export const ocrRouter = Router()

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL ?? 'http://127.0.0.1:8001'
const OCR_TIMEOUT_MS = 60_000

const bodySchema = z.object({
  sessionId: z.string().min(1),
  image: z.string().min(100),
})

// Proxies a card photo to the PaddleOCR microservice. Requires an existing session so the endpoint
// can't be used as an anonymous OCR service. The image is processed in memory and never stored.
ocrRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { sessionId, image } = bodySchema.parse(req.body)
    const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true } })
    if (!session) throw new HttpError(404, 'session_not_found')

    let response: Response
    try {
      response = await fetch(`${OCR_SERVICE_URL}/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
        signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
      })
    } catch {
      throw new HttpError(502, 'ocr_service_unavailable')
    }
    if (!response.ok) throw new HttpError(502, 'ocr_service_error')

    const { text, confidence } = (await response.json()) as { text: string; confidence: number }
    // Dev-only: lets us see what the OCR read when tuning field extraction. Contains personal data.
    if (process.env.NODE_ENV !== 'production') console.log(`[ocr] confidence=${confidence}
${text}
[/ocr]`)
    res.json({ text, confidence })
  }),
)
