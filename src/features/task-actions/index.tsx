"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { recordsApi, routinesApi } from "@/shared/api/endpoints";
import { getApiError, getErrorMessage } from "@/shared/api/errors";
import { invalidateCareData } from "@/shared/api/query-keys";
import { CARE_ITEM_LABEL, RECORD_KIND } from "@/shared/domain/care";
import type { CompleteInput } from "@/shared/domain/record";
import type { Task } from "@/shared/domain/today";
import { formatShortDay } from "@/shared/lib/date";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import type { MenuItem } from "@/shared/ui/menu";
import { toast } from "@/shared/ui/toast";
import { BasisSheet } from "./basis-sheet";
import { CompleteSheet } from "./complete-sheet";
import { PostponeSheet, SkipSheet } from "./postpone-sheet";

/**
 * 오늘 할 일 카드의 행동 모음 (FL-02·FL-03).
 * 기록 정정·일정 수정은 다른 기능이라 화면에서 콜백으로 넘겨받는다.
 */
export function useTaskActions({
  onEditRecord,
  onEditRoutine,
}: {
  onEditRecord: (recordId: string) => void;
  onEditRoutine: (task: Task) => void;
}) {
  const queryClient = useQueryClient();
  const [completing, setCompleting] = useState<Task | null>(null);
  const [postponing, setPostponing] = useState<Task | null>(null);
  const [skipping, setSkipping] = useState<Task | null>(null);
  const [basis, setBasis] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [alreadyOpen, setAlreadyOpen] = useState(false);

  const refresh = () => invalidateCareData(queryClient);

  const undoRecord = (recordId: string) =>
    recordsApi
      .remove(recordId)
      .then(refresh)
      .catch((error) => toast(getErrorMessage(error, "되돌리지 못했어요.")));

  const complete = useMutation({
    mutationFn: ({ task, input }: { task: Task; input: CompleteInput }) =>
      routinesApi.complete(task.routineId, input),
    onMutate: ({ task }) => setCheckingId(task.routineId),
    onSuccess: (record, { task }) => {
      setCompleting(null);
      toast(`'${CARE_ITEM_LABEL[task.careItem]}' 기록을 저장했어요`, {
        action: { label: "되돌리기", onClick: () => undoRecord(record.id) },
      });
    },
    onError: (error, variables) => {
      if (getApiError(error)?.code === "ALREADY_RECORDED") {
        setCompleting(null);
        setAlreadyOpen(true);
        return;
      }
      // 시트는 그대로 두고 다시 시도 (C3-4)
      toast("저장하지 못했어요", {
        action: { label: "다시 시도", onClick: () => complete.mutate(variables) },
      });
    },
    onSettled: () => {
      setCheckingId(null);
      return refresh();
    },
  });

  const postpone = useMutation({
    mutationFn: ({ task, date }: { task: Task; date: string }) =>
      routinesApi.postpone(task.routineId, date),
    onSuccess: (_, { date }) => {
      setPostponing(null);
      toast(`${formatShortDay(date)}로 미뤘어요`);
    },
    onError: (error) => toast(getErrorMessage(error, "미루지 못했어요.")),
    onSettled: refresh,
  });

  const skip = useMutation({
    mutationFn: ({ task, reason }: { task: Task; reason: string | null }) =>
      routinesApi.skip(task.routineId, reason),
    // 건너뛴 할 일은 '완료·건너뜀'으로 옮겨 가니 토스트는 두지 않는다 (Figma에 없음)
    onSuccess: () => setSkipping(null),
    onError: (error) => toast(getErrorMessage(error, "건너뛰지 못했어요.")),
    onSettled: refresh,
  });

  const disable = useMutation({
    mutationFn: (task: Task) => routinesApi.update(task.routineId, { enabled: false }),
    onSuccess: () => setDeleting(null),
    onError: (error) => toast(getErrorMessage(error, "삭제하지 못했어요.")),
    onSettled: refresh,
  });

  const cancelRecord = useMutation({
    mutationFn: (recordId: string) => recordsApi.remove(recordId),
    onError: (error) => toast(getErrorMessage(error, "되돌리지 못했어요.")),
    onSettled: refresh,
  });

  /** 체크 동그라미: 값이 필요 없는 항목(분무 등)은 시트 없이 바로 저장 */
  const check = (task: Task) => {
    if (RECORD_KIND[task.careItem] === "check") complete.mutate({ task, input: {} });
    else setCompleting(task);
  };

  const menuFor = (task: Task): MenuItem[] => {
    if (task.state === "done") {
      return [
        { label: "수정하기", onSelect: () => task.record && onEditRecord(task.record.id) },
        { label: "완료 취소", onSelect: () => task.record && cancelRecord.mutate(task.record.id) },
      ];
    }
    if (task.state === "skipped") {
      return [
        {
          label: "건너뛰기 취소",
          onSelect: () => task.record && cancelRecord.mutate(task.record.id),
        },
        { label: "수정하기", onSelect: () => onEditRoutine(task) },
      ];
    }
    // 앞 날짜(U1)의 ⋯: 그날 할 일은 아직 체크·미루기를 못 하니 일정 자체를 고치거나 지운다
    if (task.state === "planned") {
      return [
        { label: "수정하기", onSelect: () => onEditRoutine(task) },
        { label: "삭제하기", tone: "danger", onSelect: () => setDeleting(task) },
      ];
    }
    return [
      { label: "수정하기", onSelect: () => onEditRoutine(task) },
      { label: "미루기", onSelect: () => setPostponing(task) },
      { label: "건너뛰기", onSelect: () => setSkipping(task) },
      { label: "삭제하기", tone: "danger", onSelect: () => setDeleting(task) },
    ];
  };

  const sheets = (
    <>
      <CompleteSheet
        task={completing}
        onOpenChange={(open) => !open && setCompleting(null)}
        pending={complete.isPending}
        onSubmit={(task, input) => complete.mutate({ task, input })}
      />
      <PostponeSheet
        task={postponing}
        onOpenChange={(open) => !open && setPostponing(null)}
        pending={postpone.isPending}
        onSubmit={(task, date) => postpone.mutate({ task, date })}
      />
      <SkipSheet
        task={skipping}
        onOpenChange={(open) => !open && setSkipping(null)}
        pending={skip.isPending}
        onSubmit={(task, reason) => skip.mutate({ task, reason })}
      />
      <BasisSheet task={basis} onOpenChange={(open) => !open && setBasis(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `'${CARE_ITEM_LABEL[deleting.careItem]}' 할 일을 삭제할까요?` : ""}
        description="앞으로 오늘 할 일에 뜨지 않아요. 체크 리스트에서 다시 켤 수 있어요."
        confirmLabel="삭제"
        tone="danger"
        pending={disable.isPending}
        onConfirm={() => deleting && disable.mutate(deleting)}
      />
      <ConfirmDialog
        open={alreadyOpen}
        onOpenChange={setAlreadyOpen}
        title="다른 기기에서 이미 기록했어요"
        description="목록을 새로 불러올게요."
        confirmLabel="확인"
        cancelLabel={null}
        onConfirm={() => {
          setAlreadyOpen(false);
          void refresh();
        }}
      />
    </>
  );

  return { check, menuFor, openBasis: setBasis, checkingId, sheets };
}
