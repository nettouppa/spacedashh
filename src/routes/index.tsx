import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spacedash — BI comercial para Bitrix24" },
      { name: "description", content: "Painéis de vendas, funil, atividades, tarefas e atendimento do Bitrix24, com filtros cruzados, modo TV e o copiloto Atlas." },
      { property: "og:title", content: "Spacedash — BI comercial para Bitrix24" },
      { property: "og:description", content: "Painéis personalizados sobre seus dados do Bitrix24, com permissões para gestores e colaboradores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const nav = useNavigate();
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { if (data.user) void nav({ to: "/dashboard", replace: true }); });
  }, [nav]);
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-lg text-center">
        <span className="mx-auto grid size-10 place-items-center rounded-lg bg-primary text-base font-bold text-primary-foreground">S</span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Spacedash</h1>
        <p className="mt-3 text-muted-foreground">BI comercial para Bitrix24: vendas, funil, atividades, tarefas e atendimento em painéis que cada equipe monta do seu jeito.</p>
        <Link to="/auth" className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Entrar</Link>
      </div>
    </div>
  );
}
