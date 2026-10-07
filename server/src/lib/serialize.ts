import type { Prisma } from '@prisma/client'
import { BED_PREFERENCE_IDS, DOCUMENT_TYPE_IDS } from './constants.js'
import { maskAadhaar } from './encryption.js'

type SessionWithRelations = Prisma.SessionGetPayload<{
  include: { documents: true; bedPreferences: true }
}>

export function serializeSession(session: SessionWithRelations) {
  const documentsByType = new Map(session.documents.map((doc) => [doc.documentType, doc]))

  const documents = Object.fromEntries(
    DOCUMENT_TYPE_IDS.map((type) => {
      const record = documentsByType.get(type)
      let extractedFields = record?.extractedFields as Array<{labelKey: string, value: string}> | undefined
      if (extractedFields) {
        extractedFields = extractedFields.map(f => 
          f.labelKey === 'fields.aadhaarNumber' ? { ...f, value: maskAadhaar(f.value) } : f
        )
      }

      return [
        type,
        record
          ? {
              documentType: record.documentType,
              status: record.status,
              captureMethod: record.captureMethod ?? undefined,
              version: record.version,
              capturedAt: record.capturedAt?.toISOString(),
              rejection: record.rejectionReasonKey
                ? { reasonKey: record.rejectionReasonKey, detailKey: record.rejectionDetailKey ?? undefined }
                : undefined,
              extractedFields: extractedFields ?? undefined,
              documentReference: record.documentReference ?? undefined,
            }
          : { documentType: type, status: 'not_uploaded' as const, version: 0 },
      ]
    }),
  )

  const bedPreferencesByType = new Map(session.bedPreferences.map((pref) => [pref.bedType, pref.rank]))
  const bedPreferences = BED_PREFERENCE_IDS.map((id, index) => ({
    id,
    rank: bedPreferencesByType.get(id) ?? index + 1,
  })).sort((a, b) => a.rank - b.rank)

  return {
    sessionId: session.id,
    createdAt: session.createdAt.toISOString(),
    language: session.language ?? null,
    contactPhone: session.contactPhone ?? null,
    contactRelation: session.contactRelation ?? null,
    documents,
    bedPreferences,
    bedPreferencesConfirmed: session.bedPreferencesConfirmed,
    submissionStatus: session.submissionStatus,
    submissionResult: session.submissionReferenceId
      ? { referenceId: session.submissionReferenceId, submittedAt: session.submittedAt?.toISOString() }
      : null,
  }
}
