import { addDays, parseISO } from "date-fns";
import { speciesIdOfCode } from "@/shared/api/adapters";
import {
  CARE_ITEM_CODE,
  END_REASON_CODE,
  invert,
  OUTCOME_CODE,
  SEX_CODE,
  type BackendOutcome,
  type BackendPet,
  type BackendPetCreate,
  type BackendRecord,
  type BackendRecordListItem,
  type BackendRevision,
  type BackendSex,
} from "@/shared/domain/backend";
import { CARE_ITEM_LABEL, INTAKE_LABEL } from "@/shared/domain/care";
import type { SpeciesId } from "@/shared/domain/species";
import { SPECIES_PROFILE } from "@/shared/domain/species-catalog";
import { BACKEND_MORPHS, BACKEND_SPECIES, backendSpeciesOf } from "./data";
import { db, type DbPet, type DbRecord } from "./db";
import { fileUrlOf, revisionNoOf, serializePet, stageCodeOf } from "./logic";

/**
 * 목업 DB ↔ 백엔드 모양 (스웨거와 같은 응답·요청).
 * 화면용 모양으로 바꾸는 건 프론트 어댑터(src/shared/api/adapters.ts)가 한다.
 */

export const CARE_ITEM_OF = invert(CARE_ITEM_CODE);
export const INTAKE_OF = invert(OUTCOME_CODE);
const SEX_OF = invert(SEX_CODE);

const SOURCE = { manual: "MANUAL", routine: "ROUTINE" } as const;

/** 백엔드 숫자 종 ID → 목업 종 */
export function speciesIdOf(backendId: number): SpeciesId | undefined {
  const code = BACKEND_SPECIES.find((s) => s.id === backendId)?.code;
  return code ? speciesIdOfCode(code) : undefined;
}

function morphsOf(pet: DbPet) {
  const list = BACKEND_MORPHS[backendSpeciesOf(pet.speciesId).id] ?? [];
  const hit = list.find((m) => m.name === pet.morph);
  return { morphs: hit ? [hit] : [], customMorph: hit ? null : pet.morph };
}

export function wirePet(pet: DbPet): BackendPet {
  const profile = SPECIES_PROFILE[pet.speciesId];
  // 화면에 필요한 요약(오늘 할 일 수·기록 수)은 기존 계산을 그대로 쓴다
  const summary = serializePet(pet);
  return {
    id: Number(pet.id),
    speciesId: backendSpeciesOf(pet.speciesId).id,
    name: pet.name,
    ...morphsOf(pet),
    hatchedAt: pet.hatchedOn,
    adoptedAt: pet.acquiredOn,
    lifeStageId: profile.lifeStageIds[stageCodeOf(pet)] ?? null,
    stageCertainty: pet.hatchedOn ? "CONFIRMED" : pet.stageUncertain ? "ESTIMATED" : "CONFIRMED",
    sex: SEX_CODE[pet.sex],
    sexCertainty: pet.sex === "unknown" ? "UNKNOWN" : "CONFIRMED",
    photoFileId: pet.photoFileId ? Number(pet.photoFileId) : null,
    createdAt: pet.createdAt,
    updatedAt: pet.createdAt,
    status: pet.status === "ended" ? "ENDED" : "ACTIVE",
    endReason: pet.endReason ? END_REASON_CODE[pet.endReason] : null,
    endedAt: pet.endedOn,
    todayRemaining: summary.todayRemaining,
    recordCount: summary.recordCount,
    firstRecordAt: summary.firstRecordOn,
  };
}

export function wirePetListItem(pet: DbPet) {
  const species = backendSpeciesOf(pet.speciesId);
  const stageCode = stageCodeOf(pet);
  const { morphs, customMorph } = morphsOf(pet);
  return {
    id: Number(pet.id),
    name: pet.name,
    speciesId: species.id,
    speciesName: species.commonName,
    morphs,
    customMorph,
    lifeStageId: SPECIES_PROFILE[pet.speciesId].lifeStageIds[stageCode] ?? null,
    lifeStageName:
      SPECIES_PROFILE[pet.speciesId].lifeStages.find((s) => s.code === stageCode)?.name ?? null,
    photoFileId: pet.photoFileId ? Number(pet.photoFileId) : null,
  };
}

/** 개체 등록·수정 본문 → 목업 DB 칸. 모르는 값이면 오류 메시지 */
export function petFieldsOf(
  speciesId: SpeciesId,
  input: Partial<BackendPetCreate>,
  current?: DbPet,
): Partial<DbPet> | string {
  const out: Partial<DbPet> = {};
  if (input.name !== undefined) out.name = input.name.trim();
  if (input.morphIds !== undefined || input.customMorph !== undefined) {
    const list = BACKEND_MORPHS[backendSpeciesOf(speciesId).id] ?? [];
    const names = (input.morphIds ?? []).map((id) => list.find((m) => m.id === id)?.name);
    if (names.some((n) => n === undefined)) return "MORPH_NOT_FOUND";
    out.morph = [...names, input.customMorph].filter(Boolean).join(", ") || null;
  }
  if (input.sex !== undefined) out.sex = SEX_OF[input.sex as BackendSex];
  if (input.adoptedAt !== undefined) out.acquiredOn = input.adoptedAt;
  if (input.photoFileId !== undefined) {
    out.photoFileId = input.photoFileId === null ? null : String(input.photoFileId);
  }
  if (input.hatchedAt !== undefined) out.hatchedOn = input.hatchedAt;

  const certainty = input.stageCertainty;
  if (certainty !== undefined || input.lifeStageId !== undefined) {
    if (certainty !== "UNKNOWN" && input.lifeStageId === null) return "STAGE_REQUIRED";
    const hatchedOn = out.hatchedOn !== undefined ? out.hatchedOn : (current?.hatchedOn ?? null);
    const code = Object.entries(SPECIES_PROFILE[speciesId].lifeStageIds).find(
      ([, id]) => id === input.lifeStageId,
    )?.[0];
    out.manualStageCode = hatchedOn ? null : (code ?? null);
    out.stageUncertain = !hatchedOn && certainty === "ESTIMATED";
  }
  return out;
}

// ── 기록 ──────────────────────────────────────────────────

const toOutcome = (record: DbRecord): BackendOutcome | null =>
  record.intake ? OUTCOME_CODE[record.intake] : null;

export function wireRecord(record: DbRecord): BackendRecord {
  const pet = db.pets.find((p) => p.id === record.petId);
  const photoId = record.photoIds[0];
  const photoUrl = photoId ? fileUrlOf(photoId) : null;
  return {
    id: Number(record.id),
    petId: Number(record.petId),
    petName: pet?.name ?? "",
    routineId: null,
    itemCode: CARE_ITEM_CODE[record.careItem],
    itemName: CARE_ITEM_LABEL[record.careItem],
    recordType: record.type === "done" ? "DONE" : "SKIPPED",
    source: SOURCE[record.method],
    occurredAt: record.occurredAt,
    timePrecision: "EXACT",
    createdAt: record.createdAt,
    updatedAt: record.revisions.at(-1)?.at ?? record.createdAt,
    outcome: toOutcome(record),
    valueNum: record.weightG,
    unit: record.weightG === null ? null : "g",
    detail:
      record.foodName || record.skipReason
        ? { foodName: record.foodName, skipReason: record.skipReason }
        : null,
    memo: record.memo,
    photo: photoId && photoUrl ? { fileId: Number(photoId), url: photoUrl } : null,
    revisionNo: revisionNoOf(record),
    deletedAt: record.deletedAt,
  };
}

export function wireRevisions(record: DbRecord): BackendRevision[] {
  return record.revisions.map((r, i) => ({
    id: i + 1,
    changeType: "EDIT",
    changedFields: r.changedFields,
    before: r.before,
    after: r.after,
    createdAt: r.at,
  }));
}

export function wireRecordListItem(
  record: DbRecord,
): BackendRecordListItem & Record<string, unknown> {
  const pet = db.pets.find((p) => p.id === record.petId);
  return {
    id: Number(record.id),
    petId: Number(record.petId),
    petName: pet?.name ?? "",
    itemCode: CARE_ITEM_CODE[record.careItem],
    itemName: CARE_ITEM_LABEL[record.careItem],
    recordType: record.type === "done" ? "DONE" : "SKIPPED",
    occurredAt: record.occurredAt,
    timePrecision: "EXACT",
    createdAt: record.createdAt,
    outcome: toOutcome(record),
    needsResult: record.careItem === "feeding" && !record.intake,
    valueNum: record.weightG,
    unit: record.weightG === null ? null : "g",
    detailSummary: record.intake ? INTAKE_LABEL[record.intake] : "",
    memoPreview: record.memo,
    hasPhoto: record.photoIds.length > 0,
    isEdited: record.revisions.length > 0,
    source: SOURCE[record.method],
    deletedAt: record.deletedAt,
  };
}

/** 기록 정정에서 비교하는 칸 (백엔드 칸 이름) */
export function recordFields(record: DbRecord): Record<string, unknown> {
  return {
    occurredAt: record.occurredAt,
    outcome: toOutcome(record),
    valueNum: record.weightG,
    memo: record.memo,
    photoFileId: record.photoIds[0] ? Number(record.photoIds[0]) : null,
  };
}

export const restorableUntil = (deletedAt: string) =>
  addDays(parseISO(deletedAt), 30).toISOString();
