import type { DocumentTypeId, ExtractedField } from '@/types'
import { AADHAAR_QR_PREFIX, extractQrLine } from '@/services/ocr/aadhaarQr'
import { isValidAadhaarNumber } from '@/utils/verhoeff'

export interface FieldExtractionResult {
  fields: ExtractedField[]
  /** Whether the field that uniquely identifies this document type was found in the OCR text. */
  primaryFieldFound: boolean
}

const DATE_PATTERN = /\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\b/
// [ \t] rather than \s so a match can't span lines and glue a year onto the next line's digits.
const AADHAAR_PATTERN = /(?<!\d)(\d{4}[ \t]?\d{4}[ \t]?\d{4})(?!\d)/g
const LAB_REPORT_KEYWORD_PATTERN = /\b(?:report|laborator(?:y|ies)|diagnostics?|pathology|specimen|sample)\b/i
const CURRENCY_PATTERN = /(?:RS\.?|INR)\s?([\d,]{4,})/i

const INSURER_NAMES = [
  'Star Health Insurance',
  'Care Health Insurance',
  'HDFC ERGO Health',
  'ICICI Lombard',
  'Niva Bupa',
  'Aditya Birla Health',
  'Bajaj Allianz',
  'National Insurance',
  'New India Assurance',
  'United India Insurance',
]

const TEST_NAMES = [
  'Complete Blood Count',
  'Lipid Profile',
  'Liver Function Test',
  'Thyroid Profile',
  'HbA1c',
  'Kidney Function Test',
  'Blood Sugar',
  'Urine Routine',
]

/**
 * Finds the value following a label. The value must contain a digit so that
 * ordinary prose after the label word ("policy covers hospitalization…") is
 * never mistaken for an identifier.
 */
function matchLabelled(text: string, labelPattern: string): string | undefined {
  const pattern = new RegExp(`\\b(?:${labelPattern})(?![A-Za-z])[:\\s#-]*([A-Z0-9][A-Z0-9\\-/ ]{3,25})`, 'gi')
  for (const match of text.matchAll(pattern)) {
    const value = match[1]?.trim().replace(/\s{2,}/g, ' ')
    if (value && /\d/.test(value)) return value
  }
  return undefined
}

function matchFromList(text: string, candidates: readonly string[]): string | undefined {
  const upperText = text.toUpperCase()
  return candidates.find((candidate) => upperText.includes(candidate.toUpperCase()))
}

function matchName(text: string): string | undefined {
  // Same-line only ([ \t], not \s) so the name can't run on into the next line's label.
  const match = /\bNAME\b[ \t]*[:\-]?[ \t]*([A-Z][A-Za-z.' \t]{2,40})/i.exec(text)
  if (!match) return undefined
  return match[1].trim().split(/\s{2,}/)[0]
}

const INSTITUTION_WORDS =
  /\b(?:CITY|MEDICAL|CENTER|CENTRE|HOSPITAL|EMERGENCY|ROOM|GOVERNMENT|DEPARTMENT|INFORMATION|DESK|SECURITY|VERIFIED|WARD|PRIMARY|GENERAL|PATIENT|IF|FOUND|PLEASE|RETURN|CARD|IDENTITY|INSURANCE|HEALTH|CLINIC|DATE|ADMISSION|GENDER|MALE|FEMALE|OF|BIRTH|DOB|ID|NO)\b/i

/** A line that looks like a person's name: 2–4 alphabetic words (initials allowed), no institution/label words. */
function isPersonNameLine(line: string): boolean {
  const cleaned = line.trim()
  if (!/^[A-Za-z][A-Za-z.' ]{3,40}$/.test(cleaned) || INSTITUTION_WORDS.test(cleaned)) return false
  const words = cleaned.split(/\s+/)
  return words.length >= 2 && words.length <= 4 && words.some((word) => word.replace(/\./g, '').length > 2)
}

/**
 * Cards without a "Name:" label (e.g. hospital patient IDs) print the name on its own line next to the
 * ID/DOB lines. Prefers the nearest name-like line above the first of those anchor lines.
 */
function matchUnlabelledName(text: string): string | undefined {
  const lines = text.split(/\r?\n/)
  const anchor = lines.findIndex((line) => /\b(?:PATIENT\s*ID|ID\s*(?:NO|NUMBER)|UHID|MRN|DOB|DATE\s+OF\s+BIRTH)\b/i.test(line))
  const above = anchor > 0 ? lines.slice(0, anchor).reverse() : []
  return [...above, ...lines].find(isPersonNameLine)?.trim()
}

/** Keeps only Latin letters and name punctuation; OCR of bilingual cards adds Malayalam/Hindi glyphs and symbols. */
function cleanNameLine(line: string): string {
  return line.replace(/[^A-Za-z.\s]/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

function isPlausibleName(candidate: string): boolean {
  const words = candidate.split(' ').filter((word) => word.length > 1)
  return candidate.length >= 3 && words.length >= 1 && !/GOVERNMENT|INDIA|AADHAAR|MALE|FEMALE|BIRTH|DOB|UNIQUE|AUTHORITY/i.test(candidate)
}

/**
 * Aadhaar's front has no "Name" label: the English name is the last plausible line above the
 * "DOB" / "Year of Birth" line (the line above that is usually the regional-language name).
 */
function matchAadhaarName(text: string): string | undefined {
  const lines = text.split(/\r?\n/)
  const dobIndex = lines.findIndex((line) => /\b(?:DOB|D\.O\.B|DATE\s+OF\s+BIRTH|YEAR\s+OF\s+BIRTH|YOB)\b/i.test(line) || DATE_PATTERN.test(line))
  const candidates = dobIndex > 0 ? lines.slice(0, dobIndex).reverse() : lines
  for (const line of candidates) {
    const cleaned = cleanNameLine(line)
    if (isPlausibleName(cleaned)) return cleaned
  }
  return matchName(text)
}

const SHORT_ADDRESS_WORDS = new Set(['P', 'O', 'PO', 'S/O', 'D/O', 'W/O', 'C/O'])

function isAddressToken(token: string): boolean {
  const core = token.replace(/^[,.\-:;()]+|[,.\-:;()]+$/g, '')
  if (core.length === 0) return false
  if (SHORT_ADDRESS_WORDS.has(core.toUpperCase())) return true
  // Lone digits and 1–2 letter fragments ("NG", "AE", "of", "4") are QR/scan noise; real house
  // numbers have 2+ digits or a slash ("12/34").
  if (core.length <= 2) return false
  if (/^\d{2,6}([/-]\w+)*$/.test(core)) return true
  const wordChars = core.replace(/[^A-Za-z0-9]/g, '').length
  if (wordChars / core.length < 0.8) return false
  if (core.length > 3 && /[A-Za-z]/.test(core) && !/[AEIOUYaeiouy]/.test(core)) return false
  if (/[a-z][A-Z].*[a-z][A-Z]/.test(core)) return false
  return true
}

/** Drops noise tokens, but keeps a comma that trailed a dropped token so the address stays comma-separated. */
function cleanAddressTokens(raw: string): string {
  const kept: string[] = []
  for (const token of raw.split(/\s+/)) {
    if (token === '-' && kept.length > 0) {
      kept.push(token)
    } else if (isAddressToken(token)) {
      kept.push(token)
    } else if (token.endsWith(',') && kept.length > 0 && !kept[kept.length - 1].endsWith(',')) {
      kept[kept.length - 1] += ','
    }
  }
  return kept.join(' ')
}

/**
 * Aadhaar's back side prints the address as "S/O: Name, House, Place, District, State - PIN" (OCR often
 * misreads the "S/O" as "5/0" or "Fgh 5/0", and may lose the "Address" label), ending at the 6-digit PIN.
 */
function matchAddress(text: string): string | undefined {
  // The appended QR payload is not card text and must never leak into the address.
  const flat = text
    .split(/\r?\n/)
    .filter((line) => !line.startsWith(AADHAAR_QR_PREFIX))
    .join(' ')
  const relation = /\b([CSDW5])\s?[/|]\s?[O0]\b\s*[:;.]?\s*/i.exec(flat)
  const label = /ADD?RESS\s*[:;.\-]?\s*/i.exec(flat)
  const start = label ?? relation
  if (!start) return undefined
  const body = /^(.{10,250}?\b\d{3}\s?\d{3})(?!\d)/.exec(flat.slice(start.index + start[0].length))?.[1]
  if (!body) return undefined
  const cleaned = cleanAddressTokens(body.replace(/[^\x20-\x7E]+/g, ' '))
    .replace(/\s*,\s*/g, ', ')
    .replace(/,\s*-/g, ' -')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,\s]+/, '')
    .trim()
  // Re-attach the relation prefix when the address started at "S/O" rather than at an "Address" label.
  const prefix = !label && relation ? `${relation[1].toUpperCase().replace('5', 'S')}/O: ` : ''
  return `${prefix}${cleaned}`
}

/** Prefers a 12-digit number that passes the Aadhaar checksum; falls back to the first candidate, unverified. */
function matchAadhaarNumber(text: string): { value: string; verified: boolean } | undefined {
  const candidates = [...text.matchAll(AADHAAR_PATTERN)].map((match) => match[1])
  const verified = candidates.find((candidate) => isValidAadhaarNumber(candidate.replace(/\s/g, '')))
  if (verified) return { value: verified, verified: true }
  return candidates[0] ? { value: candidates[0], verified: false } : undefined
}

export function hasVerifiedAadhaarNumber(text: string): boolean {
  return matchAadhaarNumber(text)?.verified === true
}

function field(labelKey: string, value: string | undefined): ExtractedField | undefined {
  return value ? { labelKey, value } : undefined
}

export function extractFieldsForDocument(documentType: DocumentTypeId, ocrText: string): FieldExtractionResult {
  const fields: ExtractedField[] = []
  let primaryFieldFound = false

  switch (documentType) {
    case 'hospitalId': {
      const idNumber = matchLabelled(ocrText, '(?:ID|NO|NUMBER)')
      const name = matchName(ocrText) ?? matchUnlabelledName(ocrText)
      fields.push(...([field('fields.patientName', name), field('fields.hospitalIdNumber', idNumber)].filter(Boolean) as ExtractedField[]))
      primaryFieldFound = Boolean(idNumber)
      break
    }
    case 'aadhaar': {
      // The card's QR code carries the exact name/DOB/address, so it beats OCR whenever it was readable.
      const qr = extractQrLine(ocrText)
      const aadhaarNumber = matchAadhaarNumber(ocrText)
      const name = qr?.name ?? matchAadhaarName(ocrText)
      const dob = qr?.dateOfBirth ?? DATE_PATTERN.exec(ocrText)?.[1]
      const address = qr?.address ?? matchAddress(ocrText)
      fields.push(
        ...([
          field('fields.aadhaarName', name),
          field('fields.dateOfBirth', dob),
          field('fields.address', address),
          field('fields.aadhaarNumber', aadhaarNumber?.value),
        ].filter(Boolean) as ExtractedField[]),
      )
      // An unverified number (failed checksum) is shown for correction but sends the document to review.
      primaryFieldFound = Boolean(aadhaarNumber?.verified)
      break
    }
    case 'insuranceCard': {
      // Labels differ by insurer: member/card/beneficiary/enrolment IDs, policy numbers, "MEDISEP ID NO".
      const memberId =
        matchLabelled(ocrText, 'MEMBER\\s*(?:ID|NO\\.?|NUMBER)?') ??
        matchLabelled(ocrText, 'CARD\\s*(?:NO\\.?|NUMBER)') ??
        matchLabelled(ocrText, 'POLICY\\s*(?:NO\\.?|NUMBER)?') ??
        matchLabelled(ocrText, '(?:BENEFICIARY|ENROL+MENT|UHID|HEALTH)\\s*(?:ID|NO\\.?|NUMBER)') ??
        matchLabelled(ocrText, '(?:[A-Z]+\\s+)?ID\\s*NO\\.?')
      const name = matchName(ocrText)
      fields.push(...([field('fields.insuranceName', name), field('fields.memberId', memberId)].filter(Boolean) as ExtractedField[]))
      primaryFieldFound = Boolean(memberId)
      break
    }
    case 'policyDocument': {
      const policyNumber = matchLabelled(ocrText, 'POLICY\\s*(?:NO\\.?|NUMBER)?')
      const insurerName = matchFromList(ocrText, INSURER_NAMES)
      const sumInsured = CURRENCY_PATTERN.exec(ocrText)?.[1]
      fields.push(
        ...([
          field('fields.insurerName', insurerName),
          field('fields.policyNumber', policyNumber),
          field('fields.sumInsured', sumInsured ? `Rs. ${sumInsured}` : undefined),
        ].filter(Boolean) as ExtractedField[]),
      )
      primaryFieldFound = Boolean(policyNumber)
      break
    }
    case 'labReport': {
      const testName = matchFromList(ocrText, TEST_NAMES)
      const reportDate = DATE_PATTERN.exec(ocrText)?.[1]
      const name = matchName(ocrText)
      fields.push(
        ...([field('fields.testName', testName), field('fields.reportDate', reportDate), field('fields.patientName', name)].filter(
          Boolean,
        ) as ExtractedField[]),
      )
      // A bare date is too common to identify a lab report; require a test name or lab wording alongside it.
      primaryFieldFound = Boolean(testName || (reportDate && LAB_REPORT_KEYWORD_PATTERN.test(ocrText)))
      break
    }
    default:
      break
  }

  return { fields, primaryFieldFound }
}
