export const DOCUMENT_TYPE_IDS = [
  'hospitalId',
  'aadhaar',
  'insuranceCard',
  'policyDocument',
  'labReport',
] as const

export type DocumentTypeId = (typeof DOCUMENT_TYPE_IDS)[number]

export const REQUIRED_DOCUMENT_TYPE_IDS: readonly DocumentTypeId[] = [
  'hospitalId',
  'aadhaar',
  'insuranceCard',
]

export const SATISFIED_DOCUMENT_STATUSES = new Set(['accepted', 'review_required'])

export const BED_PREFERENCE_IDS = ['sharing', 'single', 'deluxe', 'superDeluxe'] as const

export type BedPreferenceId = (typeof BED_PREFERENCE_IDS)[number]
