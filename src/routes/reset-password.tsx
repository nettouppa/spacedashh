import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Definir senha — Spacedash" },
      { name: "description", content: "Crie ou redefina a senha da sua conta Spacedash." },
      { property: "og:title", content: "Definir senha — Spacedash" },
      { property: "og:description", content: "Crie ou redefina a senha de acesso ao Spacedash." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [invite, setInvite] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInvite(window.location.hash.includes("type=invite"));
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => { if (s && (e === "PASSWORD_RECOVERY" || e === "SIGNED_IN")) setReady(true); });
    const t = setTimeout(() => { void supabase.auth.getSession().then(({ data }) => setReady(!!data.session)); }, 800);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setMsg({ ok: false, text: "A senha precisa ter pelo menos 8 caracteres." });
    if (pw !== pw2) return setMsg({ ok: false, text: "As senhas não conferem." });
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "Não foi possível salvar a senha. Peça um novo link e tente de novo." });
    setMsg({ ok: true, text: "Senha salva. Entrando…" });
    setTimeout(() => void nav({ to: "/dashboard", replace: true }), 800);
  }

  const input = "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold tracking-tight">{invite ? "Bem-vindo ao Spacedash" : "Definir nova senha"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{invite ? "Crie a senha para acessar sua empresa." : "Escolha uma nova senha para sua conta."}</p>
        {ready === null && <p className="mt-5 text-sm text-muted-foreground">Verificando o link…</p>}
        {ready === false && <div className="mt-5 text-sm"><p className="text-danger">Este link expirou ou já foi usado.</p><Link to="/auth" className="mt-3 inline-block text-primary hover:underline">Voltar e pedir um novo link</Link></div>}
        {ready && <form onSubmit={submit} className="mt-5 space-y-3">
          <input type="password" autoComplete="new-password" required placeholder="Nova senha (mín. 8)" value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
          <input type="password" autoComplete="new-password" required placeholder="Repita a senha" value={pw2} onChange={(e) => setPw2(e.target.value)} className={input} />
          <button disabled={busy} className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{busy ? "Salvando…" : "Salvar senha"}</button>
        </form>}
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
