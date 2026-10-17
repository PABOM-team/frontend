"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { recordQueries } from "@/entities/record";
import { INTAKE_LABEL, INTAKES, RECORD_KIND, type Intake } from "@/shared/domain/care";
import { MEMO_MAX, type CompleteInput } from "@/shared/domain/record";
import type { Task } from "@/shared/domain/today";
import { nowIso, yesterdaySameTimeIso } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { ChipGroup } from "@/shared/ui/chip";
import { Input, Textarea } from "@/shared/ui/form";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";

type When = "now" | "yesterday";

/**
 * 완료 체크 시트 (SCR-H02). 급여는 먹은 결과, 체중은 g.
 * 결과는 미리 고르지 않고, 비워도 저장된다 (나중에 '결과 남기기').
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
  const [when, setWhen] = useState<When>("now");

  // 새 할 일로 열릴 때마다 입력을 비운다
  if (task && task.routineId !== shown?.routineId) {
    setShown(task);
    setIntake(null);
    setWeight("");
    setMemo("");
    setWhen("now");
  }

  const current = task ?? shown;
  const kind = current ? RECORD_KIND[current.careItem] : null;
  const { data: lastWeight } = useQuery({
    ...recordQueries.list({ petId: current?.petId, careItem: "weight", limit: 1 }),
    enabled: kind === "weight" && Boolean(task),
  });
  const weightValue = weight ? Number(weight) : null;
  const weightInvalid = weight !== "" && (!weightValue || weightValue <= 0 || weightValue > 5000);

  return (
    <Sheet
      open={Boolean(task)}
      onOpenChange={onOpenChange}
      title={current ? `${current.petName} · ${current.title}` : ""}
      footer={
        <Button
          size="xl"
          disabled={pending || weightInvalid}
          onClick={() =>
            current &&
            onSubmit(current, {
              occurredAt: when === "now" ? nowIso() : yesterdaySameTimeIso(),
              intake,
              weightG: weightValue,
              memo: memo.trim() || null,
            })
          }
        >
          {pending ? "저장 중…" : "저장"}
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
          {lastWeight?.items[0]?.weightG ? (
            <p className="mt-1.5 text-[12px] text-[#888]">
              지난 기록 {lastWeight.items[0].weightG.toFixed(1)} g (참고만 해요)
            </p>
          ) : null}
        </>
      ) : null}
      <SheetLabel>언제 했나요?</SheetLabel>
      <ChipGroup
        label="언제"
        size="sm"
        options={[
          { value: "now", label: "지금" },
          { value: "yesterday", label: "어제" },
        ]}
        value={when}
        onChange={(v) => setWhen(v ?? "now")}
      />
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
