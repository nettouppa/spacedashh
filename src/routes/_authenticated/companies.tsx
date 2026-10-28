import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Building2, Plus, Search, ChevronLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { meQuery, useWorkspace, WorkspaceShell } from "@/lib/workspace";
import { listCompanies, createCompanyWithManager, renameCompany } from "@/lib/members.functions";
import { MembersPanel } from "@/components/dash/members-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const companiesQuery = queryOptions({ queryKey: ["companies"], queryFn: () => listCompanies() });
const field = "h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30";
const err = (e: unknown) => (e instanceof Error ? e.message : "Algo deu errado.");

export const Route = createFileRoute("/_authenticated/companies")({
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  head: () => ({ meta: [
    { title: "Empresas — Spacedash" },
    { name: "description", content: "Empresas clientes do Spacedash, seus membros e a conexão com o Bitrix24." },
    { property: "og:title", content: "Empresas — Spacedash" },
    { property: "og:description", content: "Gestão das empresas clientes do Spacedash." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const ws = useWorkspace();
  const [open, setOpen] = useState<string | null>(null);
  if (!ws.me.isAdmin) return <WorkspaceShell ws={ws} page="companies"><p className="text-sm text-muted-foreground">Acesso restrito ao administrador da plataforma. <Link to="/dashboard" search={{}} className="text-primary">Voltar ao painel</Link></p></WorkspaceShell>;
  return <WorkspaceShell ws={ws} page="companies">{open ? <Detail id={open} onBack={() => setOpen(null)} /> : <List onOpen={setOpen} />}</WorkspaceShell>;
}

function List({ onOpen }: { onOpen: (id: string) => void }) {
  const q = useQuery(companiesQuery);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const rows = (q.data ?? []).filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Clientes da plataforma. Cada empresa tem dados e acessos separados.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa" aria-label="Buscar empresa" className="h-9 w-52 rounded-full border border-border bg-card pl-8 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <Button className="rounded-full" onClick={() => setCreating(true)}><Plus />Nova empresa</Button>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2.5 font-medium">Empresa</th><th className="px-4 py-2.5 font-medium">Membros</th><th className="px-4 py-2.5 font-medium">Bitrix24</th><th className="px-4 py-2.5 font-medium">Última sincronização</th><th className="px-4 py-2.5 font-medium">Criada em</th></tr></thead>
          <tbody>
            {q.isLoading && [0, 1, 2].map((i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td></tr>)}
            {q.isError && <tr><td colSpan={5} className="px-4 py-8 text-center text-danger">{err(q.error)}</td></tr>}
            {q.isSuccess && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">{search ? "Nenhuma empresa encontrada." : "Nenhuma empresa ainda. Crie a primeira."}</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} onClick={() => onOpen(c.id)} className="cursor-pointer border-t border-border first:border-0 hover:bg-muted/40">
                <td className="px-4 py-3"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-muted"><Building2 className="size-4 text-muted-foreground" /></span><span className="font-medium">{c.name}</span></div></td>
                <td className="px-4 py-3 text-muted-foreground">{c.members}{c.managers ? ` · ${c.managers} gestor${c.managers > 1 ? "es" : ""}` : " · sem gestor"}</td>
                <td className="px-4 py-3">{c.bitrix ? <span className="inline-flex items-center gap-1.5"><span className={cn("size-1.5 rounded-full", c.bitrix.status === "error" ? "bg-danger" : "bg-success")} />{c.bitrix.domain}</span> : <span className="text-muted-foreground">Não conectado</span>}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.bitrix?.lastSyncAt ? new Date(c.bitrix.lastSyncAt).toLocaleString("pt-BR") : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CreateDialog open={creating} onOpenChange={setCreating} onCreated={onOpen} />
    </>
  );
}

function CreateDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createCompanyWithManager);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const r = await create({ data: { name, redirectTo: `${window.location.origin}/reset-password`, ...(email ? { managerEmail: email } : {}) } });
      toast.success(email ? `Empresa ${name} criada e convite enviado para ${email}.` : `Empresa ${name} criada.`);
      await qc.invalidateQueries({ queryKey: ["companies"] }); void qc.invalidateQueries({ queryKey: ["me"] });
      setName(""); setEmail(""); onOpenChange(false); onCreated(r.id);
    } catch (e2) { toast.error(err(e2)); } finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader><DialogTitle>Nova empresa</DialogTitle><DialogDescription>Já convide o primeiro gestor: ele conecta o Bitrix24 e chama o time.</DialogDescription></DialogHeader>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Nome da empresa</span><input autoFocus required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">E-mail do gestor <span className="font-normal text-muted-foreground">(opcional)</span></span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="gestor@empresa.com" className={field} /></label>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={busy || name.trim().length < 2}>{busy ? "Criando…" : "Criar empresa"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const q = useQuery(companiesQuery);
  const rename = useServerFn(renameCompany);
  const c = q.data?.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  if (!c) return <button onClick={onBack} className="text-sm text-primary">Voltar</button>;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try { await rename({ data: { id, name } }); toast.success("Nome atualizado."); setEditing(false); await qc.invalidateQueries({ queryKey: ["companies"] }); void qc.invalidateQueries({ queryKey: ["me"] }); }
    catch (e2) { toast.error(err(e2)); }
  }
  return (
    <>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" />Empresas</button>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {editing ? <form onSubmit={save} className="flex items-center gap-2"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={cn(field, "w-64")} /><Button size="sm" type="submit">Salvar</Button><Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>Cancelar</Button></form>
          : <><h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1><button aria-label="Renomear" onClick={() => { setName(c.name); setEditing(true); }} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"><Pencil className="size-3.5" /></button></>}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Membros" value={`${c.members}`} hint={c.managers ? `${c.managers} gestor${c.managers > 1 ? "es" : ""}` : "Sem gestor"} />
        <Stat label="Bitrix24" value={c.bitrix?.domain ?? "Não conectado"} hint={c.bitrix ? `${c.bitrix.deals} negócios` : "O gestor conecta em Integrações"} />
        <Stat label="Última sincronização" value={c.bitrix?.lastSyncAt ? new Date(c.bitrix.lastSyncAt).toLocaleString("pt-BR") : "—"} hint={c.bitrix?.status === "error" ? "Falhou" : c.bitrix ? "Automática a cada hora" : ""} />
      </div>
      <h2 className="mb-3 mt-8 font-semibold">Membros</h2>
      <MembersPanel companyId={c.id} companyName={c.name} />
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 truncate font-semibold">{value}</div><div className="mt-0.5 text-xs text-muted-foreground">{hint}</div></div>;
}
