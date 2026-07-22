"use client";

import { createContext, useContext } from "react";
import { formatCents } from "@/lib/money";
import { formatDateTime, formatDate } from "@/lib/utils";

export interface AppSettings {
  currency: string;
  timezone: string;
  businessName: string;
  defaultPaymentMethod: string;
}

const AppSettingsContext = createContext<AppSettings>({
  currency: "USD",
  timezone: "America/New_York",
  businessName: "Genesis Forge",
  defaultPaymentMethod: "cash",
});

export function AppSettingsProvider({
  value,
  children,
}: {
  value: AppSettings;
  children: React.ReactNode;
}) {
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

/** Money formatter bound to the user's currency. */
export function useMoney() {
  const { currency } = useAppSettings();
  return (cents: number | null | undefined) => formatCents(cents ?? 0, currency);
}

/** Date/time formatter bound to the user's timezone. */
export function useDateTime() {
  const { timezone } = useAppSettings();
  return {
    dateTime: (v: string | Date | null | undefined) => formatDateTime(v, timezone),
    date: (v: string | Date | null | undefined) => formatDate(v, timezone),
  };
}
