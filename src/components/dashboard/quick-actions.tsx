import Link from "next/link";
import { Printer, Plus, Store, PlayCircle, Receipt, SlidersHorizontal } from "lucide-react";

const actions = [
  { href: "/prints/new", label: "Record print", icon: Printer },
  { href: "/products/new", label: "Add product", icon: Plus },
  { href: "/events/new", label: "Create event", icon: Store },
  { href: "/inventory", label: "Adjust stock", icon: SlidersHorizontal },
];

export function QuickActions({ activeEventId }: { activeEventId: string | null }) {
  const items = activeEventId
    ? [
        { href: `/events/${activeEventId}/mode`, label: "Resume event", icon: PlayCircle },
        { href: `/events/${activeEventId}/mode`, label: "Record sale", icon: Receipt },
        ...actions.slice(0, 4),
      ]
    : actions;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-4 text-center text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <Icon className="h-6 w-6 text-primary" />
          {label}
        </Link>
      ))}
    </div>
  );
}
