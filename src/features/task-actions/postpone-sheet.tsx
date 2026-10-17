"use client";

import { useState } from "react";
import { CARE_ITEM_LABEL, SKIP_REASONS } from "@/shared/domain/care";
import type { Task } from "@/shared/domain/today";
import { addDays, formatShortDay, toYmd } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { DatePickerSheet } from "@/shared/ui/calendar";
import { Chip, ChipGroup } from "@/shared/ui/chip";
import { InfoBox } from "@/shared/ui/display";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";

const POSTPONE_MAX_DAYS = 30;

/**
 * 다른 날로 미루기 (SCR-H03). 날짜만 옮기고 기록은 남지 않는다.
 * 고를 수 있는 날은 내일~30일 뒤. 이미 미룬 할 일이면 원래·지금 날짜를 먼저 보여 준다 (U3).
 */
export function PostponeSheet({
  task,
  onOpenChange,
  onSubmit,
  pending,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Task, date: string) => void;
  pending: boolean;
}) {
  const [shown, setShown] = useState<Task | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = new Date();
  const already = task?.originalDueOn ? task : null;
  const quick = (already ? [2, 3] : [1, 2]).map((n) => ({
    value: toYmd(addDays(today, n)),
    label: ["", "내일", "모레", "글피"][n]!,
  }));

  if (task && task.routineId !== shown?.routineId) {
    setShown(task);
    setDate(quick[0]!.value);
  }
  const current = task ?? shown;
  const custom = date && !quick.some((q) => q.value === date);

  return (
    <>
      <Sheet
        open={Boolean(task)}
        onOpenChange={onOpenChange}
        title="다른 날로 미루기"
        description={
          current && !already
            ? `${current.petName} · ${CARE_ITEM_LABEL[current.careItem]} · 할 일을 고른 날짜로 옮겨요. 기록은 남지 않아요.`
            : undefined
        }
        footer={
          <Button
            size="xl"
            disabled={!date || pending}
            onClick={() => current && date && onSubmit(current, date)}
          >
            미루기
          </Button>
        }
      >
        {already?.originalDueOn ? (
          <>
            <InfoBox tone="blue" className="mb-3 text-[13px]">
              이미 미룬 할 일이에요 · 원래 {formatShortDay(already.originalDueOn)} → 지금{" "}
              {formatShortDay(already.dueOn)}
            </InfoBox>
            <p className="mb-3 text-[13px] text-[#555]">
              {already.petName} · {CARE_ITEM_LABEL[already.careItem]} · 한 번 더 미룰 수 있어요.
            </p>
          </>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <ChipGroup
            label="미룰 날"
            className="contents"
            options={quick}
            value={custom ? null : date}
            onChange={(v) => v && setDate(v)}
          />
          <Chip selected={Boolean(custom)} onClick={() => setCalendarOpen(true)}>
            {custom ? formatShortDay(date) : "달력에서 고르기"}
          </Chip>
        </div>
        {date ? (
          <p className="mt-3 text-[13px] font-medium text-primary">
            {formatShortDay(date)}로 옮겨요
          </p>
        ) : null}
      </Sheet>
      <DatePickerSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        title="날짜 고르기"
        value={date}
        min={toYmd(addDays(today, 1))}
        max={toYmd(addDays(today, POSTPONE_MAX_DAYS))}
        hint="오늘·지난 날·30일 뒤는 고를 수 없어요"
        previewText={(ymd) => `${formatShortDay(ymd)}로 옮겨요`}
        confirmLabel="미루기"
        onConfirm={(ymd) => {
          setDate(ymd);
          if (current) onSubmit(current, ymd);
        }}
      />
    </>
  );
}

/** 이번엔 건너뛰기 (SCR-H03). 이유는 선택, 건너뜀 기록이 남고 다음 예정일은 주기대로 */
export function SkipSheet({
  task,
  onOpenChange,
  onSubmit,
  pending,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Task, reason: string | null) => void;
  pending: boolean;
}) {
  const [shown, setShown] = useState<Task | null>(task);
  const [reason, setReason] = useState<string | null>(null);
  if (task && task.routineId !== shown?.routineId) {
    setShown(task);
    setReason(null);
  }
  const current = task ?? shown;

  return (
    <Sheet
      open={Boolean(task)}
      onOpenChange={onOpenChange}
      title="이번엔 건너뛰기"
      description={
        current
          ? `${current.petName} · ${CARE_ITEM_LABEL[current.careItem]} · 이번 회차를 하지 않기로 기록해요. 다음 예정일은 주기대로 다시 계산돼요.`
          : undefined
      }
      footer={
        <Button size="xl" disabled={pending} onClick={() => current && onSubmit(current, reason)}>
          건너뛰기
        </Button>
      }
    >
      <SheetLabel className="mt-1">이유 (선택)</SheetLabel>
      <ChipGroup
        label="건너뛰는 이유"
        allowDeselect
        options={SKIP_REASONS.map((value) => ({ value, label: value }))}
        value={reason}
        onChange={setReason}
      />
    </Sheet>
  );
}
