import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DOCUMENT_CHECKLIST } from '@/utils/documentMeta'
import { BED_PREFERENCE_DEFAULT_ORDER } from '@/utils/bedPreferenceMeta'
import type {
  BedPreferenceId,
  BedPreferenceRecord,
  DocumentRecord,
  DocumentTypeId,
  LanguageCode,
  RelationToPatient,
  SubmissionResult,
  SubmissionStatus,
} from '@/types'

function createDefaultDocuments(): Record<DocumentTypeId, DocumentRecord> {
  return Object.fromEntries(
    DOCUMENT_CHECKLIST.map((doc) => [
      doc.id,
      { documentType: doc.id, status: 'not_uploaded', version: 0 } satisfies DocumentRecord,
    ]),
  ) as Record<DocumentTypeId, DocumentRecord>
}

function createDefaultBedPreferences(): BedPreferenceRecord[] {
  return BED_PREFERENCE_DEFAULT_ORDER.map((item, index) => ({ id: item.id, rank: index + 1 }))
}

function generateId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `${prefix}-${random}`
}

interface SessionStore {
  sessionId: string | null
  createdAt: string | null
  language: LanguageCode | null
  contactPhone: string | null
  contactRelation: RelationToPatient | null
  documents: Record<DocumentTypeId, DocumentRecord>
  bedPreferences: BedPreferenceRecord[]
  bedPreferencesConfirmed: boolean
  submissionStatus: SubmissionStatus
  submissionResult: SubmissionResult | null

  startOrResumeSession: () => { resumed: boolean }
  setLanguage: (language: LanguageCode) => void
  setContactInfo: (phone: string, relation: RelationToPatient) => void
  setDocumentProcessing: (documentType: DocumentTypeId) => void
  setDocumentResult: (documentType: DocumentTypeId, patch: Partial<DocumentRecord>) => void
  clearDocument: (documentType: DocumentTypeId) => void
  setBedPreferenceRank: (rank: number, id: BedPreferenceId) => void
  confirmBedPreferences: () => void
  setSubmissionStatus: (status: SubmissionStatus) => void
  setSubmissionResult: (result: SubmissionResult) => void
  resetSession: () => void
}

const initialState = {
  sessionId: null as string | null,
  createdAt: null as string | null,
  language: null as LanguageCode | null,
  contactPhone: null as string | null,
  contactRelation: null as RelationToPatient | null,
  documents: createDefaultDocuments(),
  bedPreferences: createDefaultBedPreferences(),
  bedPreferencesConfirmed: false,
  submissionStatus: 'idle' as SubmissionStatus,
  submissionResult: null as SubmissionResult | null,
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      startOrResumeSession: () => {
        const existing = get().sessionId
        if (existing) {
          return { resumed: true }
        }
        set({
          sessionId: generateId('session'),
          createdAt: new Date().toISOString(),
        })
        return { resumed: false }
      },

      setLanguage: (language) => set({ language }),

      setContactInfo: (phone, relation) => set({ contactPhone: phone, contactRelation: relation }),

      setDocumentProcessing: (documentType) =>
        set((state) => ({
          documents: {
            ...state.documents,
            [documentType]: {
              ...state.documents[documentType],
              status: 'processing',
              rejection: undefined,
            },
          },
        })),

      setDocumentResult: (documentType, patch) =>
        set((state) => {
          const current = state.documents[documentType]
          return {
            documents: {
              ...state.documents,
              [documentType]: {
                ...current,
                ...patch,
                version: current.version + 1,
              },
            },
          }
        }),

      clearDocument: (documentType) =>
        set((state) => ({
          documents: {
            ...state.documents,
            [documentType]: { documentType, status: 'not_uploaded', version: state.documents[documentType].version },
          },
        })),

      setBedPreferenceRank: (rank, id) =>
        set((state) => {
          const current = state.bedPreferences
          const previousRankOfId = current.find((item) => item.id === id)?.rank
          if (previousRankOfId === rank) return state
          return {
            bedPreferences: current.map((item) => {
              if (item.id === id) return { ...item, rank }
              if (previousRankOfId !== undefined && item.rank === rank) return { ...item, rank: previousRankOfId }
              return item
            }),
          }
        }),

      confirmBedPreferences: () => set({ bedPreferencesConfirmed: true }),

      setSubmissionStatus: (submissionStatus) => set({ submissionStatus }),

      setSubmissionResult: (submissionResult) =>
        set({ submissionResult, submissionStatus: 'submitted' }),

      resetSession: () => set({ ...initialState, documents: createDefaultDocuments(), bedPreferences: createDefaultBedPreferences() }),
    }),
    {
      name: 'hospital-intake-session',
    },
  ),
)
