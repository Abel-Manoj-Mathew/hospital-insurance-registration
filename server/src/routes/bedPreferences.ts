import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prismaClient.js'
import { asyncHandler, HttpError } from '../lib/errors.js'
import { serializeSession } from '../lib/serialize.js'
import { BED_PREFERENCE_IDS } from '../lib/constants.js'

export const bedPreferencesRouter = Router({ mergeParams: true })

const includeRelations = { documents: true, bedPreferences: true } as const

const bedPreferencesSchema = z.object({
  preferences: z
    .array(z.object({ id: z.enum(BED_PREFERENCE_IDS), rank: z.number().int().min(1).max(BED_PREFERENCE_IDS.length) }))
    .length(BED_PREFERENCE_IDS.length),
  confirmed: z.boolean().optional(),
})

bedPreferencesRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params as { sessionId: string }
    const { preferences, confirmed } = bedPreferencesSchema.parse(req.body)

    const ids = new Set(preferences.map((p) => p.id))
    const ranks = new Set(preferences.map((p) => p.rank))
    if (ids.size !== BED_PREFERENCE_IDS.length || ranks.size !== BED_PREFERENCE_IDS.length) {
      throw new HttpError(400, 'preferences_must_be_a_full_ranking')
    }

    const sessionExists = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true } })
    if (!sessionExists) throw new HttpError(404, 'session_not_found')

    await prisma.$transaction([
      prisma.bedPreference.deleteMany({ where: { sessionId } }),
      prisma.bedPreference.createMany({
        data: preferences.map((p) => ({ sessionId, bedType: p.id, rank: p.rank })),
      }),
      ...(confirmed === undefined
        ? []
        : [prisma.session.update({ where: { id: sessionId }, data: { bedPreferencesConfirmed: confirmed } })]),
    ])

    const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId }, include: includeRelations })
    res.json(serializeSession(session))
  }),
)
