"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { speciesQueries } from "@/entities/species";
import { petsApi } from "@/shared/api/endpoints";
import { getErrorMessage, getFieldErrors } from "@/shared/api/errors";
import { invalidateCareData } from "@/shared/api/query-keys";
import { isPetsOnlyLive } from "@/shared/config/env";
import {
  morphFields,
  serverFileId,
  SEX_LABEL,
  sexFields,
  sexSchema,
  stageFields,
  type Pet,
  type PetUpdateInput,
  type Sex,
} from "@/shared/domain/pet";
import { todayYmd } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { DateField } from "@/shared/ui/calendar";
import { ChipGroup } from "@/shared/ui/chip";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Field, FieldButton, Input } from "@/shared/ui/form";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { toast } from "@/shared/ui/toast";
import { TopBar, TopBarAction } from "@/shared/ui/top-bar";
import { HatchFields, MorphPicker, PetPhotoPicker, type PhotoValue } from "./fields";

type Draft = {
  name: string;
  morph: string | null;
  photo: PhotoValue;
  hatchedOn: string | null;
  hatchUnknown: boolean;
  lifeStageCode: string | null;
  stageUncertain: boolean;
  sex: Sex;
  acquiredOn: string | null;
};

const fromPet = (pet: Pet): Draft => ({
  name: pet.name,
  morph: pet.morph,
  photo: { fileId: null, url: pet.photoUrl },
  hatchedOn: pet.hatchedOn,
  hatchUnknown: !pet.hatchedOn,
  lifeStageCode: pet.lifeStageSource === "manual" ? pet.lifeStageCode : null,
  stageUncertain: pet.stageUncertain,
  sex: pet.sex,
  acquiredOn: pet.acquiredOn,
});

/**
 * SCR-P05 개체 정보 수정. 저장은 바뀐 내용이 있을 때만 켜진다.
 * 종은 고칠 수 없어서(틀렸으면 삭제 뒤 다시 등록 [제안]) 보여 주지 않는다.
 */
export function EditPetForm({ pet, onDelete }: { pet: Pet; onDelete: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: speciesList } = useQuery(speciesQueries.list());
  const species = speciesList?.find((s) => s.id === pet.speciesId);
  const { data: morphs } = useQuery(speciesQueries.morphs(species?.serverId));
  const [draft, setDraft] = useState<Draft>(() => fromPet(pet));
  const [morphOpen, setMorphOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const original = fromPet(pet);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const valid =
    draft.name.trim().length > 0 &&
    (draft.hatchUnknown ? Boolean(draft.lifeStageCode) : Boolean(draft.hatchedOn));
  const back = () => router.replace(`/pets/${pet.id}`);

  const save = useMutation({
    mutationFn: () => {
      // 바뀐 칸만 보낸다 (PATCH는 보내지 않은 칸을 그대로 둔다)
      let input: PetUpdateInput = {};
      if (draft.name !== original.name) input.name = draft.name.trim();
      if (draft.morph !== original.morph) {
        input = { ...input, ...morphFields(draft.morph, morphs ?? []) };
      }
      if (draft.sex !== original.sex) input = { ...input, ...sexFields(draft.sex) };
      if (draft.acquiredOn !== original.acquiredOn) input.adoptedAt = draft.acquiredOn;
      if (draft.photo.fileId) input.photoFileId = serverFileId(draft.photo.fileId);
      // 부화일·단계·정확성은 백엔드가 함께 검증하니 하나라도 바뀌면 같이 보낸다
      const stageChanged =
        draft.hatchUnknown !== original.hatchUnknown ||
        draft.hatchedOn !== original.hatchedOn ||
        draft.lifeStageCode !== original.lifeStageCode ||
        draft.stageUncertain !== original.stageUncertain;
      if (stageChanged && species) input = { ...input, ...stageFields(species, draft) };
      return petsApi.update(pet.id, input);
    },
    onSuccess: async (updated) => {
      await invalidateCareData(queryClient);
      router.replace(`/pets/${pet.id}`);
      // 생애 단계가 바뀌었을 때만 C3-3 토스트. 개체만 진짜로 보낼 때는 체크 리스트가 없어 띄우지 않는다
      if (!isPetsOnlyLive && updated.lifeStageCode !== pet.lifeStageCode) {
        toast("체크 리스트를 다시 제안했어요", {
          action: { label: "확인하기", onClick: () => router.push(`/pets/${pet.id}/routines`) },
        });
      }
    },
    onError: (error) => {
      const fields = getFieldErrors(error);
      if (fields.name) setNameError(fields.name);
      toast(getErrorMessage(error, "저장하지 못했어요."));
    },
  });

  return (
    <Screen>
      <TopBar
        leading="close"
        title="개체 정보 수정"
        onLeading={() => (dirty ? setExitOpen(true) : back())}
        trailing={
          <TopBarAction
            disabled={!dirty || !valid || uploading || save.isPending}
            onClick={() => save.mutate()}
          >
            저장
          </TopBarAction>
        }
      />
      <ScreenBody className="space-y-5">
        {/* 개체만 진짜로 보낼 때는 사진 업로드가 목업이라 백엔드가 그 파일 ID를 모른다 */}
        {!isPetsOnlyLive ? (
          <PetPhotoPicker
            variant="edit"
            value={draft.photo}
            onChange={(photo) => patch({ photo })}
            onBusyChange={setUploading}
          />
        ) : null}
        <Field label="이름" htmlFor="edit-name" error={nameError}>
          <Input
            id="edit-name"
            maxLength={20}
            value={draft.name}
            aria-invalid={Boolean(nameError) || undefined}
            onChange={(e) => {
              setNameError(null);
              patch({ name: e.target.value });
            }}
          />
        </Field>
        <Field label="모프">
          <FieldButton
            placeholder="모프를 골라 주세요"
            icon={<ChevronDown className="size-4" />}
            onClick={() => setMorphOpen(true)}
          >
            {draft.morph}
          </FieldButton>
        </Field>
        <HatchFields
          species={species}
          hatchedOn={draft.hatchedOn}
          hatchUnknown={draft.hatchUnknown}
          lifeStageCode={draft.lifeStageCode}
          stageUncertain={draft.stageUncertain}
          variant="edit"
          onChange={patch}
        />
        <Field label="성별">
          <ChipGroup
            label="성별"
            size="sm"
            options={sexSchema.options.map((value) => ({ value, label: SEX_LABEL[value] }))}
            value={draft.sex}
            onChange={(sex) => patch({ sex: sex ?? "unknown" })}
          />
        </Field>
        <Field label="데려온 날 (선택)" htmlFor="edit-acquired">
          <DateField
            id="edit-acquired"
            title="데려온 날"
            value={draft.acquiredOn}
            max={todayYmd()}
            onChange={(acquiredOn) => patch({ acquiredOn })}
          />
        </Field>
        <Button variant="outline" size="xl" onClick={onDelete}>
          개체 삭제
        </Button>
      </ScreenBody>

      <Sheet
        open={morphOpen}
        onOpenChange={setMorphOpen}
        title="모프 바꾸기"
        description={species?.commonName}
        footer={
          <Button size="xl" onClick={() => setMorphOpen(false)}>
            고르기
          </Button>
        }
      >
        <MorphPicker species={species} value={draft.morph} onChange={(morph) => patch({ morph })} />
      </Sheet>
      <ConfirmDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title="작성 중인 내용이 있어요"
        description="나가면 입력한 내용이 사라져요."
        cancelLabel="계속 작성"
        confirmLabel="나가기"
        tone="inverse"
        onConfirm={back}
      />
    </Screen>
  );
}
