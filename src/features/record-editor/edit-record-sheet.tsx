"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { recordQueries } from "@/entities/record";
import { recordsApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { invalidateCareData } from "@/shared/api/query-keys";
import {
  CARE_ITEM_LABEL,
  INTAKE_LABEL,
  INTAKES,
  RECORD_KIND,
  type Intake,
} from "@/shared/domain/care";
import { MEMO_MAX, type CareRecord, type Photo } from "@/shared/domain/record";
import { formatDayLabel } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { ChipGroup } from "@/shared/ui/chip";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { DateTimeField } from "@/shared/ui/date-time-field";
import { InfoBox, LoadError, Spinner } from "@/shared/ui/display";
import { Input, Textarea } from "@/shared/ui/form";
import { PhotoInput } from "@/shared/ui/photo-input";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";
import { toast } from "@/shared/ui/toast";

type Draft = {
  occurredAt: string;
  intake: Intake | null;
  weight: string;
  memo: string;
  photos: Photo[];
};

const toDraft = (record: CareRecord): Draft => ({
  occurredAt: record.occurredAt,
  intake: record.intake,
  weight: record.weightG ? String(record.weightG) : "",
  memo: record.memo ?? "",
  photos: record.photos,
});

/**
 * 기록 정정 시트 (SCR-R02). 날짜·시각·결과·값·메모를 고치면 이전 값은 정정 내역에 남는다.
 * 삭제해도 토스트의 '되돌리기'로 복구할 수 있다.
 */
export function EditRecordSheet({
  recordId,
  onOpenChange,
}: {
  recordId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const {
    data: record,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...recordQueries.detail(recordId ?? ""),
    enabled: Boolean(recordId),
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);

  if (record && draftFor !== `${record.id}:${record.revisions.length}`) {
    setDraftFor(`${record.id}:${record.revisions.length}`);
    setDraft(toDraft(record));
  }

  const kind = record ? RECORD_KIND[record.careItem] : null;
  const original = record ? toDraft(record) : null;
  const dirty = Boolean(draft && original && JSON.stringify(draft) !== JSON.stringify(original));
  const weightValue = draft?.weight ? Number(draft.weight) : null;
  const weightInvalid = kind === "weight" && (!weightValue || weightValue <= 0);

  const refresh = () => invalidateCareData(queryClient);

  const save = useMutation({
    mutationFn: () =>
      recordsApi.update(record!.id, {
        occurredAt: draft!.occurredAt,
        intake: kind === "intake" ? draft!.intake : undefined,
        weightG: kind === "weight" ? weightValue : undefined,
        memo: draft!.memo.trim() || null,
        photoFileIds: draft!.photos.map((p) => p.id),
      }),
    onSuccess: () => onOpenChange(false),
    // 실패해도 편집 내용은 그대로 둔다
    onError: (error) => toast(getErrorMessage(error, "정정하지 못했어요.")),
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: () => recordsApi.remove(record!.id),
    // 삭제한 기록은 되돌릴 수 없다 (C4-2)
    onSuccess: () => {
      setConfirmDelete(false);
      onOpenChange(false);
    },
    onError: (error) => toast(getErrorMessage(error, "삭제하지 못했어요.")),
    onSettled: refresh,
  });

  const title = record
    ? `${record.petName} · ${CARE_ITEM_LABEL[record.careItem]} · ${formatDayLabel(format(parseISO(record.occurredAt), "yyyy-MM-dd"))}`
    : "기록";

  return (
    <>
      <Sheet
        open={Boolean(recordId)}
        onOpenChange={onOpenChange}
        title={title}
        footer={
          record && draft ? (
            <>
              <Button
                variant="outline"
                size="xl"
                className="w-[38%]"
                onClick={() => setConfirmDelete(true)}
              >
                기록 삭제
              </Button>
              <Button
                size="xl"
                className="flex-1"
                disabled={!dirty || weightInvalid || uploading || save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? (
                  <LoaderCircle className="size-5 animate-spin" aria-label="저장 중" />
                ) : (
                  "저장"
                )}
              </Button>
            </>
          ) : null
        }
      >
        {isPending ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : isError || !record || !draft ? (
          <LoadError onRetry={() => refetch()} />
        ) : (
          <>
            {kind === "intake" && record.type === "done" ? (
              <>
                <SheetLabel className="mt-1">얼마나 먹었나요?</SheetLabel>
                <ChipGroup
                  label="먹은 정도"
                  columns={2}
                  allowDeselect
                  options={INTAKES.map((value) => ({ value, label: INTAKE_LABEL[value] }))}
                  value={draft.intake}
                  onChange={(intake) => setDraft({ ...draft, intake })}
                />
              </>
            ) : null}
            {kind === "weight" ? (
              <>
                <SheetLabel className="mt-1">
                  <label htmlFor="edit-weight">몸무게</label>
                </SheetLabel>
                <Input
                  id="edit-weight"
                  inputMode="decimal"
                  suffix="g"
                  value={draft.weight}
                  onChange={(e) =>
                    setDraft({ ...draft, weight: e.target.value.replace(/[^0-9.]/g, "") })
                  }
                />
              </>
            ) : null}
            {kind === "check" && record.method === "routine" && !draft.photos.length ? (
              <InfoBox className="mt-1">
                O/X 기록이라 고칠 값이 없어요. 시각과 메모만 고칠 수 있어요.
              </InfoBox>
            ) : null}
            {kind === "memo" || record.method === "manual" || draft.photos.length ? (
              <>
                <SheetLabel className="mt-1">사진</SheetLabel>
                <PhotoInput
                  value={draft.photos}
                  onChange={(photos) => setDraft((d) => (d ? { ...d, photos } : d))}
                  onView={setViewer}
                  onBusyChange={setUploading}
                />
              </>
            ) : null}
            <SheetLabel>기록한 시각</SheetLabel>
            <DateTimeField
              value={draft.occurredAt}
              onChange={(occurredAt) => setDraft({ ...draft, occurredAt })}
            />
            <SheetLabel>
              <label htmlFor="edit-memo">메모 (선택)</label>
            </SheetLabel>
            <Textarea
              id="edit-memo"
              placeholder="메모를 남겨 주세요"
              maxLength={MEMO_MAX}
              value={draft.memo}
              onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
            />
          </>
        )}
      </Sheet>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="이 기록을 삭제할까요?"
        description="삭제한 기록은 되돌릴 수 없어요."
        confirmLabel="삭제"
        tone="danger"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
      <PhotoViewer
        open={viewer !== null}
        onOpenChange={(o) => !o && setViewer(null)}
        photos={draft?.photos ?? []}
        initialIndex={viewer ?? 0}
        caption={
          record ? (
            <>
              <p className="font-bold">{title}</p>
              {record.memo ? <p>{record.memo}</p> : null}
            </>
          ) : null
        }
      />
    </>
  );
}
