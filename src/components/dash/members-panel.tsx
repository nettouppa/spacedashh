import { useMemo, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MoreHorizontal, Search, UserPlus, Mail, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { listMembers, inviteToCompany, resendInvite, updateCompanyMember, removeCompanyMember, type MemberRow } from "@/lib/members.functions";
import type { MemberRole } from "@/lib/members-policy";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Seller = { id: string; name: string };
const field = "h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60";
const ROLE: Record<MemberRole, string> = { gestor: "Gestor", colaborador: "Colaborador" };
const redirectTo = () => `${window.location.origin}/reset-password`;
const err = (e: unknown) => (e instanceof Error ? e.message : "Algo deu errado. Tente de novo.");

export const membersQuery = (companyId: string) => queryOptions({ queryKey: ["members", companyId], queryFn: () => listMembers({ data: { companyId } }) });

function ago(iso: string | null) {
  if (!iso) return "—";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Hoje" : d === 1 ? "Ontem" : d < 30 ? `Há ${d} dias` : new Date(iso).toLocaleDateString("pt-BR");
}

export function MembersPanel({ companyId, companyName }: { companyId: string; companyName: string }) {
  const qc = useQueryClient();
  const q = useQuery(membersQuery(companyId));
  const update = useServerFn(updateCompanyMember);
  const remove = useServerFn(removeCompanyMember);
  const resend = useServerFn(resendInvite);
  const [tab, setTab] = useState<"active" | "pending">("active");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<MemberRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["members", companyId] });

  const members = q.data?.members ?? [];
  const sellers = q.data?.sellers ?? [];
  const sellerName = useMemo(() => new Map(sellers.map((s) => [s.id, s.name])), [sellers]);
  const active = members.filter((m) => !m.pending);
  const pending = members.filter((m) => m.pending);
  const list = (tab === "active" ? active : pending).filter((m) => `${m.name} ${m.email}`.toLowerCase().includes(search.toLowerCase()));
  const linked = new Set(members.map((m) => m.sellerRef).filter(Boolean));
  const unlinked = sellers.filter((s) => !linked.has(s.id)).length;

  async function act(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try { await fn(); toast.success(ok); await refresh(); } catch (e) { toast.error(err(e)); } finally { setBusy(null); }
  }

  if (q.isError) return <p className="rounded-xl border border-border bg-card p-6 text-sm text-danger">{err(q.error)}</p>;

  return (
    <div className="space-y-4">
      {sellers.length > 0 && unlinked > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p><span className="font-medium">{unlinked} vendedor{unlinked > 1 ? "es" : ""} do Bitrix24 sem acesso.</span> <span className="text-muted-foreground">Convide-os e vincule ao vendedor para que vejam os próprios números.</span></p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-[13px] font-medium">
          {([["active", "Ativos", active.length], ["pending", "Convites pendentes", pending.length]] as const).map(([k, l, n]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("rounded-full px-3.5 py-1.5 transition-colors", tab === k ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {l} <span className="ml-1 text-muted-foreground">{n}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pessoa" aria-label="Buscar pessoa" className="h-9 w-52 rounded-full border border-border bg-card pl-8 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <Button onClick={() => setInviteOpen(true)} className="rounded-full"><UserPlus />Convidar pessoas</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="px-4 py-2.5 font-medium">Pessoa</th><th className="px-4 py-2.5 font-medium">Perfil</th><th className="px-4 py-2.5 font-medium">Vendedor no CRM</th><th className="px-4 py-2.5 font-medium">{tab === "active" ? "Último acesso" : "Convidado em"}</th><th className="w-12" /></tr>
          </thead>
          <tbody>
            {q.isLoading && [0, 1, 2].map((i) => <tr key={i} className="border-t border-border first:border-0"><td colSpan={5} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-muted" /></td></tr>)}
            {!q.isLoading && list.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">{search ? "Ninguém encontrado." : tab === "active" ? "Ninguém com acesso ainda." : "Nenhum convite pendente."}</td></tr>}
            {list.map((m) => {
              const me = m.userId === q.data?.me;
              const save = (role: MemberRole, sellerRef: string | null) => act(m.id, () => update({ data: { id: m.id, role, sellerRef } }), "Acesso atualizado.");
              return (
                <tr key={m.id} className="border-t border-border first:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">{(m.name || m.email).charAt(0).toUpperCase()}</span>
                      <div className="min-w-0"><div className="truncate font-medium">{m.name || m.email}{me && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(você)</span>}</div><div className="truncate text-xs text-muted-foreground">{m.email}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", m.role === "gestor" ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground")}>{ROLE[m.role]}</span></td>
                  <td className="px-4 py-2.5">
                    <select aria-label="Vendedor no CRM" disabled={busy === m.id} value={m.sellerRef ?? ""} onChange={(e) => void save(m.role, e.target.value || null)} className={cn(field, "h-8 max-w-52")}>
                      <option value="">Sem vínculo</option>
                      {m.sellerRef && !sellerName.has(m.sellerRef) && <option value={m.sellerRef}>Usuário {m.sellerRef}</option>}
                      {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{ago(tab === "active" ? m.lastSignInAt : m.createdAt)}</td>
                  <td className="px-2 py-2.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button aria-label="Ações" disabled={busy === m.id} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="size-4" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => void save(m.role === "gestor" ? "colaborador" : "gestor", m.sellerRef)}>Tornar {m.role === "gestor" ? "colaborador" : "gestor"}</DropdownMenuItem>
                        {m.sellerRef && <DropdownMenuItem onClick={() => void save(m.role, null)}>Desvincular vendedor</DropdownMenuItem>}
                        {m.pending && <DropdownMenuItem onClick={() => void act(m.id, () => resend({ data: { id: m.id, redirectTo: redirectTo() } }), `Convite reenviado para ${m.email}.`)}><Mail />Reenviar convite</DropdownMenuItem>}
                        {!me && <><DropdownMenuSeparator /><DropdownMenuItem className="text-danger focus:text-danger" onClick={() => setRemoving(m)}><Trash2 />{m.pending ? "Cancelar convite" : "Remover acesso"}</DropdownMenuItem></>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} companyId={companyId} companyName={companyName} sellers={sellers} taken={linked} onDone={refresh} />

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{removing?.pending ? "Cancelar convite?" : "Remover acesso?"}</AlertDialogTitle>
            <AlertDialogDescription>{removing?.name || removing?.email} deixa de acessar {companyName}. Você pode convidar de novo depois.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" onClick={() => { const m = removing; setRemoving(null); if (m) void act(m.id, () => remove({ data: { id: m.id } }), m.pending ? "Convite cancelado." : "Acesso removido."); }}>
              {removing?.pending ? "Cancelar convite" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InviteDialog({ open, onOpenChange, companyId, companyName, sellers, taken, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; companyId: string; companyName: string; sellers: Seller[]; taken: Set<string | null>; onDone: () => void }) {
  const invite = useServerFn(inviteToCompany);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("colaborador");
  const [seller, setSeller] = useState("");
  const [busy, setBusy] = useState(false);
  // Suggest the CRM seller whose name matches the e-mail's local part.
  const suggestion = useMemo(() => {
    const local = email.split("@")[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
    if (local.length < 3) return null;
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
    return sellers.find((s) => !taken.has(s.id) && (norm(s.name).startsWith(local) || local.startsWith(norm(s.name.split(" ")[0] ?? "")))) ?? null;
  }, [email, sellers, taken]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const r = await invite({ data: { companyId, email, role, redirectTo: redirectTo(), ...(seller ? { sellerRef: seller } : {}) } });
      localStorage.setItem("sd-used-team", "1");
      toast.success(r.invited ? `Convite enviado para ${email}.` : `${email} já tinha conta e agora acessa ${companyName}.`);
      setEmail(""); setSeller(""); setRole("colaborador"); onOpenChange(false); onDone();
    } catch (e2) { toast.error(err(e2)); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Convidar para {companyName}</DialogTitle>
            <DialogDescription>A pessoa recebe um e-mail para criar a senha e entrar.</DialogDescription>
          </DialogHeader>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">E-mail</span>
            <input autoFocus type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com" className={field} /></label>
          <div className="space-y-1.5 text-sm"><span className="font-medium">Perfil</span>
            <div className="grid grid-cols-2 gap-2">
              {(["colaborador", "gestor"] as const).map((r) => (
                <button type="button" key={r} onClick={() => setRole(r)} className={cn("rounded-lg border p-3 text-left transition-colors", role === r ? "border-primary bg-primary-soft" : "border-border hover:bg-muted/50")}>
                  <div className="font-medium">{ROLE[r]}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{r === "gestor" ? "Vê tudo e gerencia o time" : "Vê só os próprios números"}</div>
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-1.5 text-sm"><span className="font-medium">Vendedor no Bitrix24</span>
            <select value={seller} onChange={(e) => setSeller(e.target.value)} className={field}>
              <option value="">Sem vínculo</option>
              {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {suggestion && !seller && <button type="button" onClick={() => setSeller(suggestion.id)} className="text-xs text-primary hover:underline">Sugestão: vincular a {suggestion.name}</button>}
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy || !email}>{busy ? "Enviando…" : "Enviar convite"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
