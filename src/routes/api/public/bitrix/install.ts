import { createFileRoute } from "@tanstack/react-router";
import { bitrixSetupUnavailable } from "@/lib/bitrix-policy";

// GET/HEAD answer Bitrix24's reachability check; POST (actual install with tokens) stays fail-closed.
const ok = () =>
  new Response("Spacedash installer online", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

export const Route = createFileRoute("/api/public/bitrix/install")({
  server: { handlers: { GET: ok, HEAD: ok, POST: () => bitrixSetupUnavailable() } },
});
