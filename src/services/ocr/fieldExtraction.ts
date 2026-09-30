import type { DocumentTypeId, ExtractedField } from '@/types'

export interface FieldExtractionResult {
  fields: ExtractedField[]
  /** Whether the field that uniquely identifies this document type was found in the OCR text. */
  primaryFieldFound: boolean
}

const DATE_PATTERN = /\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\b/
// [ \t] rather than \s so a match can't span lines and glue a year onto the next line's digits.
const AADHAAR_PATTERN = /(?<!\d)(\d{4}[ \t]?\d{4}[ \t]?\d{4})(?!\d)/
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
  const match = /NAME[:\s]*([A-Z][A-Za-z.\s]{2,40})/i.exec(text)
  if (!match) return undefined
  return match[1].trim().split(/\s{2,}|\n/)[0]
}

function matchGender(text: string): string | undefined {
  if (/\bFEMALE\b/i.test(text)) return 'Female'
  if (/\bMALE\b/i.test(text)) return 'Male'
  return undefined
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
      const name = matchName(ocrText)
      const dob = DATE_PATTERN.exec(ocrText)?.[1]
      fields.push(...([field('fields.hospitalIdNumber', idNumber), field('fields.patientName', name), field('fields.dateOfBirth', dob)].filter(Boolean) as ExtractedField[]))
      primaryFieldFound = Boolean(idNumber)
      break
    }
    case 'aadhaar': {
      const aadhaarNumber = AADHAAR_PATTERN.exec(ocrText)?.[1]
      const name = matchName(ocrText)
      const dob = DATE_PATTERN.exec(ocrText)?.[1]
      const gender = matchGender(ocrText)
      fields.push(
        ...([
          field('fields.aadhaarNumber', aadhaarNumber),
          field('fields.patientName', name),
          field('fields.dateOfBirth', dob),
          field('fields.gender', gender),
        ].filter(Boolean) as ExtractedField[]),
      )
      primaryFieldFound = Boolean(aadhaarNumber)
      break
    }
    case 'insuranceCard': {
      const policyNumber = matchLabelled(ocrText, 'POLICY\\s*(?:NO\\.?|NUMBER)?')
      const memberId = matchLabelled(ocrText, 'MEMBER\\s*(?:ID)?')
      const insurerName = matchFromList(ocrText, INSURER_NAMES)
      const name = matchName(ocrText)
      fields.push(
        ...([
          field('fields.insurerName', insurerName),
          field('fields.policyNumber', policyNumber),
          field('fields.memberId', memberId),
          field('fields.patientName', name),
        ].filter(Boolean) as ExtractedField[]),
      )
      primaryFieldFound = Boolean(policyNumber || memberId)
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
