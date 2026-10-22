import { BarChart3, Users, LayoutDashboard, Filter, Plug, Settings, Search, Bell, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: LayoutDashboard, label: "Visão geral", active: true },
  { icon: Filter, label: "Pipeline" },
  { icon: Users, label: "Equipe" },
  { icon: BarChart3, label: "Relatórios" },
];

export function AppShell({ children, topRight, userName, userPhoto }: { children: React.ReactNode; topRight: React.ReactNode; userName: string; userPhoto: string }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">S</span>
          <span className="text-sm font-semibold">Spacedash</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-subtle-foreground">Análise</p>
          {NAV.map((n) => (
            <a key={n.label} className={cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm", n.active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60")}>
              <n.icon className="size-4" />{n.label}
            </a>
          ))}
          <p className="px-2 pb-1 pt-5 text-[11px] font-medium text-subtle-foreground">Workspace</p>
          <a className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/60"><Plug className="size-4" />Integrações<span className="ml-auto flex items-center gap-1 text-[11px] text-success"><span className="size-1.5 rounded-full bg-success" />Bitrix24</span></a>
          <a className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/60"><Settings className="size-4" />Configurações</a>
        </nav>
        <div className="flex items-center gap-2.5 border-t border-border p-3">
          <img src={userPhoto} alt="" className="size-7 rounded-full" />
          <div className="min-w-0 text-sm"><div className="truncate font-medium">{userName}</div><div className="text-xs text-muted-foreground">Violeta Group</div></div>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">Dashboards<ChevronRight className="size-3.5" /><span className="font-medium text-foreground">CRM & Vendas</span></div>
          <div className="mx-auto hidden h-8 w-72 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-sm text-subtle-foreground md:flex">
            <Search className="size-3.5" />Buscar negócios, pessoas…<kbd className="ml-auto rounded border border-border px-1 text-[10px]">⌘K</kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">{topRight}<button aria-label="Notificações" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"><Bell className="size-4" /></button></div>
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
