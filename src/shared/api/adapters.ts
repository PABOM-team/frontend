import { format, parseISO } from "date-fns";
import {
  CARE_ITEM_CODE,
  END_REASON_CODE,
  invert,
  OUTCOME_CODE,
  SEX_CODE,
  type BackendMorph,
  type BackendPet,
  type BackendPetCreate,
  type BackendPetUpdate,
  type BackendRecord,
  type BackendRecordCreate,
  type BackendRecordListItem,
  type BackendRecordUpdate,
  type BackendRevision,
  type BackendSpecies,
  type Certainty,
} from "@/shared/domain/backend";
import { INTAKE_LABEL, type CareItem } from "@/shared/domain/care";
import type { Pet, PetCreateInput, PetUpdateInput } from "@/shared/domain/pet";
import type {
  CareRecord,
  RecordCreateInput,
  RecordQuery,
  RecordUpdateInput,
} from "@/shared/domain/record";
import { lifeStageFromHatch, SPECIES, type Species, type SpeciesId } from "@/shared/domain/species";
import { SPECIES_PROFILE, type SpeciesProfile } from "@/shared/domain/species-catalog";

/**
 * 백엔드 모양(숫자 ID·대문자 코드) ↔ 화면 도메인 모양(문자열 ID·소문자 값).
 * 화면은 도메인 모양만 알고, 백엔드가 바뀌면 이 파일과 src/shared/domain/backend.ts만 고친다.
 */

const CARE_ITEM_OF = invert(CARE_ITEM_CODE);
const INTAKE_OF = invert(OUTCOME_CODE);
const SEX_OF = invert(SEX_CODE);
const END_REASON_OF = invert(END_REASON_CODE);

const toIso = (value: string) => new Date(value).toISOString();
const toId = (value: number | null) => (value === null ? null : String(value));
const toNumber = (value: string | null | undefined) =>
  value === null || value === undefined ? null : Number(value);

export function newRequestId() {
  return crypto.randomUUID();
}

// ── 종 ────────────────────────────────────────────────────

/** 백엔드 종 목록과 프론트 전용 정보를 합친 것. 숫자 ID ↔ 종 ID 대응도 여기서 */
export type SpeciesIndex = {
  list: Species[];
  backendId: Record<SpeciesId, number>;
  speciesOf: (backendId: number) => SpeciesId;
  morphs: Record<SpeciesId, BackendMorph[]>;
};

/** 백엔드 종 코드 → MVP 종. 볼파이톤처럼 MVP 밖 종은 undefined */
export function speciesIdOfCode(code: string): SpeciesId | undefined {
  return SPECIES.find((id) => SPECIES_PROFILE[id].code === code);
}

export function toSpeciesIndex(
  supported: { id: SpeciesId; backend: BackendSpecies; morphs: BackendMorph[] }[],
): SpeciesIndex {
  const byBackendId = new Map(supported.map((s) => [s.backend.id, s.id]));
  return {
    list: supported.map(({ id, backend, morphs }) => {
      const { officialName, scientificName, aliases, lifeStages, defaultFoodName } =
        SPECIES_PROFILE[id];
      return {
        officialName,
        scientificName,
        aliases,
        lifeStages,
        defaultFoodName,
        id,
        group: backend.category === "SNAKE" ? "snake" : "lizard",
        commonName: backend.commonName,
        morphs: morphs.map((m) => m.name),
      };
    }),
    backendId: Object.fromEntries(supported.map((s) => [s.id, s.backend.id])) as Record<
      SpeciesId,
      number
    >,
    speciesOf: (backendId) => {
      const id = byBackendId.get(backendId);
      if (!id) throw new Error(`지원하지 않는 종이에요 (speciesId ${backendId})`);
      return id;
    },
    morphs: Object.fromEntries(supported.map((s) => [s.id, s.morphs])) as Record<
      SpeciesId,
      BackendMorph[]
    >,
  };
}

// ── 개체 ──────────────────────────────────────────────────

function stageCodeOfId(profile: SpeciesProfile, lifeStageId: number) {
  return Object.entries(profile.lifeStageIds).find(([, id]) => id === lifeStageId)?.[0] ?? null;
}

export function toPet(raw: BackendPet, index: SpeciesIndex, photoUrl: string | null): Pet {
  const speciesId = index.speciesOf(raw.speciesId);
  const profile = SPECIES_PROFILE[speciesId];
  const stageCode =
    lifeStageFromHatch(profile, raw.hatchedAt)?.code ??
    (raw.lifeStageId === null ? null : stageCodeOfId(profile, raw.lifeStageId)) ??
    profile.lifeStages[0]!.code;
  return {
    id: String(raw.id),
    name: raw.name,
    speciesId,
    morph: [...raw.morphs.map((m) => m.name), raw.customMorph].filter(Boolean).join(", ") || null,
    sex: SEX_OF[raw.sex],
    hatchedOn: raw.hatchedAt,
    lifeStageCode: stageCode,
    lifeStageSource: raw.hatchedAt ? "hatch" : "manual",
    stageUncertain: !raw.hatchedAt && raw.stageCertainty === "ESTIMATED",
    acquiredOn: raw.adoptedAt,
    photoUrl,
    status: raw.status === "ENDED" ? "ended" : "active",
    endReason: raw.endReason ? END_REASON_OF[raw.endReason] : null,
    endedOn: raw.endedAt ?? null,
    createdAt: toIso(raw.createdAt),
    todayRemaining: raw.todayRemaining ?? 0,
    recordCount: raw.recordCount ?? 0,
    firstRecordOn: raw.firstRecordAt ?? null,
  };
}

/** 모프 이름이 백엔드 모프 목록에 있으면 ID로, 없으면 직접 입력(customMorph)으로 보낸다 */
function morphFields(morph: string | null, morphs: BackendMorph[]) {
  const name = morph?.trim();
  if (!name) return { morphIds: [], customMorph: null };
  const hit = morphs.find((m) => m.name === name);
  return hit ? { morphIds: [hit.id], customMorph: null } : { morphIds: [], customMorph: name };
}

/** 부화일을 알면 부화일로 단계를 정하고(확정), 모르면 고른 단계를 보낸다(불확실하면 추정) */
function stageFields(
  profile: SpeciesProfile,
  hatchedOn: string | null,
  lifeStageCode: string | null,
  stageUncertain: boolean,
): { lifeStageId: number | null; stageCertainty: Certainty } {
  const code = hatchedOn ? lifeStageFromHatch(profile, hatchedOn)?.code : lifeStageCode;
  if (!code) return { lifeStageId: null, stageCertainty: "UNKNOWN" };
  return {
    lifeStageId: profile.lifeStageIds[code] ?? null,
    stageCertainty: !hatchedOn && stageUncertain ? "ESTIMATED" : "CONFIRMED",
  };
}

const sexFields = (sex: Pet["sex"]) => ({
  sex: SEX_CODE[sex],
  sexCertainty: (sex === "unknown" ? "UNKNOWN" : "CONFIRMED") as Certainty,
});

export function toPetCreate(input: PetCreateInput, index: SpeciesIndex): BackendPetCreate {
  const profile = SPECIES_PROFILE[input.speciesId];
  return {
    clientRequestId: newRequestId(),
    speciesId: index.backendId[input.speciesId],
    name: input.name,
    ...morphFields(input.morph, index.morphs[input.speciesId]),
    hatchedAt: input.hatchedOn,
    adoptedAt: input.acquiredOn,
    ...stageFields(profile, input.hatchedOn, input.lifeStageCode, input.stageUncertain),
    ...sexFields(input.sex),
    photoFileId: toNumber(input.photoFileId),
  };
}

export function toPetUpdate(
  pet: Pet,
  input: PetUpdateInput,
  index: SpeciesIndex,
): BackendPetUpdate {
  const out: BackendPetUpdate = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.morph !== undefined)
    Object.assign(out, morphFields(input.morph, index.morphs[pet.speciesId]));
  if (input.sex !== undefined) Object.assign(out, sexFields(input.sex));
  if (input.acquiredOn !== undefined) out.adoptedAt = input.acquiredOn;
  if (input.photoFileId !== undefined) out.photoFileId = toNumber(input.photoFileId);
  if (input.hatchedOn !== undefined) out.hatchedAt = input.hatchedOn;
  if (
    input.hatchedOn !== undefined ||
    input.lifeStageCode !== undefined ||
    input.stageUncertain !== undefined
  ) {
    // 단계·정확성은 최종 조합으로 검증하므로 바뀌지 않은 값도 같이 보낸다
    Object.assign(
      out,
      stageFields(
        SPECIES_PROFILE[pet.speciesId],
        input.hatchedOn !== undefined ? input.hatchedOn : pet.hatchedOn,
        input.lifeStageCode !== undefined ? input.lifeStageCode : pet.lifeStageCode,
        input.stageUncertain ?? pet.stageUncertain,
      ),
    );
  }
  return out;
}

// ── 기록 ──────────────────────────────────────────────────

function careItemOf(code: string): CareItem {
  const item = CARE_ITEM_OF[code];
  if (!item) throw new Error(`알 수 없는 관리 항목 코드예요 (${code})`);
  return item;
}

const text = (value: unknown) => (typeof value === "string" && value ? value : null);

const FIELD_LABEL: Record<string, string> = {
  occurredAt: "시각",
  timePrecision: "시각",
  outcome: "먹은 정도",
  valueNum: "값",
  memo: "메모",
  photoFileId: "사진",
  detail: "상세",
};

const CHANGE_LABEL: Record<BackendRevision["changeType"], string> = {
  EDIT: "정정",
  RESULT_ADDED: "결과 추가",
  DELETE: "삭제",
  RESTORE: "복구",
};

function formatValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "없음";
  if (field === "occurredAt" && typeof value === "string")
    return format(parseISO(value), "M/d HH:mm");
  if (field === "outcome" && typeof value === "string" && value in INTAKE_OF) {
    return INTAKE_LABEL[INTAKE_OF[value as keyof typeof INTAKE_OF]];
  }
  if (field === "memo") return `${String(value).length}자`;
  if (field === "photoFileId") return "있음";
  return String(value);
}

/** 정정 이력 한 줄: '시각 10/20 20:05 → 10/19 20:05 · 메모 없음 → 12자' */
function toRevision(revision: BackendRevision) {
  const parts = revision.changedFields.map((field) => {
    const label = FIELD_LABEL[field] ?? field;
    const before = revision.before?.[field];
    const after = revision.after?.[field];
    if (before === undefined && after === undefined) return label;
    return `${label} ${formatValue(field, before)} → ${formatValue(field, after)}`;
  });
  return {
    at: toIso(revision.createdAt),
    summary: parts.join(" · ") || CHANGE_LABEL[revision.changeType],
  };
}

export function toCareRecord(raw: BackendRecord, revisions: BackendRevision[] = []): CareRecord {
  const careItem = careItemOf(raw.itemCode);
  return {
    id: String(raw.id),
    petId: String(raw.petId),
    petName: raw.petName,
    routineId: toId(raw.routineId),
    careItem,
    type: raw.recordType === "DONE" ? "done" : "skipped",
    method: raw.source === "MANUAL" ? "manual" : "routine",
    occurredAt: toIso(raw.occurredAt),
    createdAt: toIso(raw.createdAt),
    intake: raw.outcome ? INTAKE_OF[raw.outcome] : null,
    weightG: careItem === "weight" ? raw.valueNum : null,
    memo: raw.memo,
    foodName: text(raw.detail?.foodName),
    skipReason: text(raw.detail?.skipReason),
    photos: raw.photo ? [{ id: String(raw.photo.fileId), url: raw.photo.url }] : [],
    revisions: revisions.filter((r) => r.changeType === "EDIT").map(toRevision),
    revisionNo: raw.revisionNo,
  };
}

/** 목록 아이템은 요약형이라 사진 주소·정정 이력이 없다. 사진이 있으면 endpoints가 상세를 부른다 */
export function toCareRecordFromListItem(raw: BackendRecordListItem): CareRecord {
  const careItem = careItemOf(raw.itemCode);
  return {
    id: String(raw.id),
    petId: String(raw.petId),
    petName: raw.petName,
    routineId: null,
    careItem,
    type: raw.recordType === "DONE" ? "done" : "skipped",
    method: raw.source === "MANUAL" ? "manual" : "routine",
    occurredAt: toIso(raw.occurredAt),
    createdAt: toIso(raw.createdAt),
    intake: raw.outcome ? INTAKE_OF[raw.outcome] : null,
    weightG: careItem === "weight" ? raw.valueNum : null,
    memo: raw.memoPreview,
    foodName: null,
    skipReason: null,
    photos: [],
    revisions: [],
    revisionNo: null,
  };
}

export function toRecordSearch(query: RecordQuery) {
  return {
    petId: query.petId,
    itemCodes: query.careItem ? CARE_ITEM_CODE[query.careItem as CareItem] : undefined,
    from: query.from,
    to: query.to,
    cursor: query.cursor,
  };
}

export function toRecordCreate(input: RecordCreateInput): BackendRecordCreate {
  return {
    clientRequestId: newRequestId(),
    petId: Number(input.petId),
    itemCode: CARE_ITEM_CODE[input.careItem],
    occurredAt: input.occurredAt,
    timePrecision: "EXACT",
    outcome: input.intake ? OUTCOME_CODE[input.intake] : null,
    valueNum: input.weightG ?? null,
    memo: input.memo ?? null,
    // 백엔드는 기록당 사진 한 장
    photoFileId: toNumber(input.photoFileIds?.[0]),
  };
}

export function toRecordUpdate(revisionNo: number, input: RecordUpdateInput): BackendRecordUpdate {
  const out: BackendRecordUpdate = { revisionNo };
  if (input.occurredAt !== undefined) out.occurredAt = input.occurredAt;
  if (input.intake !== undefined) out.outcome = input.intake ? OUTCOME_CODE[input.intake] : null;
  if (input.weightG !== undefined) out.valueNum = input.weightG;
  if (input.memo !== undefined) out.memo = input.memo;
  if (input.photoFileIds !== undefined) out.photoFileId = toNumber(input.photoFileIds[0]);
  return out;
}
