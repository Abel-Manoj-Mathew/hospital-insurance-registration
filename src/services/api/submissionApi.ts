import type { SubmissionResult } from '@/types'
import { apiRequest } from './httpClient'

export async function submitIntake(sessionId: string): Promise<SubmissionResult> {
  return apiRequest<SubmissionResult>(`/api/sessions/${sessionId}/submit`, { method: 'POST' })
}
