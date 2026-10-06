export type LanguageCode = 'en' | 'ml'

export type RelationToPatient = 'self' | 'spouse' | 'parent' | 'child' | 'sibling' | 'relative' | 'other'

export type DocumentTypeId =
  | 'hospitalId'
  | 'aadhaar'
  | 'insuranceCard'
  | 'policyDocument'
  | 'labReport'

export type DocumentRequirement = 'required' | 'optional'

export type CaptureMethod = 'camera' | 'upload'

export interface CapturedFile {
  dataUrl: string
  sizeBytes: number
  mimeType: string
  captureMethod: CaptureMethod
  fileName?: string
}

export type DocumentSide = 'front' | 'back'

/** The OCR'd front side of a two-sided document, carried forward while the back side is captured. */
export interface CapturedSideResult {
  dataUrl: string
  captureMethod: CaptureMethod
  ocrText: string
  confidence: number
}

export type DocumentStatus =
  | 'not_uploaded'
  | 'processing'
  | 'accepted'
  | 'retake_required'
  | 'review_required'
  | 'failed'

export interface DocumentRejection {
  reasonKey: string
  detailKey?: string
}

export interface ExtractedField {
  labelKey: string
  value: string
}

export interface DocumentRecord {
  documentType: DocumentTypeId
  status: DocumentStatus
  captureMethod?: CaptureMethod
  previewDataUrl?: string
  version: number
  capturedAt?: string
  rejection?: DocumentRejection
  extractedFields?: ExtractedField[]
  documentReference?: string
}

export type BedPreferenceId = 'sharing' | 'single' | 'deluxe' | 'superDeluxe'

export interface BedPreferenceRecord {
  id: BedPreferenceId
  rank: number
}

export type SubmissionStatus = 'idle' | 'submitting' | 'submitted' | 'failed'

export interface SubmissionResult {
  referenceId: string
  submittedAt: string
}

export interface SessionState {
  sessionId: string | null
  createdAt: string | null
  language: LanguageCode | null
  contactPhone: string | null
  contactRelation: RelationToPatient | null
  documents: Record<DocumentTypeId, DocumentRecord>
  bedPreferences: BedPreferenceRecord[]
  submissionStatus: SubmissionStatus
  submissionResult: SubmissionResult | null
}
