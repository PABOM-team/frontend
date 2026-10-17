"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSpeciesMap } from "@/entities/species";
import { handoverApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { invalidateCareData, queryKeys } from "@/shared/api/query-keys";
import type { HandoverPreview } from "@/shared/domain/handover";
import { SPECIES_LABEL } from "@/shared/domain/pet";
import { lifeStageFromHatch } from "@/shared/domain/species";
import { todayYmd } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { Field, Input, Switch } from "@/shared/ui/form";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-T03 인계 카드로 개체 등록 (2차). 카드 내용으로 미리 채우고, 종은 읽기 전용 */
export function AcceptHandoverForm({
  preview,
}: {
  preview: HandoverPreview & { pet: NonNullable<HandoverPreview["pet"]> };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const species = useSpeciesMap().get(preview.pet.speciesId);
  const [name, setName] = useState(preview.pet.name);
  const [hatchedOn, setHatchedOn] = useState(preview.pet.hatchedOn);
  const [acquiredOn, setAcquiredOn] = useState<string | null>(preview.pet.handedOverOn);
  const [importRoutines, setImportRoutines] = useState(preview.routines.length > 0);
  const stage = species ? lifeStageFromHatch(species, hatchedOn) : null;

  const accept = useMutation({
    mutationFn: () =>
      handoverApi.accept(preview.code, {
        name: name.trim(),
        hatchedOn,
        acquiredOn: acquiredOn!,
        importRoutines,
      }),
    onSuccess: async (pet) => {
      await invalidateCareData(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.handoverPreview(preview.code) });
      router.replace(`/pets/${pet.id}/routines?from=register`);
    },
    onError: (error) => toast(getErrorMessage(error, "등록하지 못했어요.")),
  });

  return (
    <Screen>
      <TopBar title="인계 카드로 등록하기" fallbackHref={`/share/${preview.code}`} />
      <ScreenBody className="space-y-4">
        <p className="text-[13px] text-[#555]">
          카드 내용을 미리 채웠어요. 확인하고 필요하면 고쳐 주세요.
        </p>
        <Field label="이름" htmlFor="accept-name">
          <Input
            id="accept-name"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="종 · 모프">
          <p className="flex h-12 items-center rounded-[10px] bg-[#f3f3f3] px-3.5 text-[15px] text-[#444]">
            {[SPECIES_LABEL[preview.pet.speciesId], preview.pet.morph].filter(Boolean).join(" · ")}
          </p>
        </Field>
        <Field
          label="부화일"
          htmlFor="accept-hatched"
          hint={stage ? `생애 단계 · ${stage.name} (자동)` : undefined}
        >
          <DateField
            id="accept-hatched"
            title="부화일"
            value={hatchedOn}
            max={todayYmd()}
            onChange={setHatchedOn}
          />
        </Field>
        <Field label="분양받은 날" htmlFor="accept-acquired">
          <DateField
            id="accept-acquired"
            title="분양받은 날"
            value={acquiredOn}
            max={todayYmd()}
            onChange={setAcquiredOn}
          />
        </Field>
        {preview.routines.length ? (
          <label className="flex items-center gap-3 pt-2">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">체크 리스트도 가져오기</span>
              <span className="block text-[12px] text-[#888]">
                항목 {preview.routines.length}개 · 다음 예정일은 오늘 기준으로 다시 계산해요
              </span>
            </span>
            <Switch checked={importRoutines} onCheckedChange={setImportRoutines} />
          </label>
        ) : null}
      </ScreenBody>
      <ScreenFooter>
        <Button
          size="xl"
          disabled={!name.trim() || !acquiredOn || accept.isPending}
          onClick={() => accept.mutate()}
        >
          {accept.isPending ? "등록 중…" : "등록하기"}
        </Button>
      </ScreenFooter>
    </Screen>
  );
}
