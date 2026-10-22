import { createContext, useContext, useState } from "react";
import { MessageCircleQuestion, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export function AtlasIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cn("size-4", className)} aria-hidden>
      <path d="M12 2.5a8 8 0 0 0-8 8v3.5a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-3.5a8 8 0 0 0-8-8Z" />
      <rect x="6.5" y="8" width="11" height="7.5" rx="3.5" />
      <path d="M9.5 10.5c.6-.6 1.4-.9 2.2-.9" />
      <path d="M2.5 10v4M21.5 10v4M9 20.5v1.5h6v-1.5" />
    </svg>
  );
}

export type AtlasRequest = { mode: "explain" | "ask"; topic: string; id: number };
type Ctx = { request: (mode: "explain" | "ask", topic: string) => void; hidden: boolean };
export const AtlasContext = createContext<Ctx>({ request: () => {}, hidden: false });

export function AtlasTrigger({ topic }: { topic: string }) {
  const { request, hidden } = useContext(AtlasContext);
  const [open, setOpen] = useState(false);
  if (hidden) return null;
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button onClick={() => request("ask", topic)} aria-label={`Atlas: ${topic}`}
        className="grid size-7 place-items-center rounded-md text-subtle-foreground transition hover:bg-primary-soft hover:text-primary">
        <AtlasIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 pt-1">
          <div className="w-44 rounded-lg border border-border bg-card p-1 shadow-soft">
            <button onClick={() => { setOpen(false); request("explain", topic); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"><Lightbulb className="size-3.5 text-primary" />Explique-me</button>
            <button onClick={() => { setOpen(false); request("ask", topic); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"><MessageCircleQuestion className="size-3.5 text-primary" />Pergunte-me</button>
          </div>
        </div>
      )}
    </div>
  );
}
