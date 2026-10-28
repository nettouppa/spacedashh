import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CommandPalette, type PaletteCommand } from "./command-palette";
import { Link } from "@tanstack/react-router";
import { Building2, UserCog, LogOut, Menu, Search, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BarChart3, Users, LayoutDashboard, Plug, Settings, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ShellPage = "dashboard" | "pipeline" | "team" | "reports" | "integrations" | "settings" | "members" | "companies";

const CRUMB: Record<ShellPage, [string, string]> = {
  dashboard: ["Análise", "Painel"],
  pipeline: ["Análise", "Painel"],
  team: ["Análise", "Equipe"],
  reports: ["Análise", "Relatórios"],
  integrations: ["Workspace", "Integrações"],
  settings: ["Workspace", "Configurações"],
  members: ["Workspace", "Membros"],
  companies: ["Plataforma", "Empresas"],
};

function Nav({ page, compact, isAdmin, canManage, onNavigate }: { page: ShellPage; compact: boolean; isAdmin: boolean; canManage: boolean; onNavigate?: () => void }) {
  const item = (on: boolean) => cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm", on ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60");
  return (
    <nav className="flex-1 space-y-0.5 p-3">
      {!compact && <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-subtle-foreground">Análise</p>}
      <Link to="/dashboard" search={{}} onClick={onNavigate} title="Painel" className={item(page === "dashboard" || page === "pipeline")}><LayoutDashboard className="size-4" />{!compact && "Painel"}</Link>
      <Link to="/team" onClick={onNavigate} title="Equipe" className={item(page === "team")}><Users className="size-4" />{!compact && "Equipe"}</Link>
      <Link to="/reports" onClick={onNavigate} title="Relatórios" className={item(page === "reports")}><BarChart3 className="size-4" />{!compact && "Relatórios"}</Link>
      {compact ? <div className="my-3 border-t border-border" /> : <p className="px-2 pb-1 pt-5 text-[11px] font-medium text-subtle-foreground">Workspace</p>}
      <Link to="/integrations" onClick={onNavigate} title="Integrações" className={item(page === "integrations")}><Plug className="size-4" />{!compact && <>Integrações<span className="ml-auto text-[11px] text-muted-foreground">Bitrix24</span></>}</Link>
      {canManage && <Link to="/members" onClick={onNavigate} title="Membros" className={item(page === "members")}><UserCog className="size-4" />{!compact && "Membros"}</Link>}
      <Link to="/settings" onClick={onNavigate} title="Configurações" className={item(page === "settings")}><Settings className="size-4" />{!compact && "Configurações"}</Link>
      {isAdmin && <>
        {compact ? <div className="my-3 border-t border-border" /> : <p className="px-2 pb-1 pt-5 text-[11px] font-medium text-subtle-foreground">Plataforma</p>}
        <Link to="/companies" onClick={onNavigate} title="Empresas" className={item(page === "companies")}><Building2 className="size-4" />{!compact && "Empresas"}</Link>
      </>}
    </nav>
  );
}

function UserBox({ compact, userName, userPhoto, companyName, roleLabel, onSignOut }: { compact: boolean; userName: string; userPhoto: string; companyName: string; roleLabel: string; onSignOut: () => void }) {
  return (
    <div className={cn("flex items-center gap-2.5 border-t border-border p-3", compact && "flex-col")}>
      {userPhoto ? <img src={userPhoto} alt="" className="size-7 rounded-full" /> : <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{userName.charAt(0).toUpperCase()}</span>}
      {!compact && <div className="min-w-0 flex-1 text-sm"><div className="truncate font-medium">{userName}</div><div className="truncate text-xs text-muted-foreground">{companyName} · {roleLabel}</div></div>}
      <button onClick={onSignOut} title="Sair" aria-label="Sair" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4" /></button>
    </div>
  );
}

export function AppShell({ children, topRight, userName, userPhoto, compact: atlasOpen = false, companyName, roleLabel, isAdmin, canManage = isAdmin, onSignOut, page = "dashboard", commands }: { canManage?: boolean; commands?: PaletteCommand[]; page?: ShellPage; compact?: boolean; children: ReactNode; topRight?: ReactNode; userName: string; userPhoto: string; companyName: string; roleLabel: string; isAdmin: boolean; onSignOut: () => void }) {
  const [mobile, setMobile] = useState(false);
  const [folded, setFolded] = useState(false);
  useEffect(() => { setFolded(localStorage.getItem("sd-menu-folded") === "1"); }, []);
  const toggleMenu = useCallback(() => setFolded((v) => { localStorage.setItem("sd-menu-folded", v ? "0" : "1"); return !v; }), []);
  const compact = atlasOpen || folded;
  const user = { userName, userPhoto, companyName, roleLabel, onSignOut };
  const Brand = ({ small }: { small: boolean }) => (
    <div className="flex h-14 items-center gap-2 border-b border-border px-5">
      <span className="grid size-7 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">S</span>
      {!small && <span className="text-sm font-semibold">Spacedash</span>}
    </div>
  );
  return (
    <div className="min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border bg-card transition-[width] duration-300 lg:flex", compact ? "w-16" : "w-60")}>
        <Brand small={compact} />
        <Nav page={page} compact={compact} isAdmin={isAdmin} canManage={canManage} />
        {!atlasOpen && <button onClick={toggleMenu} title={folded ? "Expandir menu ( [ )" : "Recolher menu ( [ )"} aria-label="Recolher ou expandir menu" className="mx-3 mb-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted">{folded ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" />Recolher</>}</button>}
        <UserBox compact={compact} {...user} />
      </aside>
      <CommandPalette commands={commands} isAdmin={isAdmin} onToggleMenu={toggleMenu} />
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Brand small={false} />
          <Nav page={page} compact={false} isAdmin={isAdmin} canManage={canManage} onNavigate={() => setMobile(false)} />
          <UserBox compact={false} {...user} />
        </SheetContent>
      </Sheet>
      <div className={cn("transition-[padding] duration-300", atlasOpen ? "lg:pl-16 lg:pr-[400px]" : compact ? "lg:pl-16" : "lg:pl-60")}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setMobile(true)} aria-label="Abrir menu" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted lg:hidden"><Menu className="size-4" /></button>
          <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground"><span className="hidden sm:inline">{CRUMB[page][0]}</span><ChevronRight className="hidden size-3.5 sm:block" /><span className="truncate font-medium text-foreground">{CRUMB[page][1]}</span></div>
          <button data-tour="search" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))} className="ml-2 hidden h-8 w-56 items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 text-[13px] text-muted-foreground hover:bg-muted md:flex"><Search className="size-3.5" />Buscar ou perguntar…<kbd className="ml-auto rounded border border-border bg-card px-1 font-mono text-[10px]">⌘K</kbd></button>
          <div className="ml-auto flex items-center gap-2 overflow-x-auto">{topRight}</div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-muted p-0.5">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={cn("rounded px-3 py-1 text-[13px] font-medium transition", value === o.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{o.l}</button>
      ))}
    </div>
  );
}
