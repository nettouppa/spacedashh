export type MemberRole = "gestor" | "colaborador";

/** Who may invite, edit or remove people in a company: platform admin or a manager of that company. */
export function canManageMembers(isAdmin: boolean, role: MemberRole | null | undefined): boolean {
  return isAdmin || role === "gestor";
}

/** An invite is pending while the invited user never signed in. */
export function isPending(lastSignInAt: string | null | undefined): boolean {
  return !lastSignInAt;
}
