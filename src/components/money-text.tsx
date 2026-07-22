"use client";

import { useMoney } from "@/components/app-settings";
import { cn } from "@/lib/utils";

/** Render integer cents as currency using the user's configured currency. */
export function MoneyText({
  cents,
  className,
}: {
  cents: number | null | undefined;
  className?: string;
}) {
  const money = useMoney();
  return <span className={cn("tabular-nums", className)}>{money(cents)}</span>;
}
