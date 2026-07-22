"use client";

import { useActionState, useRef } from "react";
import { Trash2, Plus } from "lucide-react";
import { createCategory, archiveCategory } from "@/lib/actions/categories";
import { useActionToast } from "@/components/forms/use-action-toast";
import type { ActionState } from "@/lib/actions/util";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [state, action] = useActionState<ActionState, FormData>(createCategory, null);
  const formRef = useRef<HTMLFormElement>(null);
  useActionToast(state, () => formRef.current?.reset());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet. Add your first one below.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm">{c.name}</span>
                <form action={archiveCategory.bind(null, c.id)}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Archive ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form ref={formRef} action={action} className="flex gap-2">
          <Input name="name" placeholder="New category name" required maxLength={80} />
          <SubmitButton variant="secondary" className="shrink-0">
            <Plus className="h-4 w-4" /> Add
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
