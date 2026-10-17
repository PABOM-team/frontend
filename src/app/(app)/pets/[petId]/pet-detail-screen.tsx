"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { petQueries, petSpeciesLine } from "@/entities/pet";
import { RecordRow } from "@/entities/record";
import { routinesShortLine } from "@/entities/routine";
import { stageName, useSpeciesMap } from "@/entities/species";
import { ChangeStatusSheet, DeletePetDialog, useRevertPetStatus } from "@/features/pet-lifecycle";
import { EditRecordSheet } from "@/features/record-editor";
import { getHttpStatus } from "@/shared/api/errors";
import { END_REASON_LABEL, SEX_LABEL, SEX_SYMBOL } from "@/shared/domain/pet";
import type { CareRecord } from "@/shared/domain/record";
import { formatFullDate, ymdOf } from "@/shared/lib/date";
import { format, parseISO } from "date-fns";
import { Avatar, InfoBox, InfoRow, Skeleton, StateMessage } from "@/shared/ui/display";
import { Menu } from "@/shared/ui/menu";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-P04 개체 상세. 함께했던 개체면 맨 위 띠, 체크 리스트 줄 없음, 기록만 볼 수 있다 */
export function PetDetailScreen() {
  const { petId } = useParams<{ petId: string }>();
  const router = useRouter();
  const species = useSpeciesMap();
  const { data, isPending, isError, error, refetch } = useQuery(petQueries.detail(petId));
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<CareRecord | null>(null);
  const revert = useRevertPetStatus(data?.pet);

  if (isPending) {
    return (
      <Screen>
        <TopBar fallbackHref="/pets" />
        <ScreenBody className="space-y-4">
          <Skeleton className="h-[72px]" />
          <Skeleton className="h-40" />
        </ScreenBody>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <TopBar fallbackHref="/pets" />
        {getHttpStatus(error) === 404 ? (
          <StateMessage
            className="flex-1 justify-center"
            title="개체를 찾을 수 없어요"
            description="삭제됐거나 주소가 바뀌었어요."
            action={{ label: "내 개체로 가기", onClick: () => router.replace("/pets") }}
          />
        ) : (
          <StateMessage
            className="flex-1 justify-center"
            title="화면을 보여 주지 못했어요"
            description="잠시 뒤 다시 시도해 주세요."
            action={{ label: "다시 시도", onClick: () => refetch() }}
          />
        )}
      </Screen>
    );
  }

  const { pet, routines, recentRecords } = data;
  const ended = pet.status === "ended";
  const spec = species.get(pet.speciesId);

  return (
    <Screen>
      <TopBar
        title={pet.name}
        fallbackHref={ended ? "/pets/archived" : "/pets"}
        trailing={
          <Menu
            label={`${pet.name} 메뉴`}
            items={
              ended
                ? [
                    { label: "키우는 중으로 되돌리기", onSelect: () => revert.mutate() },
                    { label: "개체 삭제", tone: "danger", onSelect: () => setDeleteOpen(true) },
                  ]
                : [
                    { label: "정보 수정", onSelect: () => router.push(`/pets/${pet.id}/edit`) },
                    { label: "함께했던 개체로 바꾸기", onSelect: () => setStatusOpen(true) },
                    {
                      label: "인계 카드 만들기",
                      onSelect: () => router.push(`/pets/${pet.id}/handover`),
                    },
                    { label: "개체 삭제", tone: "danger", onSelect: () => setDeleteOpen(true) },
                  ]
            }
          />
        }
      />
      <ScreenBody>
        {ended && pet.endedOn && pet.endReason ? (
          <InfoBox className="mb-4 bg-[#f0f0f0] text-[13px] text-[#444]">
            {formatFullDate(pet.endedOn)} {END_REASON_LABEL[pet.endReason]} · 기록만 볼 수 있어요
          </InfoBox>
        ) : null}

        <div className="flex items-center gap-4">
          <Avatar src={pet.photoUrl} size={72} />
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-[22px] font-bold">
              {pet.name}
              {SEX_SYMBOL[pet.sex] ? (
                <span className="text-[15px] text-primary" aria-label={SEX_LABEL[pet.sex]}>
                  {SEX_SYMBOL[pet.sex]}
                </span>
              ) : null}
            </h2>
            <p className="text-[13px] text-muted-foreground">{petSpeciesLine(pet)}</p>
            {spec ? (
              <p className="text-[12px] text-[#999]">
                {spec.officialName} · <i>{spec.scientificName}</i>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          <InfoRow label="생애 단계">
            {stageName(spec, pet.lifeStageCode)}{" "}
            <span className="text-[12px] text-[#999]">
              ({pet.lifeStageSource === "hatch" ? "부화일 기준" : "직접 고름"}
              {pet.stageUncertain ? " · 정확하지 않음" : ""})
            </span>
          </InfoRow>
          <InfoRow label="부화일">
            {pet.hatchedOn ? formatFullDate(pet.hatchedOn) : "몰라요"}
          </InfoRow>
          {!ended ? <InfoRow label="성별">{SEX_LABEL[pet.sex]}</InfoRow> : null}
          {pet.acquiredOn && !ended ? (
            <InfoRow label="데려온 날">{formatFullDate(pet.acquiredOn)}</InfoRow>
          ) : null}
        </div>

        {!ended ? (
          <Link
            href={`/pets/${pet.id}/routines`}
            className="mt-2 flex min-h-[52px] items-center gap-3 border-b border-border py-3"
          >
            <span className="shrink-0 text-[15px] font-bold">체크 리스트</span>
            <span className="min-w-0 flex-1 truncate text-right text-[13px] text-muted-foreground">
              {routinesShortLine(routines) || "켜진 항목이 없어요"}
            </span>
            <ChevronRight className="size-4 shrink-0 text-[#888]" />
          </Link>
        ) : null}

        <h3 className="mt-4 mb-1 text-[14px] font-medium">최근 기록</h3>
        {recentRecords.length === 0 ? (
          <p className="py-4 text-[13px] text-muted-foreground">아직 남긴 기록이 없어요</p>
        ) : (
          recentRecords.map((record) => (
            <RecordRow
              key={record.id}
              record={record}
              variant="list"
              prefix={format(parseISO(record.occurredAt), "M월 d일")}
              onClick={() => setEditRecordId(record.id)}
              onPhotoClick={() => setViewing(record)}
            />
          ))
        )}
        {recentRecords.length ? (
          <Link
            href={`/pets/${pet.id}/records`}
            className="mx-auto mt-3 flex w-fit items-center gap-0.5 py-2 text-[14px] font-bold text-primary"
          >
            전체 기록 보기
            <ChevronRight className="size-3.5" />
          </Link>
        ) : null}
      </ScreenBody>

      {!ended ? (
        <ChangeStatusSheet pet={pet} open={statusOpen} onOpenChange={setStatusOpen} />
      ) : null}
      <DeletePetDialog pet={pet} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <EditRecordSheet
        recordId={editRecordId}
        onOpenChange={(open) => !open && setEditRecordId(null)}
      />
      <PhotoViewer
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && setViewing(null)}
        photos={viewing?.photos ?? []}
        caption={
          viewing ? (
            <p className="font-bold">
              {viewing.petName} · {formatFullDate(ymdOf(viewing.occurredAt))}
            </p>
          ) : null
        }
      />
    </Screen>
  );
}
