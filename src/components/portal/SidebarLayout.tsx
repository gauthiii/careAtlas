import type { ReactNode } from 'react'
import { Hospital, LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { hospital } from '../../data/patientPortalData'

/** Shared classes for a sidebar nav link. Use with NavLink's className render-prop. */
export const sidebarItem =
  'flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[0.88rem] font-bold text-[#53687b] w-full transition-colors hover:bg-[#f1f7fb] max-[860px]:w-auto max-[860px]:whitespace-nowrap'
export const sidebarItemActive = 'bg-[#143A57] !text-white hover:!bg-[#143A57]'

export interface SidebarSignOut {
  onSignOut: () => void
  label?: string
}

/**
 * Full-height, two-pane portal layout (ChatGPT/Claude style): a fixed left column
 * with brand at the top, scrollable nav in the middle, and a sign-out button pinned
 * to the bottom — plus a slim top bar in the content pane for the bell + portal switcher.
 */
export function SidebarLayout({
  portalLabel,
  portalLabelIcon,
  nav,
  navAriaLabel,
  headerRight,
  signOut,
  children,
}: {
  portalLabel: string
  portalLabelIcon?: ReactNode
  nav: ReactNode
  navAriaLabel: string
  headerRight?: ReactNode
  signOut?: SidebarSignOut | null
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f4f8fb] min-[860px]:flex-row">
      <aside className="z-30 flex shrink-0 flex-col border-[#d7e5ec] bg-white min-[860px]:sticky min-[860px]:top-0 min-[860px]:h-screen min-[860px]:w-[264px] min-[860px]:border-r max-[860px]:border-b">
        <NavLink to="/" className="flex items-center gap-3 border-b border-[#eef4f8] px-5 py-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#143A57] text-white">
            <Hospital size={24} />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-[1.02rem] tracking-normal text-[#102033]">{hospital.name}</strong>
            <small className="mt-0.5 flex items-center gap-[5px] text-[0.78rem] font-[750] text-[#607487]">
              {portalLabelIcon} {portalLabel}
            </small>
          </span>
        </NavLink>

        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 max-[860px]:flex-row max-[860px]:overflow-x-auto max-[860px]:overflow-y-hidden"
          aria-label={navAriaLabel}
        >
          {nav}
        </nav>

        {signOut && (
          <div className="border-t border-[#eef4f8] p-3">
            <button
              type="button"
              onClick={signOut.onSignOut}
              className="flex w-full items-center gap-2.5 rounded-[10px] border border-[#e0ebf1] bg-white px-3 py-2.5 text-[0.88rem] font-bold text-[#a22828] transition-colors hover:bg-[#fdf2f1] max-[860px]:w-auto max-[860px]:whitespace-nowrap"
            >
              <LogOut size={17} /> {signOut.label ?? 'Sign out'}
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {headerRight && (
          <header className="sticky top-0 z-20 flex items-center justify-end gap-2 border-b border-[#d7e5ec] bg-white/95 px-[clamp(12px,3vw,24px)] py-2.5 backdrop-blur-[14px] max-[720px]:justify-start max-[720px]:overflow-x-auto">
            {headerRight}
          </header>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

/** Convenience wrapper so callers don't repeat the cn() active-state logic. */
export function sidebarItemClass(isActive: boolean): string {
  return cn(sidebarItem, isActive && sidebarItemActive)
}
