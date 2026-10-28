import { useEffect, useMemo, useState, type ReactNode } from "react";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/account.functions";
import { getDashboardData } from "@/lib/dashboard-data.functions";
import { getGoals } from "@/lib/goals.functions";
import { setDataset, setGoals } from "@/lib/crm-data";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, type ShellPage } from "@/components/dash/app-shell";

export const meQuery = queryOptions({ queryKey: ["me"], queryFn: () => getMe() });
export const COMPANY_KEY = "sd-company";

/** Signed-in account + selected company + that company's CRM dataset (swapped into crm-data). */
export function useWorkspace() {
  const { data: me } = useSuspenseQuery(meQuery);
  const [companyId, setCid] = useState(me.memberships[0]?.companyId ?? "");
  useEffect(() => {
    const s = localStorage.getItem(COMPANY_KEY);
    if (s && me.memberships.some((m) => m.companyId === s)) setCid(s);
  }, [me.memberships]);
  const setCompanyId = (id: string) => { localStorage.setItem(COMPANY_KEY, id); setCid(id); };
  const membership = me.memberships.find((m) => m.companyId === companyId) ?? me.memberships[0];
  const isManager = me.isAdmin || membership?.role === "gestor";
  const loadData = useServerFn(getDashboardData);
  const loadGoals = useServerFn(getGoals);
  const dataQ = useQuery({ queryKey: ["dash-data", companyId], queryFn: () => loadData({ data: { companyId } }), enabled: !!companyId, staleTime: 5 * 60_000 });
  const goalsQ = useQuery({ queryKey: ["goals", companyId], queryFn: () => loadGoals({ data: { companyId } }), enabled: !!companyId });
  const real = dataQ.data ?? null;
  useMemo(() => setDataset(dataQ.isSuccess ? real : "empty"), [real, dataQ.isSuccess]);
  useMemo(() => setGoals(goalsQ.data ?? []), [goalsQ.data]);
  return { me, companyId, setCompanyId, membership, isManager, dataQ, real, ready: dataQ.isSuccess && !goalsQ.isLoading };
}

export type Workspace = ReturnType<typeof useWorkspace>;

/** Standard page frame for workspace pages (sidebar, company switcher). */
export function WorkspaceShell({ ws, page, children, actions }: { ws: Workspace; page: ShellPage; children: ReactNode; actions?: ReactNode }) {
  const nav = useNavigate();
  return (
    <AppShell page={page} userName={ws.me.name} userPhoto="" companyName={ws.membership?.companyName ?? "Sem empresa"}
      roleLabel={ws.me.isAdmin ? "Administrador" : ws.membership?.role === "gestor" ? "Gestor" : "Colaborador"} isAdmin={ws.me.isAdmin} canManage={ws.isManager}
      onSignOut={async () => { await supabase.auth.signOut(); void nav({ to: "/auth", replace: true }); }}
      topRight={<>
        {actions}
        {ws.me.memberships.length > 1 && (
          <select aria-label="Empresa" value={ws.companyId} onChange={(e) => ws.setCompanyId(e.target.value)}
            className="h-8 max-w-44 rounded-md border border-border bg-card px-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary">
            {ws.me.memberships.map((m) => <option key={m.companyId} value={m.companyId}>{m.companyName}</option>)}
          </select>
        )}
      </>}>
      {children}
    </AppShell>
  );
}

export function DataNotice({ ws }: { ws: Workspace }) {
  if (ws.dataQ.isLoading) return <p className="mt-1 text-sm text-muted-foreground">Carregando dados do Bitrix24…</p>;
  if (ws.dataQ.isError) return <p className="mt-1 text-sm text-danger">Não foi possível carregar os dados. <button onClick={() => void ws.dataQ.refetch()} className="font-medium underline">Tentar de novo</button></p>;
  if (!ws.real) return <p className="mt-1 text-sm text-warning">Dados de demonstração · Bitrix24 não conectado</p>;
  return <p className="mt-1 text-sm text-muted-foreground">Bitrix24 · {ws.real.domain}{ws.real.lastSyncAt ? ` · sincronizado em ${new Date(ws.real.lastSyncAt).toLocaleString("pt-BR")}` : ""}</p>;
}
