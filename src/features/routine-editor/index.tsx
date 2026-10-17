"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { routineSummary } from "@/entities/routine";
import { routinesApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { invalidateCareData } from "@/shared/api/query-keys";
import { formatInterval, RECORD_KIND, RECORD_KIND_HINT, ROUTINE_LABEL } from "@/shared/domain/care";
import { ROUTINE_INTERVAL_MAX, ROUTINE_INTERVAL_MIN, type Routine } from "@/shared/domain/routine";
import { josa } from "@/shared/lib/josa";
import { Button } from "@/shared/ui/button";
import { Badge, InfoBox } from "@/shared/ui/display";
import { Input, Switch } from "@/shared/ui/form";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";
import { toast } from "@/shared/ui/toast";

function useRoutineMutation() {
  const queryClient = useQueryClient();
  return {
    refresh: () => invalidateCareData(queryClient),
  };
}

/** 체크 리스트 한 줄 (SCR-P03): 항목·주기·기록 방식 · 수정 · 켜기/끄기 */
export function RoutineRow({ routine, onEdit }: { routine: Routine; onEdit: () => void }) {
  const { refresh } = useRoutineMutation();
  const label = ROUTINE_LABEL[routine.careItem];
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => routinesApi.update(routine.id, { enabled }),
    onSuccess: (updated) =>
      toast(`'${label}' ${updated.enabled ? "할 일을 켰어요" : "할 일을 껐어요"}`),
    onError: (error) => toast(getErrorMessage(error, "바꾸지 못했어요.")),
    onSettled: refresh,
  });
  const enabled = toggle.isPending ? Boolean(toggle.variables) : routine.enabled;

  return (
    <li className="flex items-center gap-3 border-b border-border py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[15px] font-bold">
          {label}
          {routine.customized ? <Badge tone="blue-outline">내가 바꿈</Badge> : null}
        </p>
        <p className="truncate text-[12.5px] text-[#777]">{routineSummary(routine)}</p>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 px-1 text-[13px] text-primary">
        수정
      </button>
      <Switch
        checked={enabled}
        aria-label={`${label} 켜기`}
        onCheckedChange={(on) => toggle.mutate(on)}
      />
    </li>
  );
}

/** 체크 리스트 항목 수정 창: 주기(1~365일) · 먹이 이름 · 기록 방식 안내 · 기준값으로 되돌리기 */
export function RoutineEditSheet({
  routine,
  onOpenChange,
}: {
  routine: Routine | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { refresh } = useRoutineMutation();
  const [shown, setShown] = useState<Routine | null>(null);
  const [intervalText, setIntervalText] = useState("");
  const [food, setFood] = useState("");
  if (routine && routine.id !== shown?.id) {
    setShown(routine);
    setIntervalText(String(routine.intervalDays));
    setFood(routine.foodName ?? "");
  }
  const current = routine ?? shown;
  const label = current ? ROUTINE_LABEL[current.careItem] : "";
  const days = Number(intervalText);
  const invalid =
    !Number.isInteger(days) || days < ROUTINE_INTERVAL_MIN || days > ROUTINE_INTERVAL_MAX;

  const save = useMutation({
    mutationFn: () =>
      routinesApi.update(current!.id, {
        intervalDays: days,
        foodName: current!.careItem === "feeding" ? food.trim() || null : undefined,
      }),
    onSuccess: (updated) => {
      onOpenChange(false);
      toast(`${josa(label, "을/를")} ${formatInterval(updated.intervalDays)}로 바꿨어요`);
    },
    onError: (error) => toast(getErrorMessage(error, "저장하지 못했어요.")),
    onSettled: refresh,
  });

  const reset = useMutation({
    mutationFn: () => routinesApi.reset(current!.id),
    onSuccess: (updated) => {
      onOpenChange(false);
      toast(`기준값(${formatInterval(updated.intervalDays)})으로 되돌렸어요`);
    },
    onError: (error) => toast(getErrorMessage(error)),
    onSettled: refresh,
  });

  return (
    <Sheet
      open={Boolean(routine)}
      onOpenChange={onOpenChange}
      title={`${label} 수정`}
      footer={
        <Button size="xl" disabled={invalid || save.isPending} onClick={() => save.mutate()}>
          저장
        </Button>
      }
    >
      <SheetLabel className="mt-1">
        <label htmlFor="routine-interval">주기</label>
      </SheetLabel>
      <Input
        id="routine-interval"
        inputMode="numeric"
        wrapperClassName="w-[140px]"
        suffix="일마다"
        value={intervalText}
        aria-invalid={(intervalText !== "" && invalid) || undefined}
        onChange={(e) => setIntervalText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
      />
      {intervalText !== "" && invalid ? (
        <p className="mt-1.5 text-[12.5px] text-destructive">1~365일 사이 정수로 입력해 주세요</p>
      ) : current ? (
        <p className="mt-1.5 text-[12px] text-[#888]">
          기준값 {formatInterval(current.standardIntervalDays)}
        </p>
      ) : null}
      {current?.careItem === "feeding" ? (
        <>
          <SheetLabel>
            <label htmlFor="routine-food">먹이 이름</label>
          </SheetLabel>
          <Input
            id="routine-food"
            maxLength={20}
            placeholder="예: 인공 사료"
            value={food}
            onChange={(e) => setFood(e.target.value)}
          />
        </>
      ) : null}
      {current ? (
        <InfoBox className="mt-4">
          기록 방식 · {RECORD_KIND_HINT[RECORD_KIND[current.careItem]]}
        </InfoBox>
      ) : null}
      {current?.customized ? (
        <button
          type="button"
          onClick={() => reset.mutate()}
          disabled={reset.isPending}
          className="mt-3 text-[13px] font-medium text-primary"
        >
          기준값({formatInterval(current.standardIntervalDays)})으로 되돌리기
        </button>
      ) : null}
    </Sheet>
  );
}
