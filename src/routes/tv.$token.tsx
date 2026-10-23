import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useState } from "react";
import { getTvData } from "@/lib/tv.functions";
import { setDataset, setGoals, type Filters } from "@/lib/crm-data";
import { TvMode } from "@/components/dash/tv-mode";

export const Route = createFileRoute("/tv/$token")({
  head: () => ({
    meta: [
      { title: "Spacedash TV — Painel em tela cheia" },
      { name: "description", content: "Wallboard do Spacedash com rotação automática de painéis de vendas." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Spacedash TV" },
      { property: "og:description", content: "Painel de vendas em tela cheia para TVs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: TvPage,
});

function TvPage() {
  const { token } = Route.useParams();
  const load = useServerFn(getTvData);
  const q = useQuery({ queryKey: ["tv", token], queryFn: () => load({ data: { token } }), refetchInterval: 5 * 60_000, retry: 2 });
  const [f, setF] = useState<Filters>({ period: "month" });
  const set = useCallback((p: Partial<Filters>) => setF((x) => ({ ...x, ...p })), []);
  useMemo(() => { if (q.data) { setDataset(q.data.dataset); setGoals(q.data.goals); } }, [q.data]);
  const { refetch: rq } = q;
  const refetch = useCallback(() => { void rq(); }, [rq]);
  if (q.isLoading) return <div className="dark grid min-h-screen place-items-center bg-background text-2xl text-muted-foreground">Carregando painel…</div>;
  if (!q.data) return <div className="dark grid min-h-screen place-items-center bg-background p-8 text-center text-2xl text-foreground">Link de TV inválido ou revogado.<br /><span className="text-base text-muted-foreground">Peça um novo link ao gestor no Spacedash.</span></div>;
  return <TvMode f={f} set={set} views={q.data.views} interval={q.data.intervalSec} title={q.data.name} onRefresh={refetch} />;
}
