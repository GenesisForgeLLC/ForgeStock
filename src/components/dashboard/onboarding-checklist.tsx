"use client";

import Link from "next/link";
import { useTransition } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { markOnboardingComplete } from "@/lib/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface OnboardingStep {
  label: string;
  done: boolean;
  href: string;
}

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const [pending, start] = useTransition();
  const completed = steps.filter((s) => s.done).length;

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>
          Getting started ({completed}/{steps.length})
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={pending}
          onClick={() => start(async () => void (await markOnboardingComplete()))}
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {steps.map((step) => (
            <li key={step.label}>
              <Link
                href={step.href}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
              >
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <span className={step.done ? "text-muted-foreground line-through" : ""}>{step.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
