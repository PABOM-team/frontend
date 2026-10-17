"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FullScreenLoading, LoginButtons } from "@/features/auth";
import { UnavailableCard } from "@/features/handover";
import { handoverQueries } from "@/entities/handover";
import { meQueries } from "@/entities/session";
import { stageName, useSpeciesMap } from "@/entities/species";
import { formatInterval, INTAKE_LABEL, ROUTINE_LABEL } from "@/shared/domain/care";
import { SPECIES_LABEL } from "@/shared/domain/pet";
import { formatMonthDay, ymdOf } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { Avatar, PhotoBox } from "@/shared/ui/display";
import { PabomLogo } from "@/shared/ui/pabom-logo";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";

/** 미리보기에서 먼저 보여 줄 최근 기록 줄 수 (U7) */
const PREVIEW_RECORDS = 3;

export function HandoverPreviewScreen({ code }: { code: string }) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const preview = useQuery(handoverQueries.preview(code));
  const { data: me } = useQuery({ ...meQueries.detail(), retry: false });
  const species = useSpeciesMap();
  const registerPath = `/share/${code}/register`;

  if (preview.isPending) return <FullScreenLoading />;

  const pet = preview.data?.pet;
  if (preview.isError || !pet || preview.data.status !== "unused") {
    return <UnavailableCard loggedIn={Boolean(me)} />;
  }
  const data = preview.data;
  const spec = species.get(pet.speciesId);

  return (
    <Screen>
      <ScreenBody className="pt-4">
        <PabomLogo size="sm" />
        <h1 className="mt-3 text-[18px] font-bold">
          {data.senderNickname ? `${data.senderNickname}님이 보낸 인계 카드` : "인계 카드"}
        </h1>
        <div className="mt-3 flex items-center gap-3.5 rounded-[14px] border-[1.3px] border-[#ddd] p-3.5">
          <Avatar size={52} />
          <div className="min-w-0 text-[12.5px] text-muted-foreground">
            <p className="text-[17px] font-bold text-foreground">{pet.name}</p>
            <p>{[SPECIES_LABEL[pet.speciesId], pet.morph].filter(Boolean).join(" · ")}</p>
            <p>
              {stageName(spec, pet.lifeStageCode)} · 분양일 {formatMonthDay(pet.handedOverOn)}
            </p>
          </div>
        </div>

        {data.routines.length ? (
          <>
            <h2 className="mt-5 text-[14px] font-medium">체크 리스트</h2>
            <ul>
              {data.routines.map((r) => (
                <li
                  key={r.careItem}
                  className="flex justify-between border-b border-border py-2.5 text-[14px]"
                >
                  {ROUTINE_LABEL[r.careItem]}
                  <span className="text-[#888]">{formatInterval(r.intervalDays)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-[#888]">
              보낸 분이 쓰던 체크 리스트예요. 등록한 뒤 내 환경에 맞게 바꿀 수 있어요.
            </p>
          </>
        ) : null}

        <h2 className="mt-5 text-[14px] font-medium">
          최근 기록
          {data.records ? (
            <span className="text-[#888]">
              {" "}
              · 최근 {data.recordWeeks}주 · {data.records.length}개
            </span>
          ) : null}
        </h2>
        {data.records ? (
          <ul>
            {(showAll ? data.records : data.records.slice(0, PREVIEW_RECORDS)).map((r) => (
              <li
                key={r.occurredAt}
                className="flex items-center gap-3 border-b border-border py-2.5 text-[14px]"
              >
                {/* 사진이 붙은 기록은 왼쪽에 사진 자리 (U7) */}
                {r.photoCount ? <PhotoBox /> : null}
                <span className="min-w-0 flex-1">
                  {formatMonthDay(ymdOf(r.occurredAt))} {r.careItem}
                  {r.intake ? ` · ${INTAKE_LABEL[r.intake]}` : ""}
                  {r.weightG ? ` · ${r.weightG.toFixed(1)} g` : ""}
                  {r.memo ? <span className="block text-[12px] text-[#888]">{r.memo}</span> : null}
                </span>
                {r.method === "routine" ? (
                  <span className="shrink-0 text-[12px] text-[#888]">할 일 체크</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-[#888]">보낸 분이 고른 경우에만 보여요</p>
        )}
        {data.records && data.records.length > PREVIEW_RECORDS && !showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mx-auto mt-3 flex items-center gap-0.5 text-[13.5px] font-bold text-primary"
          >
            기록 {data.records.length}개 모두 보기
            <ChevronRight className="size-3.5" />
          </button>
        ) : null}
      </ScreenBody>
      <ScreenFooter>
        {me ? (
          <Button size="xl" onClick={() => router.push(registerPath)}>
            내 개체로 등록하기
          </Button>
        ) : (
          <LoginButtons
            next={registerPath}
            labels={{ kakao: "카카오로 시작하고 등록하기", google: "Google로 시작하고 등록하기" }}
          />
        )}
      </ScreenFooter>
    </Screen>
  );
}
