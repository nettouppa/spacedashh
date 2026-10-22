import { createFileRoute } from "@tanstack/react-router";
import { bitrixSetupUnavailable } from "@/lib/bitrix-policy";

export const Route = createFileRoute("/api/public/bitrix/install")({
  server: { handlers: { GET: () => bitrixSetupUnavailable(), POST: () => bitrixSetupUnavailable() } },
});