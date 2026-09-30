import type { BedPreferenceRecord, DocumentRecord, DocumentTypeId, LanguageCode } from '@/types'
import { apiRequest } from './httpClient'

export async function registerSession(sessionId: string): Promise<void> {
  await apiRequest('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export async function syncSessionLanguage(sessionId: string, language: LanguageCode): Promise<void> {
  await apiRequest(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ language }),
  })
}

export async function syncDocumentResult(
  sessionId: string,
  documentType: DocumentTypeId,
  record: Pick<DocumentRecord, 'status' | 'captureMethod' | 'capturedAt' | 'rejection' | 'extractedFields' | 'documentReference'>,
): Promise<void> {
  await apiRequest(`/api/sessions/${sessionId}/documents/${documentType}`, {
    method: 'PUT',
    body: JSON.stringify(record),
  })
}

export async function syncBedPreferences(
  sessionId: string,
  preferences: BedPreferenceRecord[],
  confirmed: boolean,
): Promise<void> {
  await apiRequest(`/api/sessions/${sessionId}/bed-preferences`, {
    method: 'PUT',
    body: JSON.stringify({ preferences, confirmed }),
  })
}
