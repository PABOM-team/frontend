"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { cn } from "@/shared/lib/utils";

type ToastAction = { label: string; onClick: () => void };
type ToastItem = {
  id: number;
  message: string;
  action?: ToastAction;
  /** ms. 되돌리기 같은 행동이 있으면 5초 (FL-02) */
  duration: number;
};

type ToastState = {
  current: ToastItem | null;
  show: (message: string, options?: { action?: ToastAction; duration?: number }) => void;
  dismiss: () => void;
};

let seq = 0;

const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (message, options) =>
    set({
      current: {
        id: ++seq,
        message,
        action: options?.action,
        duration: options?.duration ?? (options?.action ? 5000 : 3000),
      },
    }),
  dismiss: () => set({ current: null }),
}));

/** 화면 아래 검은 토스트 (C3). 한 번에 하나만 보인다 */
export const toast = (message: string, options?: { action?: ToastAction; duration?: number }) =>
  useToastStore.getState().show(message, options);

export function Toaster() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(dismiss, current.duration);
    return () => window.clearTimeout(timer);
  }, [current, dismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-[60] flex justify-center"
    >
      {current ? (
        <div
          key={current.id}
          role="status"
          className={cn(
            "pointer-events-auto flex min-h-[42px] w-full items-center gap-3 rounded-xl bg-inverse px-3.5 py-2.5 text-[13.5px] text-inverse-foreground shadow-lg",
            "animate-in fade-in-0 slide-in-from-bottom-2",
          )}
        >
          <span className="min-w-0 flex-1">{current.message}</span>
          {current.action ? (
            <button
              type="button"
              className="shrink-0 font-bold text-[#7aa5ff]"
              onClick={() => {
                current.action?.onClick();
                dismiss();
              }}
            >
              {current.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
