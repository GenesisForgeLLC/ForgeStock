"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Boxes, Store, Package, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/events", label: "Event", icon: Store, match: "/events" },
  { href: "/products", label: "Products", icon: Package },
  { href: "/more", label: "More", icon: Menu },
];

export function BottomNav({ activeEventId }: { activeEventId?: string | null }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between">
        {items.map((item) => {
          // The Event tab jumps straight into the active event when one is open.
          const href =
            item.href === "/events" && activeEventId ? `/events/${activeEventId}/mode` : item.href;
          const isActive =
            pathname === item.href ||
            (item.match ? pathname.startsWith(item.match) : false) ||
            (item.href === "/more" && pathname.startsWith("/more"));
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
