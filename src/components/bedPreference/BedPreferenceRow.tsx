import { ChevronDown } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import type { BedPreferenceId } from '@/types'
import { BED_PREFERENCE_META_BY_ID, type BedPreferenceMeta } from '@/utils/bedPreferenceMeta'

interface BedPreferenceRowProps {
  rank: number
  value: BedPreferenceId
  options: BedPreferenceMeta[]
  onChange: (id: BedPreferenceId) => void
}

export function BedPreferenceRow({ rank, value, options, onChange }: BedPreferenceRowProps) {
  const { t } = useTranslation()
  const meta = BED_PREFERENCE_META_BY_ID[value]
  const Icon = meta.icon
  const fieldId = `bed-preference-rank-${rank}`
  // The last row has only one option left once the first three are chosen.
  const locked = options.length <= 1

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-150 bg-white p-3.5 sm:p-4">
      <span
        className="tabular flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-title font-bold text-primary-700"
        aria-hidden="true"
      >
        {rank}
      </span>

      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700" aria-hidden="true">
        <Icon className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <label htmlFor={fieldId} className="mb-1 block text-small text-ink-600">
          {t('bedPreference.rankLabel', { rank })}
        </label>
        <div className="relative">
          <select
            id={fieldId}
            value={value}
            disabled={locked}
            onChange={(event) => onChange(event.target.value as BedPreferenceId)}
            className="min-h-12 w-full appearance-none truncate rounded-xl border border-ink-200 bg-white py-2.5 pr-10 pl-3 text-small font-semibold text-ink-900 sm:text-body disabled:bg-ink-50 disabled:text-ink-500"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.titleKey)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}
