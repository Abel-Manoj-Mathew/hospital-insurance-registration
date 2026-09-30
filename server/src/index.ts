import express from 'express'
import cors from 'cors'
import { sessionsRouter } from './routes/sessions.js'
import { documentsRouter } from './routes/documents.js'
import { bedPreferencesRouter } from './routes/bedPreferences.js'
import { submissionRouter } from './routes/submission.js'
import { errorMiddleware } from './lib/errors.js'

const PORT = Number(process.env.PORT ?? 4000)
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

const app = express()
app.use(cors({ origin: ALLOWED_ORIGIN }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/sessions', sessionsRouter)
app.use('/api/sessions/:sessionId/documents', documentsRouter)
app.use('/api/sessions/:sessionId/bed-preferences', bedPreferencesRouter)
app.use('/api/sessions/:sessionId/submit', submissionRouter)

app.use(errorMiddleware)

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
