import type { LucideIcon } from 'lucide-react'
import { CreditCard, FileText, Fingerprint, FlaskConical } from 'lucide-react'
import type { DocumentRequirement, DocumentTypeId } from '@/types'

export type CaptureFrame = 'card' | 'page'

export interface DocumentMeta {
  id: DocumentTypeId
  requirement: DocumentRequirement
  icon: LucideIcon
  titleKey: string
  descriptionKey: string
  captureFrame: CaptureFrame
  allowCamera: boolean
  allowUpload: boolean
  /** Needs both a front and a back capture (e.g. Aadhaar, whose address is on the back). */
  requiresBackSide?: boolean
  /**
   * The fields this document always shows on the Review page, in order — even when OCR didn't find
   * one, so staff can see it's missing and the patient can fill it in by hand.
   */
  reviewFieldKeys?: string[]
}

export const DOCUMENT_CHECKLIST: DocumentMeta[] = [
  {
    id: 'aadhaar',
    requirement: 'required',
    icon: Fingerprint,
    titleKey: 'documents.items.aadhaar.title',
    descriptionKey: 'documents.items.aadhaar.description',
    captureFrame: 'card',
    allowCamera: true,
    allowUpload: true,
    requiresBackSide: true,
    reviewFieldKeys: ['fields.aadhaarName', 'fields.dateOfBirth', 'fields.address', 'fields.aadhaarNumber'],
  },
  {
    id: 'insuranceCard',
    requirement: 'required',
    icon: CreditCard,
    titleKey: 'documents.items.insuranceCard.title',
    descriptionKey: 'documents.items.insuranceCard.description',
    captureFrame: 'card',
    allowCamera: true,
    allowUpload: true,
    reviewFieldKeys: ['fields.insuranceName', 'fields.memberId', 'fields.medisepId'],
  },
  {
    id: 'policyDocument',
    requirement: 'optional',
    icon: FileText,
    titleKey: 'documents.items.policyDocument.title',
    descriptionKey: 'documents.items.policyDocument.description',
    captureFrame: 'page',
    allowCamera: true,
    allowUpload: true,
  },
  {
    id: 'labReport',
    requirement: 'optional',
    icon: FlaskConical,
    titleKey: 'documents.items.labReport.title',
    descriptionKey: 'documents.items.labReport.description',
    captureFrame: 'page',
    allowCamera: true,
    allowUpload: true,
  },
]

export const DOCUMENT_META_BY_ID: Record<DocumentTypeId, DocumentMeta> = Object.fromEntries(
  DOCUMENT_CHECKLIST.map((doc) => [doc.id, doc]),
) as Record<DocumentTypeId, DocumentMeta>

export const REQUIRED_DOCUMENTS: DocumentMeta[] = DOCUMENT_CHECKLIST.filter((doc) => doc.requirement === 'required')
export const OPTIONAL_DOCUMENTS: DocumentMeta[] = DOCUMENT_CHECKLIST.filter((doc) => doc.requirement === 'optional')

// TEMP: not enforced while testing on a phone without these documents. Empty this set before release.
const TEMP_UNENFORCED_REQUIRED_IDS = new Set<DocumentTypeId>(['insuranceCard'])

export const REQUIRED_DOCUMENT_IDS: DocumentTypeId[] = REQUIRED_DOCUMENTS.map((doc) => doc.id).filter(
  (id) => !TEMP_UNENFORCED_REQUIRED_IDS.has(id),
)
