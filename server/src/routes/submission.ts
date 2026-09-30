import { randomInt } from 'node:crypto'
import { Router } from 'express'
import { prisma } from '../prismaClient.js'
import { asyncHandler, HttpError } from '../lib/errors.js'
import { REQUIRED_DOCUMENT_TYPE_IDS, SATISFIED_DOCUMENT_STATUSES } from '../lib/constants.js'

export const submissionRouter = Router({ mergeParams: true })

submissionRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params as { sessionId: string }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { documents: true, bedPreferences: true },
    })
    if (!session) throw new HttpError(404, 'session_not_found')

    if (session.submissionStatus === 'submitted' && session.submissionReferenceId) {
      res.json({ referenceId: session.submissionReferenceId, submittedAt: session.submittedAt?.toISOString() })
      return
    }

    if (!session.language) throw new HttpError(422, 'language_not_selected')

    const satisfiedTypes = new Set(
      session.documents.filter((doc) => SATISFIED_DOCUMENT_STATUSES.has(doc.status)).map((doc) => doc.documentType),
    )
    const missingRequired = REQUIRED_DOCUMENT_TYPE_IDS.filter((type) => !satisfiedTypes.has(type))
    if (missingRequired.length > 0) throw new HttpError(422, `missing_required_documents:${missingRequired.join(',')}`)

    if (!session.bedPreferencesConfirmed) throw new HttpError(422, 'bed_preferences_not_confirmed')

    const referenceId = `HSP-${randomInt(100_000, 999_999)}`
    const submittedAt = new Date()

    await prisma.session.update({
      where: { id: sessionId },
      data: { submissionStatus: 'submitted', submissionReferenceId: referenceId, submittedAt },
    })

    res.json({ referenceId, submittedAt: submittedAt.toISOString() })
  }),
)
