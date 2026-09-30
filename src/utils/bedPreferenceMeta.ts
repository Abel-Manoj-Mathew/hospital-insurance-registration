import type { LucideIcon } from 'lucide-react'
import { BedDouble, BedSingle, Crown, Users } from 'lucide-react'
import type { BedPreferenceId } from '@/types'

export interface BedPreferenceMeta {
  id: BedPreferenceId
  icon: LucideIcon
  titleKey: string
  descriptionKey: string
}

export const BED_PREFERENCE_DEFAULT_ORDER: BedPreferenceMeta[] = [
  {
    id: 'sharing',
    icon: Users,
    titleKey: 'bedPreference.items.sharing.title',
    descriptionKey: 'bedPreference.items.sharing.description',
  },
  {
    id: 'single',
    icon: BedSingle,
    titleKey: 'bedPreference.items.single.title',
    descriptionKey: 'bedPreference.items.single.description',
  },
  {
    id: 'deluxe',
    icon: BedDouble,
    titleKey: 'bedPreference.items.deluxe.title',
    descriptionKey: 'bedPreference.items.deluxe.description',
  },
  {
    id: 'superDeluxe',
    icon: Crown,
    titleKey: 'bedPreference.items.superDeluxe.title',
    descriptionKey: 'bedPreference.items.superDeluxe.description',
  },
]

export const BED_PREFERENCE_META_BY_ID: Record<BedPreferenceId, BedPreferenceMeta> = Object.fromEntries(
  BED_PREFERENCE_DEFAULT_ORDER.map((item) => [item.id, item]),
) as Record<BedPreferenceId, BedPreferenceMeta>
