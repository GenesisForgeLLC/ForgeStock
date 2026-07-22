"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { recordPrintBatch } from "@/lib/actions/inventory";
import type { ActionState } from "@/lib/actions/util";
import { useActionToast } from "@/components/forms/use-action-toast";
import { computeBatchCost } from "@/lib/calc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { MoneyText } from "@/components/money-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductOption {
  id: string;
  name: string;
  estimated_print_time_minutes: number;
  estimated_filament_grams: number;
}

export function BatchForm({
  products,
  defaultFilamentCents,
  defaultMachineCents,
  presetProductId,
}: {
  products: ProductOption[];
  defaultFilamentCents: number;
  defaultMachineCents: number;
  presetProductId?: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(recordPrintBatch, null);
  useActionToast(state, () => router.push("/inventory"));

  const [productId, setProductId] = useState(presetProductId ?? products[0]?.id ?? "");
  const [started, setStarted] = useState(1);
  const [failed, setFailed] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [grams, setGrams] = useState(0);
  const [filament, setFilament] = useState<number | null>(defaultFilamentCents);
  const [machine, setMachine] = useState<number | null>(defaultMachineCents);
  const [otherCost, setOtherCost] = useState<number | null>(0);

  const successful = Math.max(0, started - failed);

  const cost = useMemo(
    () =>
      computeBatchCost({
        totalFilamentGrams: grams,
        filamentCostPerKgCents: filament ?? 0,
        totalPrintMinutes: minutes,
        machineCostPerHourCents: machine ?? 0,
        otherBatchCostCents: otherCost ?? 0,
        quantitySuccessful: successful,
      }),
    [grams, filament, minutes, machine, otherCost, successful],
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="printed_at" value={new Date().toISOString()} />
      <input type="hidden" name="quantity_successful" value={successful} />
      <input type="hidden" name="filament_cost_per_kg_cents_snapshot" value={filament ?? 0} />
      <input type="hidden" name="machine_cost_per_hour_cents_snapshot" value={machine ?? 0} />
      <input type="hidden" name="other_batch_cost_cents" value={otherCost ?? 0} />

      <Card>
        <CardHeader>
          <CardTitle>Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select
              value={productId}
              onValueChange={(v) => {
                setProductId(v);
                const p = products.find((x) => x.id === v);
                if (p) {
                  setMinutes(p.estimated_print_time_minutes);
                  setGrams(p.estimated_filament_grams);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity_started">Quantity started</Label>
              <Input
                id="quantity_started"
                name="quantity_started"
                type="number"
                inputMode="numeric"
                min={1}
                value={started}
                onChange={(e) => setStarted(Math.max(1, Number(e.target.value) || 1))}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity_failed">Failed</Label>
              <Input
                id="quantity_failed"
                name="quantity_failed"
                type="number"
                inputMode="numeric"
                min={0}
                max={started}
                value={failed}
                onChange={(e) => setFailed(Math.min(started, Math.max(0, Number(e.target.value) || 0)))}
                className="tabular-nums"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-success">{successful}</span> successful units will be
            added to inventory.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time &amp; materials</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="total_print_time_minutes">Total print time (min)</Label>
            <Input
              id="total_print_time_minutes"
              name="total_print_time_minutes"
              type="number"
              inputMode="decimal"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Number(e.target.value) || 0))}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_filament_grams">Total filament (g)</Label>
            <Input
              id="total_filament_grams"
              name="total_filament_grams"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={grams}
              onChange={(e) => setGrams(Math.max(0, Number(e.target.value) || 0))}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label>Filament cost / kg</Label>
            <MoneyInput valueCents={filament} onValueChange={setFilament} />
          </div>
          <div className="space-y-2">
            <Label>Machine cost / hour</Label>
            <MoneyInput valueCents={machine} onValueChange={setMachine} />
          </div>
          <div className="space-y-2">
            <Label>Other batch cost</Label>
            <MoneyInput valueCents={otherCost} onValueChange={setOtherCost} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost preview</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Material</dt>
            <dd className="text-right"><MoneyText cents={cost.materialCostCents} /></dd>
            <dt className="text-muted-foreground">Machine</dt>
            <dd className="text-right"><MoneyText cents={cost.machineCostCents} /></dd>
            <dt className="text-muted-foreground">Total batch cost</dt>
            <dd className="text-right font-medium"><MoneyText cents={cost.totalCostCents} /></dd>
            <dt className="font-medium">Cost per unit</dt>
            <dd className="text-right font-semibold text-primary"><MoneyText cents={cost.unitCostCents} /></dd>
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="Optional" />
      </div>

      <SubmitButton size="lg" disabled={!productId}>
        Record batch
      </SubmitButton>
    </form>
  );
}
