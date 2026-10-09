import type { Prisma } from '@prisma/client'
import { encryptAadhaar } from './encryption.js'

interface ExtractedField {
  labelKey: string
  value: string
}

function fieldValue(fields: ExtractedField[], labelKey: string): string | undefined {
  const value = fields.find((field) => field.labelKey === labelKey)?.value.trim()
  return value || undefined
}

/** Reads the extracted-fields JSON saved on a document row; anything malformed counts as no fields. */
function parseFields(json: Prisma.JsonValue | null): ExtractedField[] {
  if (!Array.isArray(json)) return []
  return json.filter(
    (entry): entry is { labelKey: string; value: string } =>
      typeof entry === 'object' && entry !== null && !Array.isArray(entry) && typeof entry.labelKey === 'string' && typeof entry.value === 'string',
  )
}

/** Aadhaar prints either a full date (DD/MM/YYYY) or just a year of birth. */
export function parseDateOfBirth(value: string | undefined): { dateOfBirth?: Date; yearOfBirth?: number } {
  if (!value) return {}
  const yearOnly = /^(\d{4})$/.exec(value)
  if (yearOnly) return { yearOfBirth: Number(yearOnly[1]) }

  const full = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(value)
  if (!full) return {}
  const [, dayText = '', monthText = '', yearText = ''] = full
  const day = Number(dayText)
  const month = Number(monthText)
  const year = yearText.length === 2 ? 1900 + Number(yearText) : Number(yearText)
  const date = new Date(Date.UTC(year, month - 1, day))
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return valid ? { dateOfBirth: date, yearOfBirth: year } : {}
}

export interface DocumentWithFields {
  documentType: string
  extractedFields: Prisma.JsonValue | null
}

/**
 * The patient-owned columns of an Amala row, built from session documents' extracted fields
 * (Aadhaar fields + Insurance member ID / policy number stored in policyId).
 */
export function amalaDataFromSession(documents: DocumentWithFields[]) {
  const aadhaarDoc = documents.find((doc) => doc.documentType === 'aadhaar')
  const insuranceDoc = documents.find((doc) => doc.documentType === 'insuranceCard')
  const policyDoc = documents.find((doc) => doc.documentType === 'policyDocument')

  const aadhaarFields = parseFields(aadhaarDoc?.extractedFields ?? null)
  const insuranceFields = parseFields(insuranceDoc?.extractedFields ?? null)
  const policyFields = parseFields(policyDoc?.extractedFields ?? null)

  const digits = fieldValue(aadhaarFields, 'fields.aadhaarNumber')?.replace(/\s/g, '')
  const memberId = fieldValue(insuranceFields, 'fields.memberId') ?? fieldValue(policyFields, 'fields.policyNumber') ?? null
  const medisepId = fieldValue(insuranceFields, 'fields.medisepId') ?? fieldValue(policyFields, 'fields.medisepId') ?? null

  return {
    patientName: fieldValue(aadhaarFields, 'fields.aadhaarName') ?? null,
    address: fieldValue(aadhaarFields, 'fields.address') ?? null,
    aadhaarNumber: digits ? (digits.includes(':') ? digits : (/^[0-9]{12}$/.test(digits) ? encryptAadhaar(digits) : null)) : null,
    policyId: memberId,
    medisepId: medisepId,
    dateOfBirth: null as Date | null,
    yearOfBirth: null as number | null,
    ...parseDateOfBirth(fieldValue(aadhaarFields, 'fields.dateOfBirth')),
  }
}

/** Legacy helper wrapping Aadhaar-only fields */
export function amalaDataFromAadhaarFields(json: Prisma.JsonValue | null) {
  return amalaDataFromSession([{ documentType: 'aadhaar', extractedFields: json }])
}

