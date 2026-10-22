import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Copy, Plug, ShieldCheck, Clock3, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/dash/app-shell";
import { getBitrixSetup } from "@/lib/bitrix.functions";
import { BITRIX_SETUP_URLS } from "@/lib/bitrix-policy";
import { supabase } from "@/integrations/supabase/client";

const setupQuery = queryOptions({ queryKey: ["bitrix-setup"], queryFn: () => getBitrixSetup() });

export const Route = createFileRoute("/_authenticated/integrations")({
  loader: ({ context }) => context.queryClient.ensureQueryData(setupQuery),
  head: () => ({ meta: [
    { title: "Integrações Bitrix24 — Spacedash" },
    { name: "description", content: "Conexão do Bitrix24 por empresa, instalação do aplicativo Spacedash e situação da sincronização." },
    { property: "og:title", content: "Integrações Bitrix24 — Spacedash" },
    { property: "og:description", content: "Gerencie a conexão segura de cada empresa com o Bitrix24." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Integrations,
});

function Integrations() {
  const { data } = useSuspenseQuery(setupQuery);
  const nav = useNavigate();
  const [selected, setSelected] = useState("");
  const company = data.companies.find((c) => c.id === selected) ?? data.companies[0];
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function copy(label: string, value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(label); setError(""); }
    catch { setError("Não foi possível copiar. Selecione o endereço e copie manualmente."); }
  }
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
    <section className="mt-7 border-y border-border py-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid size-12 place-items-center rounded-lg border border-primary/20 bg-primary-soft text-primary"><Plug className="size-6" /></div>
        <div className="flex-1"><h2 className="text-xl font-semibold">Bitrix24</h2><p className="mt-1 text-sm text-muted-foreground">{company?.name ?? "Nenhuma empresa cadastrada"}</p></div>
        <span className="inline-flex items-center gap-2 rounded-md bg-warning-soft px-3 py-1.5 text-xs font-medium text-warning"><Clock3 className="size-3.5" />Aguardando configuração</span>
      </div>
      <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-3">
        {[ ["Portal", "Não conectado"], ["Última sincronização", "Nenhuma sincronização"], ["Dados no painel", "Demonstração"] ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}
      </dl>
    </section>
    {!company && <div className="py-8"><h2 className="font-semibold">{data.isAdmin ? "Cadastre a primeira empresa" : "Aguardando convite"}</h2><p className="mt-2 text-sm text-muted-foreground">{data.isAdmin ? "A conexão será vinculada a uma empresa cadastrada no Spacedash." : "Sua conta precisa estar vinculada a uma empresa para acessar a integração."}</p>{data.isAdmin && <Button className="mt-4" asChild><Link to="/admin">Administração<ArrowUpRight /></Link></Button>}</div>}
    {company && !company.canManage && <div className="flex items-start gap-3 py-8"><ShieldCheck className="size-5 text-muted-foreground" /><div><h2 className="font-semibold">Conexão administrada pelo gestor</h2><p className="mt-2 text-sm text-muted-foreground">Seu perfil não permite conectar portais ou iniciar sincronizações.</p></div></div>}
    {company?.canManage && <>
      <div className="py-7"><h2 className="text-lg font-semibold">Aplicativo Spacedash</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">O aplicativo distribuível ainda não foi cadastrado no Bitrix24. A instalação e a sincronização permanecerão indisponíveis até concluir a autorização segura.</p>
        <div className="mt-4 flex flex-wrap gap-2"><Button disabled><Plug />Conectar Bitrix24</Button><Button variant="outline" disabled><Clock3 />Sincronizar agora</Button></div>
      </div>
      <div className="border-t border-border py-6"><h3 className="font-semibold">Endereços para cadastro</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Endereços de produção reservados. O Spacedash ainda não foi publicado; não configure a instalação em clientes agora.</p>
        <div className="mt-4 space-y-4">{[{ label: "Instalação", value: BITRIX_SETUP_URLS.installation }, { label: "Retorno da autorização", value: BITRIX_SETUP_URLS.callback }].map((item) => <div key={item.label}><label className="text-xs font-medium text-muted-foreground">{item.label}</label><div className="mt-1 flex items-center gap-2"><input aria-label={`Endereço de ${item.label}`} readOnly value={item.value} className="h-10 min-w-0 flex-1 rounded-md border border-border bg-card px-3 font-mono text-xs" /><Button variant="outline" size="icon" aria-label={`Copiar ${item.label}`} title={`Copiar ${item.label}`} onClick={() => copy(item.label, item.value)}>{copied === item.label ? <Check /> : <Copy />}</Button></div></div>)}</div>
        {copied && <p role="status" className="mt-3 text-xs text-success">{copied}: endereço copiado.</p>}{error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}
      </div>
      <div className="border-t border-border py-6"><h3 className="font-semibold">Módulos previstos</h3><div className="mt-4 divide-y divide-border">{["CRM e vendas", "Atividades", "Tarefas", "Atendimento", "Pessoas e departamentos"].map((module) => <div key={module} className="flex items-center justify-between gap-4 py-3 text-sm"><span>{module}</span><span className="text-xs text-muted-foreground">Não sincronizado</span></div>)}</div></div>
      <div className="flex items-start gap-3 border-t border-border py-5 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><p>Credenciais serão solicitadas por formulário seguro. A instalação não concede acesso ao Spacedash sem convite.</p></div>
    </>}
  </AppShell>;
}