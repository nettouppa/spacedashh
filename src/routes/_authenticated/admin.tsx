import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { adminOverview, createCompany, getMe, inviteMember, removeMember, updateMember } from "@/lib/account.functions";

const meQuery = queryOptions({ queryKey: ["me"], queryFn: () => getMe() });
const adminQuery = queryOptions({ queryKey: ["admin"], queryFn: () => adminOverview() });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — Spacedash" }, { name: "description", content: "Gerencie empresas e convites do Spacedash." }, { property: "og:title", content: "Administração — Spacedash" }, { property: "og:description", content: "Gestão de empresas, convites e permissões do Spacedash." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: Admin,
});

type Role = "gestor" | "colaborador";
type Seller = { id: string; name: string };
const cls = "h-9 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

function Admin() {
  const { data: me } = useSuspenseQuery(meQuery);
  if (!me.isAdmin) return <div className="p-10 text-center text-sm text-muted-foreground">Acesso restrito ao administrador. <Link to="/dashboard" className="text-primary">Voltar</Link></div>;
  return <AdminInner />;
}

function AdminInner() {
  const qc = useQueryClient();
  const { data: companies } = useSuspenseQuery(adminQuery);
  const create = useServerFn(createCompany);
  const invite = useServerFn(inviteMember);
  const remove = useServerFn(removeMember);
  const update = useServerFn(updateMember);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["admin"] }); void qc.invalidateQueries({ queryKey: ["me"] }); };
  async function run(key: string, fn: () => Promise<string | void>) {
    setBusy(key); setMsg(null);
    try { const t = await fn(); if (t) setMsg({ ok: true, text: t }); refresh(); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Algo deu errado. Tente de novo." }); }
    finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Voltar ao painel</Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Administração</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cadastre empresas e convide gestores e colaboradores. Só entra quem você convidar.</p>

        <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; void run("create", async () => { await create({ data: { name } }); const n = name; setName(""); return `Empresa ${n} criada.`; }); }}
          className="mt-6 flex flex-wrap gap-2 rounded-xl border border-border bg-card p-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova empresa" className={`${cls} min-w-48 flex-1`} />
          <button disabled={busy === "create" || name.trim().length < 2} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"><Plus className="size-4" />{busy === "create" ? "Criando…" : "Criar empresa"}</button>
        </form>
        {msg && <p role="status" className={`mt-3 rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{msg.text}</p>}

        {companies.length === 0 && <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma empresa ainda. Crie a primeira acima e depois convide as pessoas.</p>}
        <div className="mt-6 space-y-4">
          {companies.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"><span className="font-semibold">{c.name}</span>
                {c.sellers.length === 0 && <span className="text-xs text-muted-foreground">Conecte o Bitrix24 desta empresa para vincular vendedores</span>}</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Pessoa</th><th className="px-4 py-2 font-medium">Perfil</th><th className="px-4 py-2 font-medium">Vendedor no CRM</th><th /></tr></thead>
                  <tbody>
                    {c.members.length === 0 && <tr><td colSpan={4} className="border-t border-border px-4 py-6 text-center text-muted-foreground">Ninguém com acesso ainda.</td></tr>}
                    {c.members.map((m) => {
                      const save = (role: Role, sellerRef: string | null) => run(m.id, async () => { await update({ data: { id: m.id, role, sellerRef } }); return `Acesso de ${m.name || m.email} atualizado.`; });
                      return (
                        <tr key={m.id} className="border-t border-border">
                          <td className="px-4 py-2"><div className="font-medium">{m.name || m.email}</div><div className="text-xs text-muted-foreground">{m.email}</div></td>
                          <td className="px-4 py-2"><select aria-label="Perfil" disabled={busy === m.id} value={m.role} onChange={(e) => void save(e.target.value as Role, m.seller_ref)} className={cls}><option value="colaborador">Colaborador</option><option value="gestor">Gestor</option></select></td>
                          <td className="px-4 py-2"><SellerSelect sellers={c.sellers} value={m.seller_ref ?? ""} disabled={busy === m.id} onChange={(v) => void save(m.role as Role, v || null)} /></td>
                          <td className="px-4 py-2 text-right"><button disabled={busy === m.id} onClick={() => { if (confirm(`Remover o acesso de ${m.name || m.email} a ${c.name}?`)) void run(m.id, async () => { await remove({ data: { id: m.id } }); return "Acesso removido."; }); }} aria-label="Remover acesso" title="Remover acesso" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-danger"><Trash2 className="size-4" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <InviteForm sellers={c.sellers} busy={busy === `inv-${c.id}`} onInvite={(v) => run(`inv-${c.id}`, async () => {
                const r = await invite({ data: { companyId: c.id, ...v, redirectTo: `${window.location.origin}/reset-password` } });
                return r.invited ? `Convite enviado para ${v.email}.` : `${v.email} já tinha conta e agora tem acesso a ${c.name}.`;
              })} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SellerSelect({ sellers, value, onChange, disabled }: { sellers: Seller[]; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const known = !value || sellers.some((s) => s.id === value);
  return <select aria-label="Vendedor no CRM" disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className={`${cls} max-w-56`}>
    <option value="">Sem vínculo</option>
    {!known && <option value={value}>Usuário {value} (não encontrado)</option>}
    {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
  </select>;
}

function InviteForm({ sellers, busy, onInvite }: { sellers: Seller[]; busy: boolean; onInvite: (v: { email: string; role: Role; sellerRef?: string }) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("colaborador");
  const [seller, setSeller] = useState("");
  return (
    <form onSubmit={async (e) => { e.preventDefault(); await onInvite({ email, role, ...(seller ? { sellerRef: seller } : {}) }); setEmail(""); setSeller(""); }}
      className="flex flex-wrap gap-2 border-t border-border p-4">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" className={`${cls} min-w-48 flex-1`} />
      <select aria-label="Perfil do convidado" value={role} onChange={(e) => setRole(e.target.value as Role)} className={cls}><option value="colaborador">Colaborador</option><option value="gestor">Gestor</option></select>
      <SellerSelect sellers={sellers} value={seller} onChange={setSeller} />
      <button disabled={busy} className="h-9 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-60">{busy ? "Enviando…" : "Convidar"}</button>
    </form>
  );
}
