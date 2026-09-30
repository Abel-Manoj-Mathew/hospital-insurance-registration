import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prismaClient.js'
import { asyncHandler, HttpError } from '../lib/errors.js'
import { serializeSession } from '../lib/serialize.js'

export const sessionsRouter = Router()

const includeRelations = { documents: true, bedPreferences: true } as const

const createSessionSchema = z.object({
  sessionId: z.string().min(1),
})

sessionsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { sessionId } = createSessionSchema.parse(req.body)

    const session = await prisma.session.upsert({
      where: { id: sessionId },
      update: {},
      create: { id: sessionId },
      include: includeRelations,
    })

    res.status(200).json(serializeSession(session))
  }),
)

sessionsRouter.get(
  '/:sessionId',
  asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId as string
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: includeRelations,
    })
    if (!session) throw new HttpError(404, 'session_not_found')
    res.json(serializeSession(session))
  }),
)

const patchSessionSchema = z.object({
  language: z.enum(['en', 'ml']).optional(),
})

sessionsRouter.patch(
  '/:sessionId',
  asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId as string
    const patch = patchSessionSchema.parse(req.body)

    const existing = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true } })
    if (!existing) throw new HttpError(404, 'session_not_found')

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: patch,
      include: includeRelations,
    })

    res.json(serializeSession(session))
  }),
)
