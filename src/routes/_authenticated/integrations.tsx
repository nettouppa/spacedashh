import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Plug, ShieldCheck, Clock3, Building2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/dash/app-shell";
import { getBitrixSetup, connectBitrixWebhook, syncBitrixNow, disconnectBitrix } from "@/lib/bitrix.functions";
import { supabase } from "@/integrations/supabase/client";
import { AiSettingsCard } from "@/components/dash/ai-settings-card";
import { VoiceSettingsCard } from "@/components/dash/voice-settings-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AtlasIcon } from "@/components/dash/atlas";
import { useQuery } from "@tanstack/react-query";
import { getAiStatus } from "@/lib/ai-settings.functions";
import { getModuleCounts } from "@/lib/modules.functions";
import { AtlasPersonalitySettings } from "@/components/dash/atlas-personality-settings";

const setupQuery = queryOptions({ queryKey: ["bitrix-setup"], queryFn: () => getBitrixSetup() });

export const Route = createFileRoute("/_authenticated/integrations")({
  loader: ({ context }) => context.queryClient.ensureQueryData(setupQuery),
  head: () => ({ meta: [
    { title: "Integrações Bitrix24 — Spacedash" },
    { name: "description", content: "Conexão do Bitrix24 por empresa, conexão por webhook REST e situação da sincronização." },
    { property: "og:title", content: "Integrações Bitrix24 — Spacedash" },
    { property: "og:description", content: "Gerencie a conexão segura de cada empresa com o Bitrix24." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Integrations,
});

function Integrations() {
  const { data } = useSuspenseQuery(setupQuery);
  const qc = useQueryClient();
  const nav = useNavigate();
  const [selected, setSelected] = useState("");
  const company = data.companies.find((c) => c.id === selected) ?? data.companies[0];
  const conn = company?.connection ?? null;
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState("bitrix");
  useEffect(() => { if (new URLSearchParams(window.location.search).get("tab") === "atlas") setTab("atlas"); }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true); setFlash(null);
    try { await fn(); } catch (e) { setFlash({ ok: false, text: e instanceof Error ? e.message : "Erro inesperado." }); }
    finally { setBusy(false); void qc.invalidateQueries({ queryKey: ["bitrix-setup"] }); }
  }
  const connect = () => run(async () => {
    if (!company) return;
    const r = await connectBitrixWebhook({ data: { companyId: company.id, url: domain } });
    setDomain("");
    const s = await syncBitrixNow({ data: { companyId: company.id } }).catch(() => null);
    setFlash({ ok: true, text: `Portal ${r.domain} conectado pelo webhook de ${r.userName}.${r.isAdmin ? "" : " Atenção: esse usuário não é administrador, então só os dados que ele enxerga serão lidos."}${s ? ` ${s.imported} negócios importados.` : " Clique em “Sincronizar agora” para importar."}` });
  });
  const sync = () => run(async () => {
    if (!company) return;
    const r = await syncBitrixNow({ data: { companyId: company.id } });
    setFlash({ ok: true, text: `${r.imported} negócios importados${r.partial ? " (parcial — continua de onde parou na próxima sincronização, automática a cada hora)" : ""}.` });
  });
  const disconnect = () => run(async () => {
    if (!company || !confirm("Desconectar este portal? Os acessos guardados serão apagados.")) return;
    await disconnectBitrix({ data: { companyId: company.id } });
  });
  const aiStatus = useServerFn(getAiStatus);
  const aiQ = useQuery({ queryKey: ["ai-status", company?.id], queryFn: () => {
    if (!company) throw new Error("Nenhuma empresa disponível.");
    return aiStatus({ data: { companyId: company.id } });
  }, enabled: !!company });
  const countsFn = useServerFn(getModuleCounts);
  const countsQ = useQuery({ queryKey: ["module-counts", company?.id, conn?.last_sync_at], queryFn: () => countsFn({ data: { companyId: company!.id } }), enabled: !!company && !!conn });
  return <AppShell page="integrations" userName={data.name} userPhoto="" companyName={company?.name ?? "Sem empresa"}
    roleLabel={data.isAdmin ? "Administrador" : company?.canManage ? "Gestor" : "Colaborador"} isAdmin={data.isAdmin}
    onSignOut={async () => { await supabase.auth.signOut(); void nav({ to: "/auth" }); }}
    topRight={<Button variant="ghost" size="sm" asChild><Link to="/dashboard"><ArrowLeft />Painel</Link></Button>}>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-medium uppercase text-subtle-foreground">Workspace</p><h1 className="mt-1 text-2xl font-semibold">Integrações</h1></div>
      {data.companies.length > 0 && <label className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="size-4" />
        <select aria-label="Empresa da integração" value={company?.id ?? ""} onChange={(e) => setSelected(e.target.value)} className="h-9 max-w-64 rounded-md border border-border bg-card px-3 text-foreground">
          {data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>}
    </div>
    {flash && <p role="status" className={`mt-5 rounded-md px-3 py-2 text-sm ${flash.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{flash.text}</p>}
    <Tabs value={tab} onValueChange={setTab} className="mt-6">
      <TabsList>
        <TabsTrigger value="bitrix"><Plug className="size-4" />Bitrix24</TabsTrigger>
        <TabsTrigger value="atlas"><AtlasIcon className="size-4" />Atlas</TabsTrigger>
      </TabsList>
      <TabsContent value="atlas">
        {company ? <><AiSettingsCard companyId={company.id} canManage={company.canManage} />
          <AtlasPersonalitySettings key={company.id} companyId={company.id} canManage={company.canManage} connected={!!aiQ.data?.connected} />
          <VoiceSettingsCard companyId={company.id} canManage={company.canManage} connected={!!aiQ.data?.connected} /></>
          : <p className="py-8 text-sm text-muted-foreground">Nenhuma empresa disponível.</p>}
      </TabsContent>
      <TabsContent value="bitrix">
    <section className="mt-7 border-y border-border py-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid size-12 place-items-center rounded-lg border border-primary/20 bg-primary-soft text-primary"><Plug className="size-6" /></div>
        <div className="flex-1"><h2 className="text-xl font-semibold">Bitrix24</h2><p className="mt-1 text-sm text-muted-foreground">{company?.name ?? "Nenhuma empresa cadastrada"}</p></div>
        {conn ? <span className="inline-flex items-center gap-2 rounded-md bg-success-soft px-3 py-1.5 text-xs font-medium text-success"><Check className="size-3.5" />Conectado</span>
          : <span className="inline-flex items-center gap-2 rounded-md bg-warning-soft px-3 py-1.5 text-xs font-medium text-warning"><Clock3 className="size-3.5" />Não conectado</span>}
      </div>
      <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-3">
        {[
          ["Portal", conn?.domain ?? "Não conectado"],
          ["Última sincronização", conn?.last_sync_at ? new Date(conn.last_sync_at).toLocaleString("pt-BR") + (conn.last_sync_status === "partial" ? " (parcial)" : "") : conn?.last_sync_status === "error" ? "Falhou" : "Nenhuma sincronização"],
          ["Negócios importados", conn ? String(conn.deals_count) : "—"],
        ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}
      </dl>
      {conn?.last_sync_status === "error" && conn.last_sync_error && <p className="mt-4 text-xs text-danger">{conn.last_sync_error}</p>}
    </section>
    {!company && <div className="py-8"><h2 className="font-semibold">{data.isAdmin ? "Cadastre a primeira empresa" : "Aguardando convite"}</h2><p className="mt-2 text-sm text-muted-foreground">{data.isAdmin ? "A conexão será vinculada a uma empresa cadastrada no Spacedash." : "Sua conta precisa estar vinculada a uma empresa para acessar a integração."}</p>{data.isAdmin && <Button className="mt-4" asChild><Link to="/companies">Empresas<ArrowUpRight /></Link></Button>}</div>}
    {company && !company.canManage && <div className="flex items-start gap-3 py-8"><ShieldCheck className="size-5 text-muted-foreground" /><div><h2 className="font-semibold">Conexão administrada pelo gestor</h2><p className="mt-2 text-sm text-muted-foreground">Seu perfil não permite conectar portais ou iniciar sincronizações.</p></div></div>}
    {company?.canManage && <>
      <div className="py-7">
        {!conn ? <>
          <h2 className="text-lg font-semibold">Conectar o portal</h2>
          <ol className="mt-3 max-w-2xl list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
            <li>No Bitrix24, abra <b>Aplicativos › Recursos para desenvolvedores › Outro › Webhook de entrada</b>.</li>
            <li>Use um usuário administrador e marque as permissões: CRM, Usuários, Departamentos, Tarefas e Canais Abertos.</li>
            <li>Salve, copie a URL do webhook e cole abaixo.</li>
          </ol>
          <form className="mt-4 flex max-w-2xl flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void connect(); }}>
            <input aria-label="URL do webhook" type="password" autoComplete="off" placeholder="https://suaempresa.bitrix24.com.br/rest/1/abc123…/" value={domain} onChange={(e) => setDomain(e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-border bg-card px-3 font-mono text-sm" />
            <Button type="submit" disabled={busy || !domain.trim()}><Plug />{busy ? "Conectando…" : "Conectar"}</Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">A URL contém uma chave secreta: ela fica guardada só no servidor e nunca é exibida de novo.</p>
        </> : <>
          <h2 className="text-lg font-semibold">Sincronização</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Importa os negócios do CRM do portal. Atualiza sozinho a cada hora. A primeira importação vem em lotes de até 2.000 negócios e continua de onde parou; depois, só o que mudou.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void sync()}><RefreshCw className={busy ? "animate-spin" : ""} />{busy ? "Sincronizando…" : "Sincronizar agora"}</Button>
            <Button variant="outline" disabled={busy} onClick={() => void disconnect()}><Unplug />Desconectar</Button>
          </div>
        </>}
      </div>
      <div className="border-t border-border py-6"><h3 className="font-semibold">Módulos sincronizados</h3><div className="mt-4 divide-y divide-border">{([["CRM e vendas", "deals", "negócios"], ["Atividades", "activities", "atividades"], ["Tarefas", "tasks", "tarefas"], ["Atendimento", "support", "conversas"], ["Pessoas e departamentos", "users", "pessoas"]] as const).map(([module, key, unit]) => { const n = countsQ.data?.[key] ?? 0; return <div key={module} className="flex items-center justify-between gap-4 py-3 text-sm"><span>{module}</span><span className={`text-xs ${n ? "text-success" : "text-muted-foreground"}`}>{!conn ? "Não conectado" : countsQ.isLoading ? "…" : n ? `${n.toLocaleString("pt-BR")} ${unit}` : "Nenhum registro"}</span></div>; })}</div></div>
      <div className="flex items-start gap-3 border-t border-border py-5 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><p>O Spacedash só lê dados do Bitrix24. Para trocar o webhook, desconecte e conecte de novo; para revogar, apague o webhook no Bitrix24.</p></div>
    </>}
      </TabsContent>
    </Tabs>
  </AppShell>;
}