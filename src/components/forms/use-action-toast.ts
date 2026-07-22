"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions/util";

/** Surface an action's error/message as a toast whenever the state changes. */
export function useActionToast(state: ActionState, onSuccess?: () => void) {
  const last = useRef<ActionState>(null);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (!state) return;
    if (state.error) toast.error(state.error);
    else if (state.message) {
      toast.success(state.message);
      onSuccess?.();
    } else if (state.ok) {
      onSuccess?.();
    }
  }, [state, onSuccess]);
}
