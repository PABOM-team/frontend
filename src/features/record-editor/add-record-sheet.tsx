"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { recordsApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { invalidateCareData } from "@/shared/api/query-keys";
import {
  CARE_ITEM_LABEL,
  CARE_ITEMS,
  INTAKE_LABEL,
  INTAKES,
  RECORD_KIND,
  type CareItem,
  type Intake,
} from "@/shared/domain/care";
import { MEMO_MAX, type Photo } from "@/shared/domain/record";
import {
  formatShortDay,
  nowIso,
  todayYmd,
  yesterdaySameTimeIso,
  ymdWithNowTime,
} from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { DatePickerSheet } from "@/shared/ui/calendar";
import { Chip, ChipGroup } from "@/shared/ui/chip";
import { Input, Textarea } from "@/shared/ui/form";
import { PhotoInput } from "@/shared/ui/photo-input";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";
import { toast } from "@/shared/ui/toast";

/** 기록 추가에서 고를 항목 순서 (Figma R03: 급여·체중·탈피·분무·청소·메모) */
const ITEM_ORDER: CareItem[] = ["feeding", "weight", "shed", "misting", "cleaning", "memo"];

type When = { kind: "now" } | { kind: "yesterday" } | { kind: "date"; ymd: string };

/** 기록 추가 시트 (SCR-R03). 할 일과 별개로 지난 날짜까지 직접 기록 */
export function AddRecordSheet({
  open,
  onOpenChange,
  defaultPetId,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPetId?: string;
  /** 홈 지난 날짜에서 '+ 이날 기록 추가'로 열면 그 날짜 */
  defaultDate?: string;
}) {
  const queryClient = useQueryClient();
  const { data: pets } = useQuery({ ...petQueries.list("active"), enabled: open });
  const [petId, setPetId] = useState<string | null>(null);
  const [item, setItem] = useState<CareItem | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [weight, setWeight] = useState("");
  const [when, setWhen] = useState<When>({ kind: "now" });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [memo, setMemo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setPetId(defaultPetId ?? null);
      setItem(null);
      setIntake(null);
      setWeight("");
      setPhotos([]);
      setMemo("");
      setWhen(
        defaultDate && defaultDate !== todayYmd()
          ? { kind: "date", ymd: defaultDate }
          : { kind: "now" },
      );
    }
  }
  // 개체가 한 마리면 자동으로 고른다
  const selectedPet = petId ?? (pets?.length === 1 ? pets[0]!.id : null);
  const kind = item ? RECORD_KIND[item] : null;
  const weightValue = weight ? Number(weight) : null;
  const weightInvalid =
    kind === "weight" && (!weightValue || weightValue <= 0 || weightValue > 5000);
  const memoMissing = kind === "memo" && !memo.trim() && photos.length === 0;
  // 급여는 먹은 정도를 골라야 저장할 수 있다 (C2-3)
  const intakeMissing = kind === "intake" && !intake;

  const save = useMutation({
    mutationFn: () =>
      recordsApi.create({
        petId: selectedPet!,
        careItem: item!,
        occurredAt:
          when.kind === "now"
            ? nowIso()
            : when.kind === "yesterday"
              ? yesterdaySameTimeIso()
              : ymdWithNowTime(when.ymd),
        intake: kind === "intake" ? intake : null,
        weightG: kind === "weight" ? weightValue : null,
        memo: memo.trim() || null,
        photoFileIds: photos.map((p) => p.id),
      }),
    onSuccess: () => onOpenChange(false),
    onError: (error) => toast(getErrorMessage(error, "저장하지 못했어요.")),
    onSettled: () => invalidateCareData(queryClient),
  });

  const canSave =
    selectedPet &&
    item &&
    !weightInvalid &&
    !memoMissing &&
    !intakeMissing &&
    !uploading &&
    !save.isPending;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="기록 추가"
        footer={
          <div className="flex w-full flex-col gap-1.5">
            <Button size="xl" disabled={!canSave} onClick={() => save.mutate()}>
              {save.isPending ? (
                <LoaderCircle className="size-5 animate-spin" aria-label="저장 중" />
              ) : (
                "저장"
              )}
            </Button>
            {uploading ? (
              <p className="text-center text-[12px] text-[#888]">
                사진을 올리는 동안은 저장할 수 없어요
              </p>
            ) : null}
          </div>
        }
      >
        <SheetLabel className="mt-1">어느 개체인가요?</SheetLabel>
        <ChipGroup
          label="개체"
          options={(pets ?? []).map((p) => ({ value: p.id, label: p.name }))}
          value={selectedPet}
          onChange={setPetId}
        />
        <SheetLabel>무엇을 기록할까요?</SheetLabel>
        <ChipGroup
          label="항목"
          options={ITEM_ORDER.filter((i) => CARE_ITEMS.includes(i)).map((value) => ({
            value,
            label: CARE_ITEM_LABEL[value],
          }))}
          value={item}
          onChange={setItem}
        />
        {kind === "intake" ? (
          <>
            <SheetLabel>얼마나 먹었나요?</SheetLabel>
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
            <SheetLabel>
              <label htmlFor="record-weight">몸무게</label>
            </SheetLabel>
            <Input
              id="record-weight"
              inputMode="decimal"
              placeholder="0.0"
              suffix="g"
              value={weight}
              onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </>
        ) : null}
        <SheetLabel>언제 있었던 일인가요?</SheetLabel>
        <div className="flex flex-wrap gap-2">
          <Chip selected={when.kind === "now"} onClick={() => setWhen({ kind: "now" })}>
            지금
          </Chip>
          <Chip selected={when.kind === "yesterday"} onClick={() => setWhen({ kind: "yesterday" })}>
            어제
          </Chip>
          <Chip selected={when.kind === "date"} onClick={() => setCalendarOpen(true)}>
            {when.kind === "date" ? formatShortDay(when.ymd) : "달력에서 고르기"}
          </Chip>
        </div>
        <SheetLabel>사진 (선택)</SheetLabel>
        <PhotoInput
          value={photos}
          onChange={setPhotos}
          onView={setViewer}
          onBusyChange={setUploading}
        />
        <SheetLabel>
          <label htmlFor="record-memo">메모{kind === "memo" ? "" : " (선택)"}</label>
        </SheetLabel>
        <Textarea
          id="record-memo"
          placeholder="메모를 남겨 주세요"
          maxLength={MEMO_MAX}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </Sheet>
      <DatePickerSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        title="날짜 고르기"
        value={when.kind === "date" ? when.ymd : null}
        max={todayYmd()}
        hint="오늘 뒤 날짜는 고를 수 없어요"
        onConfirm={(ymd) => setWhen(ymd === todayYmd() ? { kind: "now" } : { kind: "date", ymd })}
      />
      <PhotoViewer
        open={viewer !== null}
        onOpenChange={(o) => !o && setViewer(null)}
        photos={photos}
        initialIndex={viewer ?? 0}
      />
    </>
  );
}
