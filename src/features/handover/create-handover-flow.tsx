"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { petSpeciesLine } from "@/entities/pet";
import { recordQueries } from "@/entities/record";
import { meQueries } from "@/entities/session";
import { stageName, useSpeciesMap } from "@/entities/species";
import { handoverApi } from "@/shared/api/endpoints";
import type { PetDetail } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query-keys";
import { RECORD_WEEKS, type HandoverCard, type HandoverScope } from "@/shared/domain/handover";
import { formatMonthDay, subDays, toYmd, todayYmd, ymdOf } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { ChipGroup } from "@/shared/ui/chip";
import { Avatar, Badge, InfoBox, StepProgress } from "@/shared/ui/display";
import { Checkbox } from "@/shared/ui/form";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";
import { copyText, downloadQr, shareLink } from "./share";

/**
 * SCR-T01 인계 카드 만들기 (2차). 동의한 범위만 링크·QR로 넘긴다.
 * 받는 사람의 연락처·실명은 어디에도 받지 않는다.
 */
export function CreateHandoverFlow({ detail }: { detail: PetDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pet, routines } = detail;
  const species = useSpeciesMap();
  const { data: me } = useQuery(meQueries.detail());
  const [step, setStep] = useState<1 | 2>(1);
  const [scope, setScope] = useState<HandoverScope>({
    routines: true,
    recordWeeks: 0,
    photos: false,
    nickname: false,
  });
  const [agreed, setAgreed] = useState(false);
  const [card, setCard] = useState<HandoverCard | null>(null);

  const since = toYmd(subDays(new Date(), scope.recordWeeks * 7));
  const { data: records } = useQuery({
    ...recordQueries.list({ petId: pet.id, from: since, to: todayYmd(), limit: 200 }),
    enabled: scope.recordWeeks > 0,
  });
  const recordCount = records?.items.length ?? 0;
  const photoCount = records?.items.reduce((n, r) => n + r.photos.length, 0) ?? 0;
  const enabledRoutines = routines.filter((r) => r.enabled).length;
  const stage = stageName(species.get(pet.speciesId), pet.lifeStageCode);

  const create = useMutation({
    mutationFn: () => handoverApi.create(pet.id, scope),
    onSuccess: (created) => {
      setCard(created);
      void queryClient.invalidateQueries({ queryKey: queryKeys.handoverCards });
    },
    onError: (error) => toast(getErrorMessage(error, "카드를 만들지 못했어요.")),
  });

  if (card) return <HandoverResult card={card} onClose={() => router.replace(`/pets/${pet.id}`)} />;

  return (
    <Screen>
      <TopBar
        title="인계 카드 만들기"
        onLeading={step === 2 ? () => setStep(1) : undefined}
        fallbackHref={`/pets/${pet.id}`}
        trailing={
          <button
            type="button"
            aria-label="닫기"
            onClick={() => router.replace(`/pets/${pet.id}`)}
            className="flex size-10 items-center justify-center rounded-full text-[22px] hover:bg-muted"
          >
            ×
          </button>
        }
      />
      <ScreenBody className="space-y-4">
        <StepProgress step={step} total={2} label={step === 1 ? "넘길 내용" : "확인·동의"} />
        {step === 1 ? (
          <ul>
            <ScopeRow locked title="개체 기본 정보" description="이름·종·모프·생애 단계" />
            <ScopeRow locked title="분양일" />
            <ScopeRow
              title="체크 리스트"
              description="받는 분이 이어서 쓸 수 있어요"
              checked={scope.routines}
              onChange={(routinesOn) => setScope({ ...scope, routines: routinesOn })}
            />
            <li className="border-b border-border py-3">
              <p className="mb-2 text-[13px]">최근 기록</p>
              <ChipGroup
                label="최근 기록"
                size="sm"
                options={RECORD_WEEKS.map((w) => ({
                  value: w,
                  label: w === 0 ? "넘기지 않음" : `최근 ${w}주`,
                }))}
                value={scope.recordWeeks}
                onChange={(w) =>
                  setScope({ ...scope, recordWeeks: w ?? 0, photos: w ? scope.photos : false })
                }
              />
              {scope.recordWeeks > 0 ? (
                <p className="mt-2 text-[12px] text-[#888]">
                  {scope.photos
                    ? `기록 ${recordCount}개 · 사진 ${photoCount}장이 함께 넘어가요`
                    : `기록 ${recordCount}개가 함께 넘어가요`}
                </p>
              ) : null}
            </li>
            <ScopeRow
              title="사진"
              description={scope.recordWeeks ? `기록에 붙은 사진 ${photoCount}장` : undefined}
              checked={scope.photos}
              disabled={scope.recordWeeks === 0}
              onChange={(photos) => setScope({ ...scope, photos })}
            />
            <ScopeRow
              title="내 닉네임 보여 주기"
              description={
                scope.nickname && me
                  ? `받는 분에게 '${me.nickname}'로 보여요`
                  : "고른 경우에만 보여요"
              }
              checked={scope.nickname}
              onChange={(nickname) => setScope({ ...scope, nickname })}
            />
          </ul>
        ) : (
          <>
            <h2 className="text-[17px] font-bold">받는 분에게 이렇게 보여요</h2>
            <div className="flex items-center gap-3.5 rounded-[14px] border-[1.3px] border-[#ddd] p-3.5">
              <Avatar src={pet.photoUrl} size={52} />
              <div className="min-w-0 text-[12.5px] text-muted-foreground">
                <p className="text-[17px] font-bold text-foreground">{pet.name}</p>
                <p>
                  {petSpeciesLine(pet)} · {stage}
                </p>
                <p>
                  분양일 {formatMonthDay(todayYmd())}
                  {scope.routines ? ` · 체크 리스트 ${enabledRoutines}개` : ""}
                </p>
              </div>
            </div>
            <InfoBox className="space-y-0.5">
              <p>
                최근 기록 ·{" "}
                {scope.recordWeeks ? `최근 ${scope.recordWeeks}주 ${recordCount}개` : "넘기지 않음"}
              </p>
              <p>사진 · {scope.photos ? `${photoCount}장` : "넘기지 않음"}</p>
              <p>내 닉네임 · {scope.nickname ? "보여요" : "보이지 않음"}</p>
            </InfoBox>
            <label className="flex items-center gap-2.5 text-[14px]">
              <Checkbox checked={agreed} onCheckedChange={(on) => setAgreed(on === true)} />이
              범위로 넘기는 데 동의해요
            </label>
          </>
        )}
      </ScreenBody>
      <ScreenFooter>
        {step === 1 ? (
          <Button size="xl" onClick={() => setStep(2)}>
            다음
          </Button>
        ) : (
          <Button size="xl" disabled={!agreed || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "만드는 중…" : "카드 만들기"}
          </Button>
        )}
      </ScreenFooter>
    </Screen>
  );
}

function ScopeRow({
  title,
  description,
  locked,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description?: string;
  locked?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (on: boolean) => void;
}) {
  return (
    <li className="border-b border-border py-3">
      <label className="flex items-center gap-3">
        <Checkbox
          checked={locked ? true : checked}
          disabled={locked || disabled}
          onCheckedChange={(on) => onChange?.(on === true)}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">{title}</span>
          {description ? (
            <span className="block text-[12px] text-[#888]">{description}</span>
          ) : null}
        </span>
        {locked ? <Badge>항상 넘겨요</Badge> : null}
      </label>
    </li>
  );
}

function HandoverResult({ card, onClose }: { card: HandoverCard; onClose: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);
  return (
    <Screen>
      <TopBar
        title="인계 카드 만들기 · 결과"
        trailing={
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full text-[22px] hover:bg-muted"
          >
            ×
          </button>
        }
      />
      <ScreenBody>
        <div className="rounded-[14px] border-[1.3px] border-[#ddd] p-4">
          <h2 className="text-[17px] font-bold">인계 카드를 만들었어요</h2>
          <p className="mt-1 text-[12.5px] text-[#888]">
            {formatMonthDay(ymdOf(card.expiresAt))}까지 열 수 있어요
          </p>
          <div
            ref={qrRef}
            className="mx-auto my-4 w-fit rounded-xl border border-[#ddd] bg-white p-3"
          >
            <QRCodeSVG value={card.url} size={132} />
          </div>
          <Button size="xl" onClick={() => copyText(card.url, "링크를 복사했어요")}>
            링크 복사
          </Button>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => shareLink(card.url)}
            >
              공유하기
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => downloadQr(qrRef.current, `pabom-${card.code}.svg`)}
            >
              QR 저장
            </Button>
          </div>
          <Link
            href="/settings/handover-cards"
            className="mt-3 block text-center text-[13px] font-medium text-primary"
          >
            보낸 카드 보기
          </Link>
        </div>
      </ScreenBody>
    </Screen>
  );
}
