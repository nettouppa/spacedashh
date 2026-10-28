export function canManageBitrix(isAdmin: boolean, role: "gestor" | "colaborador" | null): boolean {
  return isAdmin || role === "gestor";
}

/** Accepts "empresa.bitrix24.com.br", "https://empresa.bitrix24.com/..." etc. Returns a bare hostname or null. */
export function normalizePortalDomain(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "";
  if (s.length > 253) return null;
  if (!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(s)) return null;
  return s;
}

/** Parses a Bitrix24 inbound webhook: https://<portal>/rest/<userId>/<key>/ (trailing method part is ignored). */
export function parseWebhookUrl(input: string): { url: string; domain: string; userId: string } | null {
  let u: URL;
  try { u = new URL(input.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const domain = normalizePortalDomain(u.hostname);
  const m = u.pathname.match(/^\/rest\/(\d+)\/([A-Za-z0-9]{6,64})(?:\/|$)/);
  if (!domain || !m) return null;
  return { url: `https://${domain}/rest/${m[1]}/${m[2]}/`, domain, userId: m[1]! };
}

/** A portal may be bound to only one Spacedash company. */
export function canBindPortal(existingCompanyId: string | null, companyId: string): boolean {
  return existingCompanyId === null || existingCompanyId === companyId;
}
