"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { usePortalContainer } from "./portal";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/** 아래에서 올라오는 시트 (Figma 시트: 손잡이 · 제목 · × · 내용 · 하단 버튼) */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: SheetProps) {
  const container = usePortalContainer();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="absolute inset-0 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "absolute inset-x-0 bottom-0 flex max-h-[92%] flex-col rounded-t-[20px] bg-background shadow-xl outline-none",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:slide-in-from-bottom",
            className,
          )}
        >
          <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-[#d4d4d4]" aria-hidden />
          <div className="flex shrink-0 items-start gap-2 px-4 pt-3 pb-2">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[17px] leading-snug font-bold text-foreground">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="닫기"
              className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
            {children}
          </div>
          {footer ? (
            <div className="flex shrink-0 gap-2 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : (
            <div className="h-4 shrink-0" />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** 시트 안 칸 제목 (예: 얼마나 먹었나요?) */
export function SheetLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mt-3 mb-2 text-[13px] font-medium text-foreground", className)}>{children}</p>
  );
}
