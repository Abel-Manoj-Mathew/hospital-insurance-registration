import { BED_PREFERENCE_DEFAULT_ORDER } from '@/utils/bedPreferenceMeta'
import { useSessionStore } from '@/state/sessionStore'
import type { BedPreferenceId } from '@/types'
import { BedPreferenceRow } from './BedPreferenceRow'

const RANKS = [1, 2, 3, 4]

export function BedPreferenceList() {
  const bedPreferences = useSessionStore((state) => state.bedPreferences)
  const setBedPreferenceRank = useSessionStore((state) => state.setBedPreferenceRank)

  const byRank = new Map(bedPreferences.map((item) => [item.rank, item.id]))

  return (
    <div className="flex flex-col gap-3">
      {RANKS.map((rank) => {
        // Each row's options exclude whatever earlier rows have already claimed.
        const takenByEarlierRank = new Set(
          bedPreferences.filter((item) => item.rank < rank).map((item) => item.id),
        )
        const options = BED_PREFERENCE_DEFAULT_ORDER.filter((meta) => !takenByEarlierRank.has(meta.id))
        const value = byRank.get(rank) as BedPreferenceId

        return (
          <BedPreferenceRow
            key={rank}
            rank={rank}
            value={value}
            options={options}
            onChange={(id) => setBedPreferenceRank(rank, id)}
          />
        )
      })}
    </div>
  )
}
