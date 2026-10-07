import type { Amala } from '@prisma/client'
import { Router, type Request } from 'express'
import { z } from 'zod'
import { prisma } from '../prismaClient.js'
import { asyncHandler, HttpError } from '../lib/errors.js'
import { encryptAadhaar, decryptAadhaar, maskAadhaar } from '../lib/encryption.js'

export const amalaRouter = Router()

const aadhaarRegex = /^[0-9]{12}$/

const dateSchema = z.union([
  z.date(),
  z.string().transform((val, ctx) => {
    const d = new Date(val)
    if (isNaN(d.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date format',
      })
      return z.NEVER
    }
    return d
  }),
])

const createAmalaSchema = z.object({
  patientName: z.string().trim().min(1, 'Patient name is required'),
  dateOfBirth: dateSchema,
  address: z.string().trim().min(1, 'Address is required'),
  aadhaarNumber: z
    .string()
    .trim()
    .refine((val) => aadhaarRegex.test(val), {
      message: 'Aadhaar number must contain exactly 12 digits.',
    }),
  dateOfAdmission: dateSchema,
  dateOfDischarge: dateSchema.optional().nullable(),
  diagnosis: z.string().trim().min(1, 'Diagnosis is required'),
  packageName: z.string().trim().min(1, 'Package name is required'),
  estimatedCost: z.number().or(z.string().pipe(z.coerce.number())),
})

const updateAmalaSchema = createAmalaSchema.partial()

function isAuthorizedForUnmask(req: Request): boolean {
  const unmaskQuery = req.query.unmask
  const unmaskHeader = req.headers['x-unmask-aadhaar']
  return (
    unmaskQuery === 'true' ||
    unmaskQuery === '1' ||
    (Array.isArray(unmaskQuery) && unmaskQuery.includes('true')) ||
    unmaskHeader === 'true'
  )
}

function processAadhaarOutput(encryptedAadhaar: string | null, isAuthorized: boolean): string | null {
  if (!encryptedAadhaar) return null
  const decrypted = decryptAadhaar(encryptedAadhaar)
  return isAuthorized ? decrypted : maskAadhaar(decrypted)
}

// CREATE Amala record
amalaRouter.post(
  '/',
  asyncHandler(async (req: Request, res) => {
    const parseResult = createAmalaSchema.safeParse(req.body)
    if (!parseResult.success) {
      const aadhaarIssue = parseResult.error.issues.find((i) => i.path.includes('aadhaarNumber'))
      if (aadhaarIssue) {
        throw new HttpError(400, 'Aadhaar number must contain exactly 12 digits.')
      }
      const firstIssue = parseResult.error.issues[0]
      throw new HttpError(400, firstIssue?.message ?? 'Invalid input data')
    }

    const data = parseResult.data
    const encryptedAadhaar = encryptAadhaar(data.aadhaarNumber)

    const record = await prisma.amala.create({
      data: {
        patientName: data.patientName,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        aadhaarNumber: encryptedAadhaar,
        dateOfAdmission: data.dateOfAdmission,
        dateOfDischarge: data.dateOfDischarge ?? null,
        diagnosis: data.diagnosis,
        packageName: data.packageName,
        estimatedCost: data.estimatedCost,
      },
    })

    const isAuthorized = isAuthorizedForUnmask(req)
    res.status(201).json({
      ...record,
      aadhaarNumber: processAadhaarOutput(record.aadhaarNumber, isAuthorized),
    })
  }),
)

// GET list of Amala records
amalaRouter.get(
  '/',
  asyncHandler(async (req: Request, res) => {
    const records = await prisma.amala.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const isAuthorized = isAuthorizedForUnmask(req)
    const result = records.map((record: Amala) => ({
      ...record,
      aadhaarNumber: processAadhaarOutput(record.aadhaarNumber, isAuthorized),
    }))

    res.json(result)
  }),
)

// GET single Amala record by ID
amalaRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res) => {
    const id = req.params.id as string
    const record = await prisma.amala.findUnique({
      where: { id },
    })

    if (!record) {
      throw new HttpError(404, 'Amala record not found')
    }

    const isAuthorized = isAuthorizedForUnmask(req)
    res.json({
      ...record,
      aadhaarNumber: processAadhaarOutput(record.aadhaarNumber, isAuthorized),
    })
  }),
)

// UPDATE Amala record
amalaRouter.put(
  '/:id',
  asyncHandler(async (req: Request, res) => {
    const id = req.params.id as string
    const existing = await prisma.amala.findUnique({ where: { id } })
    if (!existing) throw new HttpError(404, 'Amala record not found')

    const parseResult = updateAmalaSchema.safeParse(req.body)
    if (!parseResult.success) {
      const aadhaarIssue = parseResult.error.issues.find((i) => i.path.includes('aadhaarNumber'))
      if (aadhaarIssue) {
        throw new HttpError(400, 'Aadhaar number must contain exactly 12 digits.')
      }
      const firstIssue = parseResult.error.issues[0]
      throw new HttpError(400, firstIssue?.message ?? 'Invalid input data')
    }

    const data = parseResult.data
    const updateData: Record<string, unknown> = {}

    if (data.patientName !== undefined) updateData.patientName = data.patientName
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth
    if (data.address !== undefined) updateData.address = data.address
    if (data.aadhaarNumber !== undefined) updateData.aadhaarNumber = encryptAadhaar(data.aadhaarNumber)
    if (data.dateOfAdmission !== undefined) updateData.dateOfAdmission = data.dateOfAdmission
    if (data.dateOfDischarge !== undefined) updateData.dateOfDischarge = data.dateOfDischarge ?? null
    if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis
    if (data.packageName !== undefined) updateData.packageName = data.packageName
    if (data.estimatedCost !== undefined) updateData.estimatedCost = data.estimatedCost

    const updated = await prisma.amala.update({
      where: { id },
      data: updateData,
    })

    const isAuthorized = isAuthorizedForUnmask(req)
    res.json({
      ...updated,
      aadhaarNumber: processAadhaarOutput(updated.aadhaarNumber, isAuthorized),
    })
  }),
)

// DELETE Amala record
amalaRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res) => {
    const id = req.params.id as string
    const existing = await prisma.amala.findUnique({ where: { id } })
    if (!existing) throw new HttpError(404, 'Amala record not found')

    await prisma.amala.delete({ where: { id } })
    res.json({ success: true, message: 'Record deleted successfully' })
  }),
)
