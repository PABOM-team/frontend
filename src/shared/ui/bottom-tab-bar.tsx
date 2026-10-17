"use client";

import { CalendarDays, PawPrint, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";

const TABS = [
  { href: "/home", label: "오늘", icon: CalendarDays },
  { href: "/pets", label: "개체", icon: PawPrint },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

/** 하단 탭 3개 (Figma 66px). 화면 틀 안의 아래에 붙는다 */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="flex h-[58px]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px]",
                  active ? "font-bold text-primary" : "text-[#888]",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
