import express from 'express'
import cors from 'cors'
import { sessionsRouter } from './routes/sessions.js'
import { documentsRouter } from './routes/documents.js'
import { bedPreferencesRouter } from './routes/bedPreferences.js'
import { submissionRouter } from './routes/submission.js'
import { ocrRouter } from './routes/ocr.js'
import { amalaRouter } from './routes/amala.js'
import { errorMiddleware } from './lib/errors.js'

const PORT = Number(process.env.PORT ?? 4000)
const ALLOWED_ORIGIN = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,*').split(',').map((origin) => origin.trim())

const app = express()
app.use(cors({ origin: ALLOWED_ORIGIN.includes('*') ? true : ALLOWED_ORIGIN }))
// Card photos are far bigger than the 1mb default, so the OCR route gets its own parser, mounted first.
app.use('/api/ocr', express.json({ limit: '12mb' }), ocrRouter)
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/sessions', sessionsRouter)
app.use('/api/sessions/:sessionId/documents', documentsRouter)
app.use('/api/sessions/:sessionId/bed-preferences', bedPreferencesRouter)
app.use('/api/sessions/:sessionId/submit', submissionRouter)
app.use('/api/amala', amalaRouter)

app.use(errorMiddleware)

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
