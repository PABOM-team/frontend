"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { recordQueries } from "@/entities/record";
import { INTAKE_LABEL, INTAKES, RECORD_KIND, type Intake } from "@/shared/domain/care";
import { MEMO_MAX, type CompleteInput } from "@/shared/domain/record";
import type { Task } from "@/shared/domain/today";
import { nowIso } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { ChipGroup } from "@/shared/ui/chip";
import { Input, Textarea } from "@/shared/ui/form";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";

/**
 * 완료 체크 시트 (SCR-H02). 급여는 먹은 결과, 체중은 g.
 * 값을 고르기 전에는 저장할 수 없다 (C2-3). 체중은 지난 기록을 미리 채워 둔다
 */
export function CompleteSheet({
  task,
  onOpenChange,
  onSubmit,
  pending,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Task, input: CompleteInput) => void;
  pending: boolean;
}) {
  const [shown, setShown] = useState<Task | null>(task);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [weight, setWeight] = useState("");
  const [memo, setMemo] = useState("");
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);

  // 새 할 일로 열릴 때마다 입력을 비운다
  if (task && task.routineId !== shown?.routineId) {
    setShown(task);
    setIntake(null);
    setWeight("");
    setMemo("");
    setPrefilledFor(null);
  }

  const current = task ?? shown;
  const kind = current ? RECORD_KIND[current.careItem] : null;
  const { data: lastWeight } = useQuery({
    ...recordQueries.list({ petId: current?.petId, careItem: "weight", limit: 1 }),
    enabled: kind === "weight" && Boolean(task),
  });
  const lastWeightG = lastWeight?.items[0]?.weightG;
  if (current && lastWeightG && prefilledFor !== current.routineId && weight === "") {
    setPrefilledFor(current.routineId);
    setWeight(lastWeightG.toFixed(1));
  }
  const weightValue = weight ? Number(weight) : null;
  const weightInvalid = weight !== "" && (!weightValue || weightValue <= 0 || weightValue > 5000);
  const missingValue =
    (kind === "intake" && !intake) || (kind === "weight" && (!weightValue || weightInvalid));

  return (
    <Sheet
      open={Boolean(task)}
      onOpenChange={onOpenChange}
      title={current ? `${current.petName} · ${current.title}` : ""}
      footer={
        <Button
          size="xl"
          disabled={pending || missingValue}
          onClick={() =>
            current &&
            onSubmit(current, {
              occurredAt: nowIso(),
              intake,
              weightG: weightValue,
              memo: memo.trim() || null,
            })
          }
        >
          {pending ? <LoaderCircle className="size-5 animate-spin" aria-label="저장 중" /> : "저장"}
        </Button>
      }
    >
      {kind === "intake" ? (
        <>
          <SheetLabel className="mt-1">얼마나 먹었나요?</SheetLabel>
          <ChipGroup
            label="먹은 정도"
            columns={2}
            allowDeselect
            options={INTAKES.map((value) => ({ value, label: INTAKE_LABEL[value] }))}
            value={intake}
            onChange={setIntake}
          />
        </>
      ) : null}
      {kind === "weight" ? (
        <>
          <SheetLabel className="mt-1">
            <label htmlFor="complete-weight">몸무게</label>
          </SheetLabel>
          <Input
            id="complete-weight"
            inputMode="decimal"
            placeholder="0.0"
            suffix="g"
            value={weight}
            aria-invalid={weightInvalid || undefined}
            onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </>
      ) : null}
      <SheetLabel>
        <label htmlFor="complete-memo">메모 (선택)</label>
      </SheetLabel>
      <Textarea
        id="complete-memo"
        placeholder="메모를 남겨 주세요"
        maxLength={MEMO_MAX}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />
    </Sheet>
  );
}
