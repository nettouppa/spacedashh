import { createFileRoute, redirect } from "@tanstack/react-router";

// Old address: the admin area now lives at /companies (platform) and /members (company).
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => { throw redirect({ to: "/companies", replace: true }); },
});
