export const portalSwitcherLink =
  'inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 text-[0.82rem] font-bold text-[#53687b]'

export const portalSwitcherActive = 'bg-[#0397AE] !text-white'

export function isPatientPortalPath(pathname: string) {
  return pathname.startsWith('/patient')
}

export function isClinicianPortalPath(pathname: string) {
  return pathname.startsWith('/staff')
}

export function isGovernancePortalPath(pathname: string) {
  return pathname.startsWith('/governance')
}
