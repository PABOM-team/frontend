import { z } from "zod";
import type { CareItem, Intake } from "./care";
import type { EndReason, Sex } from "./pet";

/**
 * 백엔드 응답·요청 모양 (스웨거 dev.api.pabom.app/v3/api-docs).
 * 화면은 이 모양을 직접 쓰지 않고, src/shared/api/adapters.ts가 화면용 도메인 모델로 바꾼다.
 * 백엔드는 숫자 ID와 대문자 코드를 쓰고, 프론트 도메인은 문자열 ID와 소문자 값을 쓴다.
 */

const id = z.number().int();
/** 백엔드 시각은 +09:00처럼 오프셋이 붙어 온다 */
const dateTime = z.iso.datetime({ offset: true, local: true });
const json = z.record(z.string(), z.unknown());

// ── 코드 대응표 ───────────────────────────────────────────

/**
 * 관리 항목 코드. FEEDING·WEIGHT·SHED는 스웨거 예시로 확인했다.
 * MISTING·CLEANING·MEMO는 [백엔드 확인 필요] 스웨거에 전체 목록이 없다
 */
export const CARE_ITEM_CODE: Record<CareItem, string> = {
  feeding: "FEEDING",
  misting: "MISTING",
  weight: "WEIGHT",
  cleaning: "CLEANING",
  shed: "SHED",
  memo: "MEMO",
};

export const backendOutcomeSchema = z.enum(["ATE_ALL", "ATE_PART", "REFUSED", "NOT_OBSERVED"]);
export type BackendOutcome = z.infer<typeof backendOutcomeSchema>;
export const OUTCOME_CODE: Record<Intake, BackendOutcome> = {
  all: "ATE_ALL",
  partial: "ATE_PART",
  none: "REFUSED",
  unobserved: "NOT_OBSERVED",
};

export const backendSexSchema = z.enum(["MALE", "FEMALE", "UNKNOWN"]);
export type BackendSex = z.infer<typeof backendSexSchema>;
export const SEX_CODE: Record<Sex, BackendSex> = {
  male: "MALE",
  female: "FEMALE",
  unknown: "UNKNOWN",
};

export const certaintySchema = z.enum(["CONFIRMED", "ESTIMATED", "UNKNOWN"]);
export type Certainty = z.infer<typeof certaintySchema>;

export const backendEndReasonSchema = z.enum(["REHOMED", "DECEASED", "OTHER"]);
export const END_REASON_CODE: Record<EndReason, z.infer<typeof backendEndReasonSchema>> = {
  rehomed: "REHOMED",
  deceased: "DECEASED",
  other: "OTHER",
};

export const FILE_PURPOSE = { pet: "PET_PHOTO", record: "RECORD_PHOTO" } as const;
export type FilePurpose = keyof typeof FILE_PURPOSE;

/** {a: "A"} → {A: "a"} */
export function invert<K extends string, V extends string>(table: Record<K, V>) {
  return Object.fromEntries(Object.entries(table).map(([k, v]) => [v, k])) as Record<V, K>;
}

// ── 종 ────────────────────────────────────────────────────

export const backendSpeciesSchema = z.object({
  id,
  code: z.string(),
  commonName: z.string(),
  category: z.enum(["LIZARD", "SNAKE"]),
  displayOrder: z.number().int(),
});
export type BackendSpecies = z.infer<typeof backendSpeciesSchema>;

export const backendMorphSchema = z.object({ id, code: z.string(), name: z.string() });
export type BackendMorph = z.infer<typeof backendMorphSchema>;

// ── 개체 ──────────────────────────────────────────────────

export const backendPetSchema = z.object({
  id,
  speciesId: id,
  name: z.string(),
  morphs: z.array(backendMorphSchema),
  customMorph: z.string().nullable(),
  hatchedAt: z.iso.date().nullable(),
  adoptedAt: z.iso.date().nullable(),
  lifeStageId: id.nullable(),
  stageCertainty: certaintySchema,
  sex: backendSexSchema,
  sexCertainty: certaintySchema,
  photoFileId: id.nullable(),
  createdAt: dateTime,
  updatedAt: dateTime,
  // 화면에 필요해서 백엔드에 요청한 값. 아직 안 오면 기본값으로 보여 준다 (목업은 보낸다)
  status: z.enum(["ACTIVE", "ENDED"]).optional(),
  endReason: backendEndReasonSchema.nullable().optional(),
  endedAt: z.iso.date().nullable().optional(),
  todayRemaining: z.number().int().min(0).optional(),
  recordCount: z.number().int().min(0).optional(),
  firstRecordAt: z.iso.date().nullable().optional(),
});
export type BackendPet = z.infer<typeof backendPetSchema>;

export const backendPetListItemSchema = z.object({
  id,
  name: z.string(),
  speciesId: id,
  lifeStageId: id.nullable(),
  photoFileId: id.nullable(),
});

/** POST /pets */
export type BackendPetCreate = {
  clientRequestId: string;
  speciesId: number;
  name: string;
  morphIds: number[];
  customMorph: string | null;
  hatchedAt: string | null;
  adoptedAt: string | null;
  lifeStageId: number | null;
  stageCertainty: Certainty;
  sex: BackendSex;
  sexCertainty: Certainty;
  photoFileId: number | null;
};

/** PATCH /pets/{id}. 생략한 칸은 그대로, 명시적 null은 지운다 */
export type BackendPetUpdate = Partial<Omit<BackendPetCreate, "clientRequestId" | "speciesId">>;

// ── 기록 ──────────────────────────────────────────────────

export const backendRecordTypeSchema = z.enum(["DONE", "SKIPPED"]);
export const timePrecisionSchema = z.enum(["EXACT", "DATE_ONLY"]);

export const backendRecordSchema = z.object({
  id,
  petId: id,
  petName: z.string(),
  routineId: id.nullable(),
  itemCode: z.string(),
  itemName: z.string(),
  recordType: backendRecordTypeSchema,
  /** 지금은 MANUAL만 온다. 일정 API가 생기면 늘어난다 */
  source: z.string(),
  occurredAt: dateTime,
  timePrecision: timePrecisionSchema,
  createdAt: dateTime,
  updatedAt: dateTime,
  outcome: backendOutcomeSchema.nullable(),
  valueNum: z.number().nullable(),
  unit: z.string().nullable(),
  detail: json.nullable().optional(),
  memo: z.string().nullable(),
  photo: z.object({ fileId: id, url: z.string() }).nullable(),
  revisionNo: z.number().int(),
  deletedAt: dateTime.nullable(),
});
export type BackendRecord = z.infer<typeof backendRecordSchema>;

export const backendRevisionSchema = z.object({
  id,
  changeType: z.enum(["EDIT", "RESULT_ADDED", "DELETE", "RESTORE"]),
  changedFields: z.array(z.string()),
  before: json.nullable(),
  after: json.nullable(),
  createdAt: dateTime,
});
export type BackendRevision = z.infer<typeof backendRevisionSchema>;

export const backendRecordDetailSchema = z.object({
  record: backendRecordSchema,
  revisions: z.array(backendRevisionSchema),
});

export const backendRecordMutationSchema = z.object({ record: backendRecordSchema });

export const backendRecordListItemSchema = z.object({
  id,
  petId: id,
  petName: z.string(),
  itemCode: z.string(),
  recordType: backendRecordTypeSchema,
  occurredAt: dateTime,
  createdAt: dateTime,
  outcome: backendOutcomeSchema.nullable(),
  valueNum: z.number().nullable(),
  memoPreview: z.string().nullable(),
  hasPhoto: z.boolean(),
  source: z.string(),
});
export type BackendRecordListItem = z.infer<typeof backendRecordListItemSchema>;

export const backendRecordListSchema = z.object({
  items: z.array(backendRecordListItemSchema),
  nextCursor: z.string().nullable(),
});

/** POST /records */
export type BackendRecordCreate = {
  clientRequestId: string;
  petId: number;
  itemCode: string;
  occurredAt: string;
  timePrecision: "EXACT" | "DATE_ONLY";
  outcome: BackendOutcome | null;
  valueNum: number | null;
  memo: string | null;
  photoFileId: number | null;
};

/** PATCH /records/{id}. revisionNo로 낙관적 잠금 */
export type BackendRecordUpdate = { revisionNo: number } & Partial<
  Pick<BackendRecordCreate, "occurredAt" | "outcome" | "valueNum" | "memo" | "photoFileId">
>;

// ── 파일 ──────────────────────────────────────────────────

export const backendFileSchema = z.object({ id, url: z.string() });
export const backendFileUrlSchema = z.object({ url: z.string(), expiresAt: dateTime });
