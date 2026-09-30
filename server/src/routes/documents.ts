import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prismaClient.js'
import { asyncHandler, HttpError } from '../lib/errors.js'
import { serializeSession } from '../lib/serialize.js'
import { DOCUMENT_TYPE_IDS } from '../lib/constants.js'

export const documentsRouter = Router({ mergeParams: true })

const includeRelations = { documents: true, bedPreferences: true } as const

const documentPatchSchema = z.object({
  status: z.enum(['not_uploaded', 'processing', 'accepted', 'retake_required', 'review_required', 'failed']),
  captureMethod: z.enum(['camera', 'upload']).optional(),
  capturedAt: z.string().datetime().optional(),
  rejection: z.object({ reasonKey: z.string(), detailKey: z.string().optional() }).optional(),
  extractedFields: z.array(z.object({ labelKey: z.string(), value: z.string() })).optional(),
  documentReference: z.string().optional(),
})

documentsRouter.put(
  '/:documentType',
  asyncHandler(async (req, res) => {
    const { sessionId, documentType } = req.params as { sessionId: string; documentType: string }
    if (!DOCUMENT_TYPE_IDS.includes(documentType as (typeof DOCUMENT_TYPE_IDS)[number])) {
      throw new HttpError(400, 'invalid_document_type')
    }

    const patch = documentPatchSchema.parse(req.body)

    const sessionExists = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true } })
    if (!sessionExists) throw new HttpError(404, 'session_not_found')

    const data = {
      status: patch.status,
      captureMethod: patch.captureMethod,
      capturedAt: patch.capturedAt ? new Date(patch.capturedAt) : undefined,
      rejectionReasonKey: patch.rejection?.reasonKey ?? null,
      rejectionDetailKey: patch.rejection?.detailKey ?? null,
      extractedFields: patch.extractedFields ?? undefined,
      documentReference: patch.documentReference ?? null,
    }

    await prisma.document.upsert({
      where: { sessionId_documentType: { sessionId, documentType: documentType as never } },
      create: { sessionId, documentType: documentType as never, version: 1, ...data },
      update: { version: { increment: 1 }, ...data },
    })

    const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId }, include: includeRelations })
    res.json(serializeSession(session))
  }),
)
