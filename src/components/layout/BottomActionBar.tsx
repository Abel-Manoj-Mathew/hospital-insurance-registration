import type { ReactNode } from 'react'

interface BottomActionBarProps {
  children: ReactNode
}

/**
 * Phones: pinned to the bottom of the viewport within thumb reach, clear of the iOS home indicator.
 * Wider screens: sits directly after the content so the action never floats far from what it confirms.
 */
export function BottomActionBar({ children }: BottomActionBarProps) {
  return (
    <div className="pb-safe sticky bottom-0 z-20 border-t border-ink-150 bg-white sm:static sm:border-t-0 sm:bg-transparent sm:pb-14">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 pt-3 sm:px-6 sm:pt-0">{children}</div>
    </div>
  )
}
