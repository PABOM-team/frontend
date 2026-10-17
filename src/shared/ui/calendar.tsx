"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatFullDate, fromYmd, toYmd } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Button } from "./button";
import { FieldButton } from "./form";
import { Sheet } from "./sheet";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 달력 한 달 (D3). min/max 밖의 날은 고를 수 없다 */
export function Calendar({
  value,
  onChange,
  min,
  max,
  today = toYmd(new Date()),
}: {
  value: string | null;
  onChange: (ymd: string) => void;
  min?: string;
  max?: string;
  today?: string;
}) {
  const [month, setMonth] = useState(() => startOfMonth(fromYmd(value ?? today)));
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const blanks = getDay(days[0]!);
  const canPrev = !min || toYmd(endOfMonth(subMonths(month, 1))) >= min;
  const canNext = !max || toYmd(startOfMonth(addMonths(month, 1))) <= max;

  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          aria-label="이전 달"
          disabled={!canPrev}
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="flex size-8 items-center justify-center rounded-full text-[#888] disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-[15px] font-bold">{format(month, "yyyy년 M월")}</p>
        <button
          type="button"
          aria-label="다음 달"
          disabled={!canNext}
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="flex size-8 items-center justify-center rounded-full text-[#888] disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[12px] text-[#888]">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1.5">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {Array.from({ length: blanks }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {days.map((day) => {
          const ymd = toYmd(day);
          const disabled = (min && ymd < min) || (max && ymd > max);
          const selected = value === ymd;
          const isToday = isSameDay(day, fromYmd(today));
          return (
            <button
              key={ymd}
              type="button"
              disabled={Boolean(disabled)}
              aria-pressed={selected}
              aria-label={formatFullDate(day)}
              onClick={() => onChange(ymd)}
              className={cn(
                "mx-auto flex size-9 items-center justify-center rounded-full text-[14.5px]",
                disabled ? "text-[#ccc]" : "text-foreground hover:bg-muted",
                isToday && !selected && "border-[1.5px] border-primary font-bold text-primary",
                selected && "bg-primary font-bold text-white hover:bg-primary",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 달력을 시트로 띄워 날짜 하나를 고른다 */
export function DatePickerSheet({
  open,
  onOpenChange,
  title,
  value,
  onConfirm,
  min,
  max,
  hint,
  previewText,
  confirmLabel = "고르기",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string | null;
  onConfirm: (ymd: string) => void;
  min?: string;
  max?: string;
  hint?: ReactNode;
  previewText?: (ymd: string) => ReactNode;
  confirmLabel?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setDraft(value);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <Button
          size="xl"
          disabled={!draft}
          onClick={() => {
            if (!draft) return;
            onConfirm(draft);
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      }
    >
      <Calendar value={draft} onChange={setDraft} min={min} max={max} />
      {hint ? <p className="mt-3 text-[12px] text-[#888]">{hint}</p> : null}
      {draft && previewText ? (
        <p className="mt-2 text-[13px] font-medium text-primary">{previewText(draft)}</p>
      ) : null}
    </Sheet>
  );
}

/** 날짜 칸. 누르면 달력 시트 */
export function DateField({
  id,
  value,
  onChange,
  title,
  placeholder = "날짜를 골라 주세요",
  min,
  max,
  hint,
  disabled,
  invalid,
}: {
  id?: string;
  value: string | null;
  onChange: (ymd: string) => void;
  title: string;
  placeholder?: string;
  min?: string;
  max?: string;
  hint?: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FieldButton
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        icon={<CalendarIcon className="size-[18px]" />}
        onClick={() => setOpen(true)}
      >
        {value ? formatFullDate(value) : null}
      </FieldButton>
      <DatePickerSheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        value={value}
        onConfirm={onChange}
        min={min}
        max={max}
        hint={hint}
      />
    </>
  );
}
