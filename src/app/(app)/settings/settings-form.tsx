"use client";

import { useActionState, useState } from "react";
import { updateSettings } from "@/lib/actions/settings";
import { useActionToast } from "@/components/forms/use-action-toast";
import type { ActionState } from "@/lib/actions/util";
import type { Profile } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, TAX_MODES, TAX_MODE_LABELS } from "@/config/app";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ActionState, FormData>(updateSettings, null);
  useActionToast(state);

  const [filament, setFilament] = useState<number | null>(profile.default_filament_cost_per_kg_cents);
  const [machine, setMachine] = useState<number | null>(profile.default_machine_cost_per_hour_cents);
  const [taxMode, setTaxMode] = useState(profile.default_tax_mode);
  const [payment, setPayment] = useState(profile.default_payment_method);
  const [currency, setCurrency] = useState(profile.currency);
  const [timezone, setTimezone] = useState(profile.timezone);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="default_filament_cost_per_kg_cents" value={filament ?? 0} />
      <input type="hidden" name="default_machine_cost_per_hour_cents" value={machine ?? 0} />
      <input type="hidden" name="default_tax_mode" value={taxMode} />
      <input type="hidden" name="default_payment_method" value={payment} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="timezone" value={timezone} />

      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Business name</Label>
            <Input id="business_name" name="business_name" defaultValue={profile.business_name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["USD", "CAD", "EUR", "GBP", "AUD"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time zone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Production costs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Filament cost / kg</Label>
            <MoneyInput valueCents={filament} onValueChange={setFilament} />
          </div>
          <div className="space-y-2">
            <Label>Machine cost / hour</Label>
            <MoneyInput valueCents={machine} onValueChange={setMachine} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sales defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="default_tax_rate_bps">Tax rate (bps)</Label>
            <Input
              id="default_tax_rate_bps"
              name="default_tax_rate_bps"
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              defaultValue={profile.default_tax_rate_bps}
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground">800 = 8.00%</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_low_stock_threshold">Low-stock threshold</Label>
            <Input
              id="default_low_stock_threshold"
              name="default_low_stock_threshold"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={profile.default_low_stock_threshold}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label>Tax mode</Label>
            <Select value={taxMode} onValueChange={(v) => setTaxMode(v as typeof taxMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAX_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {TAX_MODE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default payment method</Label>
            <Select value={payment} onValueChange={(v) => setPayment(v as typeof payment)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <SubmitButton size="lg">Save settings</SubmitButton>
    </form>
  );
}
