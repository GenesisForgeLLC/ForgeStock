"use client";

import * as React from "react";
import { Input } from "./input";
import { parseDollarsToCents, formatCentsPlain } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * A dollar-denominated input that reports its value to the parent as integer
 * cents. The user always sees familiar dollars; storage is always cents.
 */
export interface MoneyInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  valueCents: number | null;
  onValueChange: (cents: number | null) => void;
}

export function MoneyInput({ valueCents, onValueChange, className, ...props }: MoneyInputProps) {
  const [text, setText] = React.useState<string>(
    valueCents === null || valueCents === undefined ? "" : formatCentsPlain(valueCents),
  );

  // Keep local text in sync when the parent resets the value.
  React.useEffect(() => {
    const asCents = parseDollarsToCents(text);
    if (asCents !== valueCents) {
      setText(valueCents === null || valueCents === undefined ? "" : formatCentsPlain(valueCents));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueCents]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
      <Input
        inputMode="decimal"
        className={cn("pl-7 tabular-nums", className)}
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw.trim() === "") {
            onValueChange(null);
          } else {
            const cents = parseDollarsToCents(raw);
            if (cents !== null) onValueChange(cents);
          }
        }}
        onBlur={() => {
          const cents = parseDollarsToCents(text);
          setText(cents === null ? "" : formatCentsPlain(cents));
        }}
        {...props}
      />
    </div>
  );
}
