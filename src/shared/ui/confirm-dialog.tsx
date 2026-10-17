"use client";

import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "./button";
import { usePortalContainer } from "./portal";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  /** 없으면 버튼 1개짜리 안내 창 (C4-4) */
  cancelLabel?: string | null;
  /** danger: 빨강(삭제), inverse: 검정(나가기) */
  tone?: "default" | "danger" | "inverse";
  pending?: boolean;
  onConfirm: () => void;
};

/** 가운데 뜨는 확인 창 (C4). 위험한 행동은 빨간 버튼 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "닫기",
  tone = "default",
  pending,
  onConfirm,
}: ConfirmDialogProps) {
  const container = usePortalContainer();

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Overlay className="absolute inset-0 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="absolute top-1/2 left-1/2 w-[calc(100%-56px)] max-w-[334px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] bg-background p-[18px] shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <AlertDialog.Title className="text-[16px] leading-snug font-bold text-foreground">
            {title}
          </AlertDialog.Title>
          {description ? (
            <AlertDialog.Description className="mt-2 text-[13.5px] leading-relaxed whitespace-pre-line text-[#555]">
              {description}
            </AlertDialog.Description>
          ) : (
            <AlertDialog.Description className="sr-only">{title}</AlertDialog.Description>
          )}
          <div className="mt-[18px] flex gap-2">
            {cancelLabel ? (
              <AlertDialog.Cancel asChild>
                <Button variant="outline" size="xl" className="flex-1">
                  {cancelLabel}
                </Button>
              </AlertDialog.Cancel>
            ) : null}
            <Button
              variant={tone === "danger" ? "danger" : tone === "inverse" ? "inverse" : "default"}
              size="xl"
              className="flex-1"
              disabled={pending}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
