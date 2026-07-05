import { PortalPage } from '../../components/portal/PortalShell'

export function GovernanceUseCasesPage() {
  return (
    <PortalPage label="Governance" title="Use Cases">
      <iframe
        src="/BHUC_Usecases.html"
        title="Use Cases"
        className="h-[calc(100vh-220px)] w-full rounded-lg border border-slate-200"
      />
    </PortalPage>
  )
}
