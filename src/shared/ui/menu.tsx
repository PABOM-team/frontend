"use client";

import { Ellipsis } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { usePortalContainer } from "./portal";

export type MenuItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  hidden?: boolean;
};

/** ⋯ 메뉴 (Figma 할 일 카드·개체 상세의 떠 있는 메뉴) */
export function Menu({
  items,
  label = "더 보기",
  trigger,
  triggerClassName,
}: {
  items: MenuItem[];
  label?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
}) {
  const container = usePortalContainer();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={label}
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-[#888] hover:bg-muted data-[state=open]:bg-muted",
          triggerClassName,
        )}
      >
        {trigger ?? <Ellipsis className="size-5" />}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.Content
          align="end"
          sideOffset={2}
          collisionPadding={12}
          className="z-50 min-w-[156px] overflow-hidden rounded-xl border border-border bg-background py-0.5 shadow-[0_6px_20px_rgba(0,0,0,0.12)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {items
            .filter((item) => !item.hidden)
            .map((item, index) => (
              <DropdownMenu.Item
                key={item.label}
                onSelect={item.onSelect}
                className={cn(
                  "cursor-pointer px-4 py-3 text-[14.5px] outline-none data-highlighted:bg-muted",
                  index > 0 && "border-t border-border",
                  item.tone === "danger" ? "text-destructive" : "text-foreground",
                )}
              >
                {item.label}
              </DropdownMenu.Item>
            ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
