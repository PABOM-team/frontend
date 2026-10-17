"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type Option<T extends string | number> = { value: T; label: ReactNode; disabled?: boolean };

/**
 * 하나만 고르는 칩 묶음 (Figma: 고르면 파란 테두리 + ✓).
 * allowDeselect면 같은 칩을 다시 눌러 선택을 비울 수 있다 (선택 입력용)
 */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  allowDeselect = false,
  columns,
  size = "md",
  className,
}: {
  options: readonly Option<T>[];
  value: T | null | undefined;
  onChange: (value: T | null) => void;
  label: string;
  allowDeselect?: boolean;
  /** 2면 칸을 반씩 나눠 꽉 채운다 (급여 결과 칩) */
  columns?: 2;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(columns === 2 ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Chip
            key={String(option.value)}
            role="radio"
            aria-checked={selected}
            selected={selected}
            disabled={option.disabled}
            size={size}
            className={columns === 2 ? "w-full" : undefined}
            onClick={() => onChange(selected && allowDeselect ? null : option.value)}
          >
            {option.label}
          </Chip>
        );
      })}
    </div>
  );
}

export function Chip({
  selected,
  size = "md",
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { selected?: boolean; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-0.5 rounded-full border bg-background whitespace-nowrap transition-colors disabled:opacity-40",
        size === "md" ? "h-[34px] px-3.5 text-[14px]" : "h-[30px] px-3 text-[13px]",
        selected
          ? "border-primary bg-primary-soft font-bold text-primary"
          : "border-input text-foreground hover:bg-muted",
        className,
      )}
      {...props}
    >
      {selected ? <span aria-hidden>✓</span> : null}
      {children}
    </button>
  );
}
