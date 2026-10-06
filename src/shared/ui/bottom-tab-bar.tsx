"use client";

import { CalendarDays, PawPrint, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";

const TABS = [
  { href: "/home", label: "홈", icon: CalendarDays },
  { href: "/pets", label: "개체", icon: PawPrint },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
