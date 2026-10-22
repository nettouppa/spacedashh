export function canManageBitrix(isAdmin: boolean, role: "gestor" | "colaborador" | null): boolean {
  return isAdmin || role === "gestor";
}

export const BITRIX_SETUP_URLS = {
  installation: "https://spacedashh.lovable.app/api/public/bitrix/install",
  callback: "https://spacedashh.lovable.app/api/public/bitrix/callback",
};

// Until credentials and verified tenant binding exist, callbacks must never accept tokens.
export function bitrixSetupUnavailable(): Response {
  return Response.json({ error: "A instalação do Spacedash ainda não está habilitada. Nenhuma credencial foi armazenada." }, {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}