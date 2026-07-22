"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "../actions";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthMessage } from "@/components/auth/auth-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, null);
  return (
    <AuthCard
      title="Set a new password"
      description="Enter a new password for your account."
    >
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            autoFocus
          />
        </div>
        <AuthMessage state={state} />
        <SubmitButton className="w-full" size="lg">
          Update password
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
