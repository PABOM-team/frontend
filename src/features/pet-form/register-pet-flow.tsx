"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { meQueries } from "@/entities/session";
import { speciesQueries } from "@/entities/species";
import { petsApi } from "@/shared/api/endpoints";
import { getApiError, getErrorMessage } from "@/shared/api/errors";
import { invalidateCareData } from "@/shared/api/query-keys";
import { SEX_LABEL, sexSchema, type Sex } from "@/shared/domain/pet";
import { SPECIES_GROUP_LABEL, type SpeciesGroup, type SpeciesId } from "@/shared/domain/species";
import { todayYmd } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { ChipGroup } from "@/shared/ui/chip";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PhotoBox, Skeleton, StepProgress } from "@/shared/ui/display";
import { Field, Input } from "@/shared/ui/form";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { toast } from "@/shared/ui/toast";
import { TopBar, TopBarAction } from "@/shared/ui/top-bar";
import { HatchFields, MorphPicker, PetPhotoPicker, type PhotoValue } from "./fields";

const STEPS = ["분류", "종", "모프", "기본 정보"] as const;

type Draft = {
  group: SpeciesGroup | null;
  speciesId: SpeciesId | null;
  morph: string | null;
  name: string;
  photo: PhotoValue;
  hatchedOn: string | null;
  hatchUnknown: boolean;
  lifeStageCode: string | null;
  stageUncertain: boolean;
  sex: Sex;
  acquiredOn: string | null;
};

const EMPTY: Draft = {
  group: null,
  speciesId: null,
  morph: null,
  name: "",
  photo: { fileId: null, url: null },
  hatchedOn: null,
  hatchUnknown: false,
  lifeStageCode: null,
  stageUncertain: false,
  sex: "unknown",
  acquiredOn: null,
};

/**
 * SCR-P02 개체 등록 4단계 (분류 · 종 · 모프 · 기본 정보).
 * onboarding이면 가입 직후 안내(A04 A안): 인사 문구와 '나중에 할게요'.
 */
export function RegisterPetFlow({ onboarding }: { onboarding: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useQuery(meQueries.detail());
  const { data: speciesList, isPending: speciesPending } = useQuery(speciesQueries.list());
  const [step, setStep] = useState(1);
  // Figma(A04 A안·P02 1/4) 모두 도마뱀이 골라진 채로 시작한다
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, group: "lizard" });
  const [exitOpen, setExitOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const species = speciesList?.find((s) => s.id === draft.speciesId);
  const dirty = JSON.stringify(draft) !== JSON.stringify({ ...EMPTY, group: draft.group });
  const exit = () => router.replace(onboarding ? "/home" : "/pets");

  const create = useMutation({
    mutationFn: () =>
      petsApi.create({
        name: draft.name.trim(),
        speciesId: draft.speciesId!,
        morph: draft.morph?.trim() || null,
        sex: draft.sex,
        hatchedOn: draft.hatchUnknown ? null : draft.hatchedOn,
        lifeStageCode: draft.hatchUnknown ? draft.lifeStageCode : null,
        stageUncertain: draft.hatchUnknown && draft.stageUncertain,
        acquiredOn: draft.acquiredOn,
        photoFileId: draft.photo.fileId,
      }),
    onSuccess: async (pet) => {
      await invalidateCareData(queryClient);
      router.replace(`/pets/${pet.id}/routines?from=register`);
    },
    onError: (error) => {
      const fields = getApiError(error)?.fields;
      if (fields?.name) setNameError(fields.name);
      toast(getErrorMessage(error, "등록하지 못했어요."));
    },
  });

  const canNext =
    (step === 1 && draft.group === "lizard") ||
    (step === 2 && Boolean(draft.speciesId)) ||
    step === 3;
  const canSubmit =
    draft.name.trim().length > 0 &&
    (draft.hatchUnknown ? Boolean(draft.lifeStageCode) : Boolean(draft.hatchedOn)) &&
    !uploading &&
    !create.isPending;

  const goBack = () => {
    if (step > 1) setStep(step - 1);
    else if (dirty) setExitOpen(true);
    else exit();
  };

  return (
    <Screen>
      <TopBar
        title="개체 등록"
        leading={step === 1 && onboarding ? "none" : "back"}
        onLeading={goBack}
        trailing={
          <>
            {step === 3 ? (
              <TopBarAction
                onClick={() => {
                  patch({ morph: null });
                  setStep(4);
                }}
              >
                건너뛰기
              </TopBarAction>
            ) : null}
            <button
              type="button"
              aria-label="닫기"
              onClick={() => (dirty ? setExitOpen(true) : exit())}
              className="flex size-10 items-center justify-center rounded-full text-[22px] leading-none hover:bg-muted"
            >
              ×
            </button>
          </>
        }
      />
      <ScreenBody className="space-y-5">
        <StepProgress
          step={step}
          total={4}
          label={step === 1 && onboarding ? "분류 고르기" : STEPS[step - 1]!}
        />

        {step === 1 ? (
          <>
            <h2 className="text-[20px] leading-snug font-bold whitespace-pre-line">
              {onboarding
                ? `${me?.nickname ? `${me.nickname}님, ` : ""}반가워요\n어떤 친구를 키우나요?`
                : "어떤 친구인가요?"}
            </h2>
            <div className="space-y-2.5">
              <ChoiceCard
                selected={draft.group === "lizard"}
                title={SPECIES_GROUP_LABEL.lizard}
                onClick={() => patch({ group: "lizard" })}
              />
              {/* 뱀(볼파이톤)은 MVP 범위 밖이라 고를 수 없다 (CLAUDE.md). 글은 Figma 그대로 */}
              <ChoiceCard
                disabled
                title={SPECIES_GROUP_LABEL.snake}
                description={onboarding ? undefined : "볼파이톤"}
              />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="text-[20px] font-bold">어떤 종인가요?</h2>
            {speciesPending ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="space-y-2.5">
                {(speciesList ?? [])
                  .filter((s) => s.group === "lizard")
                  .map((s) => (
                    <ChoiceCard
                      key={s.id}
                      selected={draft.speciesId === s.id}
                      title={s.commonName}
                      onClick={() =>
                        patch({
                          speciesId: s.id,
                          morph: draft.speciesId === s.id ? draft.morph : null,
                          lifeStageCode: null,
                        })
                      }
                    />
                  ))}
              </div>
            )}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div>
              <h2 className="text-[20px] font-bold">모프를 골라 주세요</h2>
              <p className="mt-1.5 text-[13px] text-[#888]">
                {species?.commonName} · 모르면 오른쪽 위 &lsquo;건너뛰기&rsquo;
              </p>
            </div>
            <MorphPicker
              species={species}
              value={draft.morph}
              onChange={(morph) => patch({ morph })}
            />
          </>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <PetPhotoPicker
              value={draft.photo}
              onChange={(photo) => patch({ photo })}
              onBusyChange={setUploading}
            />
            <Field label="이름" htmlFor="pet-name" error={nameError}>
              <Input
                id="pet-name"
                maxLength={20}
                placeholder="이름을 입력해 주세요"
                value={draft.name}
                aria-invalid={Boolean(nameError) || undefined}
                onChange={(e) => {
                  setNameError(null);
                  patch({ name: e.target.value });
                }}
              />
            </Field>
            <HatchFields
              species={species}
              hatchedOn={draft.hatchedOn}
              hatchUnknown={draft.hatchUnknown}
              lifeStageCode={draft.lifeStageCode}
              stageUncertain={draft.stageUncertain}
              onChange={patch}
            />
            <div
              className={cn(
                "rounded-[12px] border",
                detailsOpen ? "border-primary" : "border-input",
              )}
            >
              <button
                type="button"
                aria-expanded={detailsOpen}
                onClick={() => setDetailsOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3.5 py-3 text-left"
              >
                <span>
                  <span className="block text-[14.5px]">더 자세한 정보 (선택)</span>
                  {!detailsOpen ? (
                    <span className="block text-[12px] text-[#888]">성별 · 데려온 날</span>
                  ) : null}
                </span>
                {detailsOpen ? (
                  <ChevronUp className="size-4 text-primary" />
                ) : (
                  <ChevronDown className="size-4 text-[#888]" />
                )}
              </button>
              {detailsOpen ? (
                <div className="space-y-4 px-3.5 pb-4">
                  <Field label="성별">
                    <ChipGroup
                      label="성별"
                      size="sm"
                      options={sexSchema.options.map((value) => ({
                        value,
                        label: SEX_LABEL[value],
                      }))}
                      value={draft.sex}
                      onChange={(sex) => patch({ sex: sex ?? "unknown" })}
                    />
                  </Field>
                  <Field label="데려온 날" htmlFor="pet-acquired">
                    <DateField
                      id="pet-acquired"
                      title="데려온 날"
                      value={draft.acquiredOn}
                      max={todayYmd()}
                      onChange={(acquiredOn) => patch({ acquiredOn })}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </ScreenBody>

      <ScreenFooter>
        {step < 4 ? (
          <Button size="xl" disabled={!canNext} onClick={() => setStep(step + 1)}>
            다음
          </Button>
        ) : (
          <Button size="xl" disabled={!canSubmit} onClick={() => create.mutate()}>
            {create.isPending || uploading ? (
              <LoaderCircle className="size-5 animate-spin" aria-label="저장 중" />
            ) : (
              "등록하고 체크 리스트 보기"
            )}
          </Button>
        )}
        {onboarding && step === 1 ? (
          <button
            type="button"
            onClick={() => router.replace("/home")}
            className="py-1 text-[13px] text-[#555]"
          >
            나중에 할게요
          </button>
        ) : null}
      </ScreenFooter>

      <ConfirmDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title="작성 중인 내용이 있어요"
        description="나가면 입력한 내용이 사라져요."
        cancelLabel="계속 작성"
        confirmLabel="나가기"
        tone="inverse"
        onConfirm={exit}
      />
    </Screen>
  );
}

function ChoiceCard({
  title,
  description,
  selected,
  disabled,
  onClick,
}: {
  title: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-[14px] border-[1.3px] p-3.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary-soft/60"
          : "border-[#ddd] bg-background hover:bg-[#fafafa]",
        disabled && "cursor-not-allowed opacity-50 hover:bg-background",
      )}
    >
      <PhotoBox className="size-[60px]" />
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[16px] font-bold">
          {title}
          {selected ? <span className="text-primary">✓</span> : null}
        </span>
        {description ? <span className="block text-[12px] text-[#888]">{description}</span> : null}
      </span>
    </button>
  );
}
