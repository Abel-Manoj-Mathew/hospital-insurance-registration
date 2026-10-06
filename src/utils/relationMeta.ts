import type { RelationToPatient } from '@/types'

export interface RelationMeta {
  id: RelationToPatient
  titleKey: string
}

export const RELATION_OPTIONS: RelationMeta[] = [
  { id: 'self', titleKey: 'contact.relations.self' },
  { id: 'spouse', titleKey: 'contact.relations.spouse' },
  { id: 'parent', titleKey: 'contact.relations.parent' },
  { id: 'child', titleKey: 'contact.relations.child' },
  { id: 'sibling', titleKey: 'contact.relations.sibling' },
  { id: 'relative', titleKey: 'contact.relations.relative' },
  { id: 'other', titleKey: 'contact.relations.other' },
]
