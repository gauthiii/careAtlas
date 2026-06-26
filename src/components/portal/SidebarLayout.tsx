import type { ReactNode } from 'react'
import {
  Hospital,
  LogOut,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { hospital } from '../../data/patientPortalData'

/** Shared classes for a sidebar nav link. Use with NavLink's className render-prop. */
export const sidebarItem =
  'flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[0.88rem] font-bold text-[#53687b] w-full transition-all duration-300 hover:bg-[#f1f7fb] max-[860px]:w-auto max-[860px]:whitespace-nowrap'

export const sidebarItemActive =
  'bg-[#143A57] !text-white hover:!bg-[#143A57]'

export interface SidebarSignOut {
  onSignOut: () => void
  label?: string
}

/**
 * A nav item passed to SidebarLayout.
 * Carrying the label explicitly avoids fragile JSX-child inspection.
 */
export interface SidebarNavItem {
  /** Plain text label used for the collapsed tooltip. */
  label: string
  /**
   * A function returning the full nav node.
   * Receives `collapsed` state to allow the component to render accordingly.
   */
  node: (collapsed: boolean) => ReactNode
}

/**
 * Tooltip shown to the right of an icon when the sidebar is collapsed.
 */
function CollapsedTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="group relative flex w-full justify-center">
      {children}
      <div
        className={cn(
          'pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2',
          'whitespace-nowrap rounded-[8px] bg-[#143A57] px-2.5 py-1.5',
          'text-[0.78rem] font-bold text-white shadow-[0_4px_12px_rgba(20,58,87,0.25)]',
          'opacity-0 scale-95 transition-all duration-150 ease-out',
          'group-hover:opacity-100 group-hover:scale-100',
          // Left-pointing arrow
          'before:absolute before:right-full before:top-1/2 before:-translate-y-1/2',
          'before:border-4 before:border-transparent before:border-r-[#143A57] before:content-[""]',
        )}
        role="tooltip"
      >
        {label}
      </div>
    </div>
  )
}

// collapseNavNode has been removed in favor of passing collapsed state to the node function.

export function SidebarLayout({
  portalLabel,
  portalLabelIcon,
  nav,
  navAriaLabel,
  headerLeft,
  headerRight,
  signOut,
  collapsed = false,
  children,
}: {
  portalLabel: string
  portalLabelIcon?: ReactNode
  nav: SidebarNavItem[]
  navAriaLabel: string
  headerLeft?: ReactNode
  headerRight?: ReactNode
  signOut?: SidebarSignOut | null
  collapsed?: boolean
  children: ReactNode
}) {
  const renderedNav = nav.map(({ label, node }, index) => {
    if (!collapsed) return <>{node(false)}</>

    return (
      <CollapsedTooltip key={index} label={label}>
        {node(true)}
      </CollapsedTooltip>
    )
  })

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f4f8fb] min-[860px]:flex-row">
      <aside
        className={cn(
          'z-30 flex shrink-0 flex-col border-[#d7e5ec] bg-white transition-all duration-300',
          'min-[860px]:sticky min-[860px]:top-0 min-[860px]:h-screen min-[860px]:border-r',
          'max-[860px]:border-b',
          collapsed ? 'min-[860px]:w-[60px]' : 'min-[860px]:w-[264px]',
        )}
      >
        {/* Header — logo only, no toggle button */}
        <div className="flex items-center border-b border-[#eef4f8] px-3 py-2.5">
          <NavLink
            to="/"
            className={cn(
              'flex min-w-0 items-center gap-3',
              collapsed && 'justify-center w-full',
            )}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#143A57] text-white">
              <Hospital size={20} />
            </span>

            {!collapsed && (
              <span className="min-w-0">
                <strong className="block text-wrap text-[14px] tracking-normal text-[#102033]">
                  {hospital.name}
                </strong>
                <small className="mt-0.5 flex items-center gap-[5px] text-[0.78rem] font-[750] text-[#607487]">
                  {portalLabelIcon}
                  {portalLabel}
                </small>
              </span>
            )}
          </NavLink>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            'flex flex-1 gap-1 p-3',
            collapsed ? 'flex-col items-center overflow-visible' : 'flex-col overflow-y-auto',
            'max-[860px]:flex-row max-[860px]:overflow-x-auto max-[860px]:overflow-y-hidden',
          )}
          aria-label={navAriaLabel}
        >
          {renderedNav}
        </nav>

        {/* Sign Out */}
        {signOut && (
          <div className="border-t border-[#eef4f8] p-3">
            {collapsed ? (
              <CollapsedTooltip label={signOut.label ?? 'Sign out'}>
                <button
                  type="button"
                  onClick={signOut.onSignOut}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#e0ebf1] bg-white text-[#a22828] transition-colors hover:bg-[#fdf2f1]"
                >
                  <LogOut size={22} />
                </button>
              </CollapsedTooltip>
            ) : (
              <button
                type="button"
                onClick={signOut.onSignOut}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-[10px] border border-[#e0ebf1] bg-white px-3 py-2.5 text-[0.88rem] !font-semibold text-[#a22828] transition-colors hover:bg-[#fdf2f1]',
                  'max-[860px]:w-auto max-[860px]:whitespace-nowrap',
                )}
              >
                <LogOut size={17} />
                {signOut.label ?? 'Sign out'}
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {(headerLeft || headerRight) && (
          <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[#d7e5ec] bg-white/95 px-[clamp(12px,3vw,24px)] py-2.5 backdrop-blur-[14px]">
            <div className="flex items-center gap-2">
              {headerLeft}
            </div>
            <div className="flex items-center gap-2 max-[720px]:justify-start max-[720px]:overflow-x-auto">
              {headerRight}
            </div>
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

/**
 * Wrapper that applies a CSS scale transition to a nav icon so it grows/shrinks
 * smoothly in sync with the sidebar width animation (duration-300), instead of
 * jumping instantly when the `size` prop changes.
 *
 * Usage:
 *   <SidebarIcon collapsed={collapsed} icon={<MyIcon size={22} />} />
 *
 * The icon is always rendered at its "collapsed" size (larger); when expanded
 * the wrapper scales it down to ~77% so it visually matches the smaller size,
 * then transitions back to 100% when collapsing — perfectly in sync with the
 * sidebar's 300ms transition.
 */
export function SidebarIcon({
  collapsed,
  icon,
}: {
  collapsed: boolean
  icon: ReactNode
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center transition-transform duration-300"
      style={{ transform: collapsed ? 'scale(1)' : 'scale(0.77)' }}
    >
      {icon}
    </span>
  )
}
