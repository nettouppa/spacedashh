import { createFileRoute } from "@tanstack/react-router";
import { meQuery, useWorkspace, WorkspaceShell } from "@/lib/workspace";
import { MembersPanel } from "@/components/dash/members-panel";

export const Route = createFileRoute("/_authenticated/members")({
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  head: () => ({ meta: [
    { title: "Membros — Spacedash" },
    { name: "description", content: "Convide pessoas, defina perfis e vincule cada uma ao vendedor do Bitrix24." },
    { property: "og:title", content: "Membros — Spacedash" },
    { property: "og:description", content: "Gestão de acessos da empresa no Spacedash." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MembersPage,
});

function MembersPage() {
  const ws = useWorkspace();
  return (
    <WorkspaceShell ws={ws} page="members">
      <h1 className="text-2xl font-semibold tracking-tight">Membros</h1>
      <p className="mt-1 text-sm text-muted-foreground">Quem acessa {ws.membership?.companyName ?? "a empresa"} e o que cada pessoa vê. Só entra quem for convidado.</p>
      <div className="mt-6">
        {!ws.membership ? <p className="text-sm text-muted-foreground">Sua conta ainda não está vinculada a uma empresa.</p>
          : !ws.isManager ? <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Apenas gestores gerenciam os membros. Fale com o gestor da sua empresa para convidar alguém.</p>
          : <MembersPanel key={ws.companyId} companyId={ws.companyId} companyName={ws.membership.companyName} />}
      </div>
    </WorkspaceShell>
  );
}
