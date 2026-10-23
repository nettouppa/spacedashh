import { createFileRoute } from "@tanstack/react-router";

// The portal install event only finishes installation; tokens sent here are ignored.
// Tenant binding happens exclusively via the OAuth flow started by a Spacedash manager.
const ok = () =>
  new Response("Spacedash installer online", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

const finish = () =>
  new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><script src="//api.bitrix24.com/api/v1/"></script></head>
<body style="font-family:system-ui;padding:24px"><h2>Spacedash instalado</h2>
<p>Para ver seus dados, abra o Spacedash, vá em <b>Integrações</b> e clique em <b>Conectar Bitrix24</b>.</p>
<script>if (window.BX24) BX24.init(function(){ BX24.installFinish(); });</script></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

export const Route = createFileRoute("/api/public/bitrix/install")({
  server: { handlers: { GET: ok, HEAD: ok, POST: finish } },
});
