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
    if (!val || val.trim() === '') return undefined
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

const optionalDateSchema = dateSchema.optional().nullable()

const createAmalaSchema = z.object({
  patientName: z.string().trim().min(1, 'Patient name is required'),
  dateOfBirth: optionalDateSchema,
  address: z.string().trim().optional().nullable(),
  aadhaarNumber: z
    .string()
    .trim()
    .refine((val) => !val || aadhaarRegex.test(val), {
      message: 'Aadhaar number must contain exactly 12 digits.',
    })
    .optional()
    .nullable(),
  department: z.string().trim().optional().nullable(),
  policyId: z.string().trim().optional().nullable(),
  medisepId: z.string().trim().optional().nullable(),
  caseId: z.string().trim().optional().nullable(),
  roomDays: z.number().or(z.string().pipe(z.coerce.number())).optional().nullable(),
  proposedLineOfTreatment: z.string().trim().optional().nullable(),
  investigationDetails: z.string().trim().optional().nullable(),
  treatingDoctorName: z.string().trim().optional().nullable(),
  dateOfAdmission: optionalDateSchema,
  dateOfDischarge: optionalDateSchema,
  diagnosis: z.string().trim().optional().nullable(),
  packageName: z.string().trim().optional().nullable(),
  estimatedCost: z.number().or(z.string().pipe(z.coerce.number())).optional().nullable(),
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
    const encryptedAadhaar = data.aadhaarNumber ? encryptAadhaar(data.aadhaarNumber) : null

    const record = await prisma.amala.create({
      data: {
        patientName: data.patientName,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        aadhaarNumber: encryptedAadhaar,
        department: data.department ?? null,
        policyId: data.policyId ?? null,
        medisepId: data.medisepId ?? null,
        caseId: data.caseId ?? null,
        roomDays: data.roomDays ?? null,
        proposedLineOfTreatment: data.proposedLineOfTreatment ?? null,
        investigationDetails: data.investigationDetails ?? null,
        treatingDoctorName: data.treatingDoctorName ?? null,
        dateOfAdmission: data.dateOfAdmission ?? null,
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
    if (data.aadhaarNumber !== undefined) updateData.aadhaarNumber = data.aadhaarNumber ? encryptAadhaar(data.aadhaarNumber) : null
    if (data.department !== undefined) updateData.department = data.department ?? null
    if (data.policyId !== undefined) updateData.policyId = data.policyId ?? null
    if (data.medisepId !== undefined) updateData.medisepId = data.medisepId ?? null
    if (data.caseId !== undefined) updateData.caseId = data.caseId ?? null
    if (data.roomDays !== undefined) updateData.roomDays = data.roomDays ?? null
    if (data.proposedLineOfTreatment !== undefined) updateData.proposedLineOfTreatment = data.proposedLineOfTreatment ?? null
    if (data.investigationDetails !== undefined) updateData.investigationDetails = data.investigationDetails ?? null
    if (data.treatingDoctorName !== undefined) updateData.treatingDoctorName = data.treatingDoctorName ?? null
    if (data.dateOfAdmission !== undefined) updateData.dateOfAdmission = data.dateOfAdmission ?? null
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
