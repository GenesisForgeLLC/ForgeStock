"use client";

import { useDateTime } from "@/components/app-settings";

export function EventDate({ value, withTime = false }: { value: string | null; withTime?: boolean }) {
  const { date, dateTime } = useDateTime();
  return <>{withTime ? dateTime(value) : date(value)}</>;
}
