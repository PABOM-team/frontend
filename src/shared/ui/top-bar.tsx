"use client";

import { ChevronLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type TopBarProps = {
  title?: ReactNode;
  /** back: ‹ 뒤로, close: × 닫기(왼쪽), none: 없음 */
  leading?: "back" | "close" | "none";
  onLeading?: () => void;
  /** 이전 화면이 없을 때(바로 들어온 경우) 갈 곳 */
  fallbackHref?: string;
  trailing?: ReactNode;
  className?: string;
};

/** 화면 위 제목 줄 (Figma 52px) */
export function TopBar({
  title,
  leading = "back",
  onLeading,
  fallbackHref = "/home",
  trailing,
  className,
}: TopBarProps) {
  const router = useRouter();
  const goBack = () => {
    if (onLeading) return onLeading();
    if (window.history.length > 1) router.back();
    else router.replace(fallbackHref);
  };

  return (
    <header
      className={cn(
        "flex h-[52px] shrink-0 items-center gap-1 bg-background px-2 pt-[env(safe-area-inset-top)]",
        leading === "none" && "pl-4",
        className,
      )}
    >
      {leading !== "none" && (
        <button
          type="button"
          onClick={goBack}
          aria-label={leading === "back" ? "뒤로" : "닫기"}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
        >
          {leading === "back" ? <ChevronLeft className="size-6" /> : <X className="size-6" />}
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-[17px] font-bold text-foreground">{title}</h1>
      {trailing ? <div className="flex shrink-0 items-center gap-1 pr-2">{trailing}</div> : null}
    </header>
  );
}

/** 위 제목 줄 오른쪽 글자 버튼 (예: 저장, 건너뛰기) */
export function TopBarAction({ children, className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md px-2 py-1 text-[15px] font-medium text-primary disabled:text-subtle-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
