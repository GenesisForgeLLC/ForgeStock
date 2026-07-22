"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/actions/util";
import { useActionToast } from "@/components/forms/use-action-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, TAX_MODES, TAX_MODE_LABELS } from "@/config/app";

export interface EventFormValues {
  name: string;
  venue: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
  tax_rate_bps: number;
  tax_mode: string;
  default_payment_method: string;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function EventForm({
  action,
  values,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  values: EventFormValues;
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);
  useActionToast(state, () => router.refresh());

  const [taxMode, setTaxMode] = useState(values.tax_mode);
  const [payment, setPayment] = useState(values.default_payment_method);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="tax_mode" value={taxMode} />
      <input type="hidden" name="default_payment_method" value={payment} />

      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event name</Label>
            <Input id="name" name="name" defaultValue={values.name} required autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input id="venue" name="venue" defaultValue={values.venue ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={values.location ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="starts_at">Starts</Label>
              <Input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                defaultValue={toLocalInput(values.starts_at)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Ends</Label>
              <Input
                id="ends_at"
                name="ends_at"
                type="datetime-local"
                defaultValue={toLocalInput(values.ends_at)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={values.notes ?? ""} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax &amp; payment for this event</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tax_rate_bps">Tax rate (bps)</Label>
            <Input
              id="tax_rate_bps"
              name="tax_rate_bps"
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              defaultValue={values.tax_rate_bps}
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground">800 = 8.00%</p>
          </div>
          <div className="space-y-2">
            <Label>Tax mode</Label>
            <Select value={taxMode} onValueChange={setTaxMode}>
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
          <div className="space-y-2 sm:col-span-2">
            <Label>Default payment method</Label>
            <Select value={payment} onValueChange={setPayment}>
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

      <SubmitButton size="lg">{submitLabel}</SubmitButton>
    </form>
  );
}
