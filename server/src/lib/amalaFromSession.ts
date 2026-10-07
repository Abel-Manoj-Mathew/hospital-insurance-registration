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

/**
 * The patient-owned columns of an Amala row, built from their Aadhaar document's extracted fields
 * (including any corrections they made on the review page). The Aadhaar number is stored encrypted,
 * and only when it is a clean 12-digit number.
 */
export function amalaDataFromAadhaarFields(json: Prisma.JsonValue | null) {
  const fields = parseFields(json)
  const digits = fieldValue(fields, 'fields.aadhaarNumber')?.replace(/\s/g, '')
  return {
    patientName: fieldValue(fields, 'fields.aadhaarName') ?? null,
    address: fieldValue(fields, 'fields.address') ?? null,
    aadhaarNumber: digits && /^[0-9]{12}$/.test(digits) ? encryptAadhaar(digits) : null,
    dateOfBirth: null as Date | null,
    yearOfBirth: null as number | null,
    ...parseDateOfBirth(fieldValue(fields, 'fields.dateOfBirth')),
  }
}
