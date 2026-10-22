import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { adminOverview, createCompany, getMe, inviteMember, removeMember } from "@/lib/account.functions";
import { SELLERS } from "@/lib/crm-data";

const meQuery = queryOptions({ queryKey: ["me"], queryFn: () => getMe() });
const adminQuery = queryOptions({ queryKey: ["admin"], queryFn: () => adminOverview() });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — Spacedash" }, { name: "description", content: "Gerencie empresas e convites do Spacedash." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: Admin,
});

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
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["admin"] }); void qc.invalidateQueries({ queryKey: ["me"] }); };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl p-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Voltar ao painel</Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Administração</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cadastre empresas e convide gestores e colaboradores. Só entra quem você convidar.</p>

        <form onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; await create({ data: { name } }); setName(""); refresh(); }}
          className="mt-6 flex gap-2 rounded-xl border border-border bg-card p-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova empresa" className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"><Plus className="size-4" />Criar empresa</button>
        </form>
        {msg && <p className="mt-3 text-sm text-success">{msg}</p>}

        <div className="mt-6 space-y-4">
          {companies.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3 font-semibold">{c.name}</div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Pessoa</th><th className="px-4 py-2 font-medium">Perfil</th><th className="px-4 py-2 font-medium">Vendedor no CRM</th><th /></tr></thead>
                <tbody>
                  {c.members.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-4 py-2"><div className="font-medium">{m.name || m.email}</div><div className="text-xs text-muted-foreground">{m.email}</div></td>
                      <td className="px-4 py-2">{m.role === "gestor" ? "Gestor" : "Colaborador"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{SELLERS.find((s) => s.id === m.seller_ref)?.name ?? "—"}</td>
                      <td className="px-4 py-2 text-right"><button onClick={async () => { await remove({ data: { id: m.id } }); refresh(); }} aria-label="Remover acesso" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-danger"><Trash2 className="size-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <InviteForm onInvite={async (v) => {
                try {
                  const r = await invite({ data: { companyId: c.id, ...v, redirectTo: window.location.origin } });
                  setMsg(r.invited ? `Convite enviado para ${v.email}.` : `${v.email} agora tem acesso a ${c.name}.`); refresh();
                } catch (e) { setMsg((e as Error).message); }
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InviteForm({ onInvite }: { onInvite: (v: { email: string; role: "gestor" | "colaborador"; sellerRef?: string }) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"gestor" | "colaborador">("colaborador");
  const [seller, setSeller] = useState("");
  const cls = "h-9 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <form onSubmit={async (e) => { e.preventDefault(); await onInvite({ email, role, ...(seller ? { sellerRef: seller } : {}) }); setEmail(""); setSeller(""); }}
      className="flex flex-wrap gap-2 border-t border-border p-4">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" className={`${cls} min-w-48 flex-1`} />
      <select value={role} onChange={(e) => setRole(e.target.value as "gestor" | "colaborador")} className={cls}><option value="colaborador">Colaborador</option><option value="gestor">Gestor</option></select>
      <select value={seller} onChange={(e) => setSeller(e.target.value)} className={cls}><option value="">Vendedor no CRM</option>{SELLERS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <button className="h-9 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">Convidar</button>
    </form>
  );
}
