import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, LayoutDashboard, Plug, Settings, ShieldCheck, Users, Sparkles } from "lucide-react";
import { AtlasIcon } from "./atlas";

export type PaletteCommand = { id: string; label: string; group: string; shortcut?: string; run: () => void };

const SHORTCUTS: [string, string][] = [
  ["Ctrl/⌘ + K", "Abrir a busca rápida"],
  ["G depois P", "Ir para o Painel"],
  ["G depois E", "Ir para Equipe"],
  ["G depois R", "Ir para Relatórios"],
  ["G depois I", "Ir para Integrações"],
  ["A", "Abrir o Atlas"],
  ["T", "Modo TV"],
  ["Ctrl/⌘ + Z", "Desfazer o último filtro"],
  ["[", "Recolher/expandir o menu"],
  ["?", "Ver estes atalhos"],
];

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};

export function CommandPalette({ commands = [], isAdmin, onToggleMenu }: { commands?: PaletteCommand[]; isAdmin: boolean; onToggleMenu: () => void }) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const g = useRef(0);
  const cmds = useRef(commands);
  cmds.current = commands;

  useEffect(() => {
    const go = (to: string) => void nav({ to });
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || document.querySelector("[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (Date.now() - g.current < 1000) {
        g.current = 0;
        const map: Record<string, string> = { p: "/dashboard", e: "/team", r: "/reports", i: "/integrations", c: "/settings" };
        if (map[k]) { e.preventDefault(); go(map[k]); }
        return;
      }
      if (k === "g") { g.current = Date.now(); return; }
      if (e.key === "?") { e.preventDefault(); setHelp(true); return; }
      if (e.key === "[") { e.preventDefault(); onToggleMenu(); return; }
      const hit = cmds.current.find((c) => c.shortcut?.toLowerCase() === k);
      if (hit) { e.preventDefault(); hit.run(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, onToggleMenu]);

  const run = (fn: () => void) => { setOpen(false); setQ(""); setTimeout(fn, 0); };
  const ask = cmds.current.find((c) => c.id === "atlas-ask");
  const groups = [...new Set(commands.filter((c) => c.id !== "atlas-ask").map((c) => c.group))];
  const pages = [
    { to: "/dashboard", label: "Painel", icon: LayoutDashboard, sc: "G P" },
    { to: "/team", label: "Equipe", icon: Users, sc: "G E" },
    { to: "/reports", label: "Relatórios", icon: BarChart3, sc: "G R" },
    { to: "/integrations", label: "Integrações", icon: Plug, sc: "G I" },
    { to: "/settings", label: "Configurações", icon: Settings, sc: "G C" },
    ...(isAdmin ? [{ to: "/admin", label: "Administração", icon: ShieldCheck, sc: "" }] : []),
  ];

  return (
    <>
      <CommandDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
        <CommandInput placeholder="Buscar páginas, painéis, vendedores ou perguntar ao Atlas…" value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          {ask && q.trim().length > 2 && (
            <CommandGroup heading="Atlas">
              <CommandItem value={`atlas ${q}`} onSelect={() => run(() => window.dispatchEvent(new CustomEvent("atlas:ask", { detail: q.trim() })))}>
                <AtlasIcon className="size-4" />Perguntar ao Atlas: “{q.trim()}”
              </CommandItem>
            </CommandGroup>
          )}
          <CommandGroup heading="Ir para">
            {pages.map((p) => (
              <CommandItem key={p.to} value={`ir ${p.label}`} onSelect={() => run(() => void nav({ to: p.to }))}>
                <p.icon className="size-4" />{p.label}{p.sc && <CommandShortcut>{p.sc}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
          {groups.map((gr) => (
            <CommandGroup key={gr} heading={gr}>
              {commands.filter((c) => c.group === gr && c.id !== "atlas-ask").map((c) => (
                <CommandItem key={c.id} value={`${gr} ${c.label}`} onSelect={() => run(c.run)}>
                  <Sparkles className="size-4 opacity-0" />{c.label}{c.shortcut && <CommandShortcut>{c.shortcut.toUpperCase()}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandGroup heading="Ajuda">
            <CommandItem value="atalhos de teclado" onSelect={() => run(() => setHelp(true))}>Atalhos de teclado<CommandShortcut>?</CommandShortcut></CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="max-w-md">
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <ul className="divide-y divide-border text-sm">
            {SHORTCUTS.map(([k, d]) => (
              <li key={k} className="flex items-center justify-between py-2"><span className="text-muted-foreground">{d}</span><kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">{k}</kbd></li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
