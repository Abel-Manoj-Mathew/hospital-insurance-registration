import { REQUIRED_DOCUMENT_IDS } from '@/utils/documentMeta'
import type { DocumentRecord, DocumentTypeId, LanguageCode, RelationToPatient, SubmissionStatus } from '@/types'

const SATISFIED_STATUSES = new Set(['accepted', 'review_required'])

export function isDocumentSatisfied(record: DocumentRecord | undefined): boolean {
  return !!record && SATISFIED_STATUSES.has(record.status)
}

export function requiredDocumentsSatisfied(documents: Record<DocumentTypeId, DocumentRecord>): boolean {
  return REQUIRED_DOCUMENT_IDS.every((id) => isDocumentSatisfied(documents[id]))
}

export function countSatisfiedRequired(documents: Record<DocumentTypeId, DocumentRecord>): number {
  return REQUIRED_DOCUMENT_IDS.filter((id) => isDocumentSatisfied(documents[id])).length
}

interface ResumeContext {
  language: LanguageCode | null
  contactPhone: string | null
  contactRelation: RelationToPatient | null
  documents: Record<DocumentTypeId, DocumentRecord>
  bedPreferencesConfirmed: boolean
  submissionStatus: SubmissionStatus
}

export function contactInfoComplete(ctx: Pick<ResumeContext, 'contactPhone' | 'contactRelation'>): boolean {
  return !!ctx.contactPhone && !!ctx.contactRelation
}

export function getResumeTarget(ctx: ResumeContext): string {
  if (ctx.submissionStatus === 'submitted') return '/success'
  if (!ctx.language) return '/language'
  if (!contactInfoComplete(ctx)) return '/contact'
  if (!requiredDocumentsSatisfied(ctx.documents)) return '/documents'
  if (!ctx.bedPreferencesConfirmed) return '/preferences'
  return '/review'
}

export function hasSessionProgress(ctx: ResumeContext): boolean {
  return (
    ctx.language !== null ||
    ctx.submissionStatus !== 'idle' ||
    Object.values(ctx.documents).some((d) => d.status !== 'not_uploaded')
  )
}
