"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** 칸 제목 + 내용 + 도움말/오류 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-foreground">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p role="alert" className="text-[12.5px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const fieldBox =
  "w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#aaa] focus:border-primary aria-invalid:border-destructive disabled:bg-muted disabled:text-muted-foreground";

export const Input = forwardRef<
  HTMLInputElement,
  ComponentProps<"input"> & { suffix?: ReactNode; wrapperClassName?: string }
>(function Input({ className, suffix, wrapperClassName, ...props }, ref) {
  if (!suffix) return <input ref={ref} className={cn(fieldBox, "h-12", className)} {...props} />;
  return (
    <div className={cn("relative", wrapperClassName)}>
      <input ref={ref} className={cn(fieldBox, "h-12 pr-16", className)} {...props} />
      <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[15px] text-[#999]">
        {suffix}
      </span>
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<"textarea"> & { maxLength: number }
>(function Textarea({ className, value, maxLength, ...props }, ref) {
  const length = typeof value === "string" ? value.length : 0;
  // 글자 수를 다 채우면 칸과 글자 수를 빨갛게 (C2-3)
  const full = length >= maxLength;
  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        maxLength={maxLength}
        rows={3}
        className={cn(
          fieldBox,
          "min-h-[68px] resize-none py-3 leading-relaxed",
          full && "border-destructive",
          className,
        )}
        {...props}
      />
      <p className={cn("mt-1 text-right text-[11.5px]", full ? "text-destructive" : "text-[#999]")}>
        {length} / {maxLength}자
      </p>
    </div>
  );
});

/** 칸처럼 생긴 버튼 (날짜 고르기·모프 고르기 등) */
export function FieldButton({
  children,
  placeholder,
  icon,
  className,
  ...props
}: ComponentProps<"button"> & { placeholder?: string; icon?: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        fieldBox,
        "flex h-12 items-center justify-between gap-2 text-left disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      <span className={cn("truncate", !children && "text-[#aaa]")}>{children || placeholder}</span>
      {icon ? <span className="shrink-0 text-[#888]">{icon}</span> : null}
    </button>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-[#aaa] bg-background text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:data-[state=checked]:border-[#ccc] disabled:data-[state=checked]:bg-[#ddd]",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        {props.checked === "indeterminate" ? (
          <Minus className="size-4" strokeWidth={3} />
        ) : (
          <Check className="size-4" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full bg-[#ccc] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-[20px] translate-x-[3px] rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[21px]" />
    </SwitchPrimitive.Root>
  );
}
