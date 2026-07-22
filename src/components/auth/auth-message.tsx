import type { AuthState } from "@/app/(auth)/actions";

export function AuthMessage({ state }: { state: AuthState }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p role="alert" className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-md bg-success/15 px-3 py-2 text-sm text-success">
        {state.message}
      </p>
    );
  }
  return null;
}
