import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserRound } from "lucide-react";
import { meQuery, useWorkspace, WorkspaceShell, COMPANY_KEY } from "@/lib/workspace";
import { getAiStatus } from "@/lib/ai-settings.functions";
import { AiSettingsCard } from "@/components/dash/ai-settings-card";
import { VoiceSettingsCard } from "@/components/dash/voice-settings-card";
import { AtlasPersonalitySettings } from "@/components/dash/atlas-personality-settings";
import { AtlasIcon } from "@/components/dash/atlas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  head: () => ({ meta: [
    { title: "Configurações — Spacedash" },
    { name: "description", content: "Configure o Atlas da empresa e os dados da sua conta no Spacedash." },
    { property: "og:title", content: "Configurações — Spacedash" },
    { property: "og:description", content: "Atlas, voz, personalidade e sua conta." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SettingsPage,
});

function SettingsPage() {
  const ws = useWorkspace();
  const aiStatus = useServerFn(getAiStatus);
  const aiQ = useQuery({ queryKey: ["ai-status", ws.companyId], queryFn: () => aiStatus({ data: { companyId: ws.companyId } }), enabled: !!ws.companyId });
  return (
    <WorkspaceShell ws={ws} page="settings">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <Tabs defaultValue={ws.membership ? "atlas" : "account"} className="mt-5">
        <TabsList>
          {ws.membership && <TabsTrigger value="atlas"><AtlasIcon className="size-4" />Atlas da empresa</TabsTrigger>}
          <TabsTrigger value="account"><UserRound className="size-4" />Minha conta</TabsTrigger>
        </TabsList>
        {ws.membership && <TabsContent value="atlas">
          {!ws.isManager && <p className="mb-3 text-sm text-muted-foreground">Somente gestores alteram as configurações do Atlas. Você pode consultar o que está em uso.</p>}
          <AiSettingsCard companyId={ws.companyId} canManage={ws.isManager} />
          <AtlasPersonalitySettings key={ws.companyId} companyId={ws.companyId} canManage={ws.isManager} connected={!!aiQ.data?.connected} />
          <VoiceSettingsCard companyId={ws.companyId} canManage={ws.isManager} connected={!!aiQ.data?.connected} />
        </TabsContent>}
        <TabsContent value="account"><AccountTab ws={ws} /></TabsContent>
      </Tabs>
    </WorkspaceShell>
  );
}

function AccountTab({ ws }: { ws: ReturnType<typeof useWorkspace> }) {
  const qc = useQueryClient();
  const [name, setName] = useState(ws.me.name);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const saveName = async () => {
    const v = name.trim().slice(0, 80);
    if (!v) return;
    setBusy("name");
    const { error } = await supabase.from("profiles").update({ display_name: v }).eq("id", ws.me.userId);
    setBusy(null);
    if (error) toast.error("Não foi possível salvar o nome."); else { toast.success("Nome atualizado."); void qc.invalidateQueries({ queryKey: ["me"] }); }
  };
  const savePw = async () => {
    if (pw.length < 8) { toast.error("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (pw !== pw2) { toast.error("As senhas não conferem."); return; }
    setBusy("pw");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(null);
    if (error) toast.error(error.message.includes("weak") || error.message.includes("pwned") ? "Senha fraca ou já vazada. Escolha outra." : "Não foi possível trocar a senha.");
    else { toast.success("Senha alterada."); setPw(""); setPw2(""); }
  };
  return (
    <div className="max-w-xl space-y-8 py-2">
      <section>
        <h2 className="font-semibold">Perfil</h2>
        <p className="text-sm text-muted-foreground">{ws.me.email}</p>
        <label className="mt-3 block text-xs font-medium text-muted-foreground">Nome exibido</label>
        <div className="mt-1 flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /><Button onClick={() => void saveName()} disabled={busy === "name" || !name.trim()}>Salvar</Button></div>
      </section>
      {ws.me.memberships.length > 1 && <section>
        <h2 className="font-semibold">Empresa padrão</h2>
        <p className="text-sm text-muted-foreground">Empresa que abre quando você entra neste navegador.</p>
        <select value={ws.companyId} onChange={(e) => { ws.setCompanyId(e.target.value); localStorage.setItem(COMPANY_KEY, e.target.value); toast.success("Empresa padrão salva."); }} className="mt-2 h-9 w-full rounded-md border border-border bg-card px-3 text-sm">
          {ws.me.memberships.map((m) => <option key={m.companyId} value={m.companyId}>{m.companyName}</option>)}
        </select>
      </section>}
      <section>
        <h2 className="font-semibold">Trocar senha</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input type="password" placeholder="Nova senha" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          <Input type="password" placeholder="Repita a nova senha" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        </div>
        <Button className="mt-2" variant="outline" onClick={() => void savePw()} disabled={busy === "pw" || !pw}>Trocar senha</Button>
      </section>
    </div>
  );
}
