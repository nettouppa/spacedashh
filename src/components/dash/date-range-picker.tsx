import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { PRESET_LABELS, periodLabel, range, type Period, type Preset } from "@/lib/crm-data";

const PRESETS: Preset[] = ["week", "month", "quarter", "semester", "year"];
// Calendar works in local time; the data layer uses UTC days.
const toLocal = (d: Date) => new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const startUtc = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
const endUtc = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1) - 1);

export function DateRangePicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const r = range(value);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from: Date; to: Date | undefined } | undefined>();
  const selected = draft ?? { from: toLocal(r.from), to: toLocal(r.to) };
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); setDraft(undefined); }}>
      <PopoverTrigger asChild>
        <button className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted" aria-label="Período">
          <CalendarIcon className="size-3.5 text-muted-foreground" />
          {r.preset && <span className="text-primary">{PRESET_LABELS[r.preset]}</span>}
          <span className={cn(r.preset && "text-muted-foreground")}>{periodLabel(value)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto p-0" align="start">
        <div className="flex w-36 flex-col gap-0.5 border-r border-border p-2">
          <p className="px-2 pb-1 pt-1 text-[11px] font-medium text-muted-foreground">Sugestões</p>
          {PRESETS.map((p) => (
            <button key={p} onClick={() => { onChange(p); setOpen(false); }}
              className={cn("rounded-md px-2 py-1.5 text-left text-sm", r.preset === p ? "bg-primary-soft font-medium text-accent-foreground" : "hover:bg-muted")}>
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        <Calendar mode="range" numberOfMonths={2} locale={ptBR} defaultMonth={selected.from} selected={selected}
          onSelect={(_v, day) => {
            if (!draft?.from) { setDraft({ from: day, to: undefined }); return; }
            const [a, b] = day < draft.from ? [day, draft.from] : [draft.from, day];
            onChange({ from: startUtc(a), to: endUtc(b) }); setOpen(false); setDraft(undefined);
          }}
          className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}
