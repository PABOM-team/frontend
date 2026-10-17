"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { petsApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { invalidateCareData } from "@/shared/api/query-keys";
import { END_REASON_LABEL, endReasonSchema, type EndReason, type Pet } from "@/shared/domain/pet";
import { todayYmd } from "@/shared/lib/date";
import { josa } from "@/shared/lib/josa";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { ChipGroup } from "@/shared/ui/chip";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Sheet, SheetLabel } from "@/shared/ui/sheet";
import { toast } from "@/shared/ui/toast";

/** 개체를 함께했던 개체로 바꾸는 시트 (SCR-P06). 기록은 남고 오늘 할 일·체크 리스트에서 빠진다 */
export function ChangeStatusSheet({
  pet,
  open,
  onOpenChange,
}: {
  pet: Pet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<EndReason | null>("rehomed");
  const [date, setDate] = useState<string | null>(todayYmd());

  const change = useMutation({
    mutationFn: () => petsApi.changeStatus(pet.id, { type: "end", reason: reason!, date: date! }),
    onSuccess: () => {
      onOpenChange(false);
      router.replace("/pets");
      toast(`${josa(pet.name, "을/를")} 함께했던 개체로 바꿨어요`, {
        action: {
          label: "되돌리기",
          onClick: () =>
            petsApi
              .changeStatus(pet.id, { type: "revert" })
              .then(() => invalidateCareData(queryClient))
              .catch((error) => toast(getErrorMessage(error))),
        },
      });
    },
    onError: (error) => toast(getErrorMessage(error, "바꾸지 못했어요.")),
    onSettled: () => invalidateCareData(queryClient),
  });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${josa(pet.name, "을/를")} 함께했던 개체로 바꾸기`}
      description="기록은 그대로 남고, 오늘 할 일과 체크 리스트에서 빠져요."
      footer={
        <Button
          size="xl"
          disabled={!reason || !date || change.isPending}
          onClick={() => change.mutate()}
        >
          바꾸기
        </Button>
      }
    >
      <SheetLabel className="mt-1">이유</SheetLabel>
      <ChipGroup
        label="이유"
        options={endReasonSchema.options.map((value) => ({
          value,
          label: END_REASON_LABEL[value],
        }))}
        value={reason}
        onChange={setReason}
      />
      <SheetLabel>날짜</SheetLabel>
      <DateField title="날짜" value={date} onChange={setDate} max={todayYmd()} />
    </Sheet>
  );
}

/** 함께했던 개체를 다시 키우는 중으로 */
export function useRevertPetStatus(pet: Pet | undefined) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => petsApi.changeStatus(pet!.id, { type: "revert" }),
    onSuccess: () => {
      router.replace(`/pets/${pet!.id}`);
      toast(`${josa(pet!.name, "을/를")} 내 개체로 되돌렸어요`);
    },
    onError: (error) => toast(getErrorMessage(error)),
    onSettled: () => invalidateCareData(queryClient),
  });
}

/** 개체 삭제 확인 창 (C4 위험 확인). 잘못 만든 개체를 지울 때만, 떠나보낸 개체는 상태 변경을 안내 */
export function DeletePetDialog({
  pet,
  open,
  onOpenChange,
}: {
  pet: Pet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => petsApi.remove(pet.id),
    onSuccess: () => {
      onOpenChange(false);
      router.replace(pet.status === "ended" ? "/pets/archived" : "/pets");
      toast(`${josa(pet.name, "을/를")} 삭제했어요`);
    },
    onError: (error) => toast(getErrorMessage(error, "삭제하지 못했어요.")),
    onSettled: () => invalidateCareData(queryClient),
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${josa(pet.name, "을/를")} 삭제할까요?`}
      description={
        pet.status === "active"
          ? "기록·체크 리스트가 모두 지워져요. 분양 보냈거나 무지개다리를 건넜다면 삭제 대신 '함께했던 개체로 바꾸기'를 써 주세요."
          : "기록이 모두 지워지고 되돌릴 수 없어요."
      }
      confirmLabel="삭제"
      tone="danger"
      pending={remove.isPending}
      onConfirm={() => remove.mutate()}
    />
  );
}
