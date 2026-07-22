"use client";

import { useMoney } from "@/components/app-settings";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "destructive" | "primary";

const toneClasses: Record<Tone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-amber-400",
  destructive: "text-destructive",
  primary: "text-primary",
};

export function StatCard({
  label,
  value,
  valueCents,
  hint,
  tone = "default",
}: {
  label: string;
  value?: string;
  valueCents?: number;
  hint?: string;
  tone?: Tone;
}) {
  const money = useMoney();
  const display = valueCents !== undefined ? money(valueCents) : value;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", toneClasses[tone])}>{display}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
