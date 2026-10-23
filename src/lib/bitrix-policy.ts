export function canManageBitrix(isAdmin: boolean, role: "gestor" | "colaborador" | null): boolean {
  return isAdmin || role === "gestor";
}

export const BITRIX_SETUP_URLS = {
  installation: "https://spacedashh.lovable.app/api/public/bitrix/install",
  callback: "https://spacedashh.lovable.app/api/public/bitrix/callback",
};

/** Accepts "empresa.bitrix24.com.br", "https://empresa.bitrix24.com/..." etc. Returns a bare hostname or null. */
export function normalizePortalDomain(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "";
  if (s.length > 253) return null;
  if (!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(s)) return null;
  return s;
}

/** OAuth states are single-use and expire after 15 minutes. */
export const STATE_TTL_MS = 15 * 60 * 1000;
export function isStateValid(createdAt: Date, usedAt: Date | null, now: Date): boolean {
  return usedAt === null && now.getTime() - createdAt.getTime() <= STATE_TTL_MS;
}

/** A portal may be bound to only one Spacedash company. */
export function canBindPortal(existingCompanyId: string | null, companyId: string): boolean {
  return existingCompanyId === null || existingCompanyId === companyId;
}
