import { z } from "zod";
import {
  lifeStageFromHatch,
  LIFE_STAGES,
  morphSchema,
  speciesIdSchema,
  type Species,
} from "./species";

export { SPECIES, SPECIES_LABEL, speciesIdSchema, type SpeciesId } from "./species";

export const sexSchema = z.enum(["male", "female", "unknown"]);
export type Sex = z.infer<typeof sexSchema>;
export const SEX_LABEL: Record<Sex, string> = { male: "수컷", female: "암컷", unknown: "모름" };
export const SEX_SYMBOL: Record<Sex, string> = { male: "♂", female: "♀", unknown: "" };

export const petStatusSchema = z.enum(["active", "ended"]);
export type PetStatus = z.infer<typeof petStatusSchema>;

/** 함께했던 개체로 바꾸는 이유 (SCR-P06) */
export const endReasonSchema = z.enum(["rehomed", "deceased", "other"]);
export type EndReason = z.infer<typeof endReasonSchema>;
export const END_REASON_LABEL: Record<EndReason, string> = {
  rehomed: "분양 보냄",
  deceased: "무지개다리",
  other: "기타",
};

export const petSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(20),
  speciesId: speciesIdSchema,
  morph: z.string().max(40).nullable(),
  sex: sexSchema,
  hatchedOn: z.iso.date().nullable(),
  lifeStageCode: z.string(),
  /** hatch: 부화일로 자동 계산, manual: 부화일을 몰라 직접 고름 */
  lifeStageSource: z.enum(["hatch", "manual"]),
  /** 부화일을 몰라 고른 단계가 정확하지 않음 (해츨링·준성체만, U5) */
  stageUncertain: z.boolean(),
  acquiredOn: z.iso.date().nullable(),
  photoUrl: z.string().nullable(),
  status: petStatusSchema,
  endReason: endReasonSchema.nullable(),
  endedOn: z.iso.date().nullable(),
  createdAt: z.iso.datetime(),
  /** 오늘 남은 할 일 수 */
  todayRemaining: z.number().int().min(0),
  recordCount: z.number().int().min(0),
  firstRecordOn: z.iso.date().nullable(),
});
export type Pet = z.infer<typeof petSchema>;

export const petFormSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력해 주세요").max(20, "20자까지 쓸 수 있어요"),
    speciesId: speciesIdSchema,
    morph: z.string().trim().max(40).nullable(),
    sex: sexSchema,
    hatchedOn: z.iso.date().nullable(),
    hatchUnknown: z.boolean(),
    /** 부화일을 모를 때만 직접 고른 단계 */
    lifeStageCode: z.string().nullable(),
    acquiredOn: z.iso.date().nullable(),
    photoFileId: z.string().nullable(),
  })
  .refine((v) => v.hatchUnknown || v.hatchedOn, {
    path: ["hatchedOn"],
    message: "부화일을 고르거나 '부화일을 몰라요'를 체크해 주세요",
  })
  .refine((v) => !v.hatchUnknown || v.lifeStageCode, {
    path: ["lifeStageCode"],
    message: "생애 단계를 골라 주세요",
  });
export type PetFormValues = z.infer<typeof petFormSchema>;

const certaintySchema = z.enum(["CONFIRMED", "ESTIMATED", "UNKNOWN"]);
export type Certainty = z.infer<typeof certaintySchema>;
const serverSexSchema = z.enum(["MALE", "FEMALE", "UNKNOWN"]);

/** POST /pets 본문 (API-21 개체 등록만 한다. 기본 관리 일정은 만들지 않는다) */
export type PetCreateInput = {
  /** 중복 등록 방지용. 같은 등록 화면에서 다시 보내면 같은 값을 쓴다 */
  clientRequestId: string;
  /** 백엔드 종 ID (Species.serverId) */
  speciesId: number;
  name: string;
  morphIds: number[];
  customMorph: string | null;
  hatchedAt: string | null;
  adoptedAt: string | null;
  /** stageCertainty가 UNKNOWN이면 null */
  lifeStageId: number | null;
  stageCertainty: Certainty;
  sex: z.infer<typeof serverSexSchema>;
  sexCertainty: Certainty;
  photoFileId: number | null;
};

export const toServerSex = (sex: Sex) => serverSexSchema.parse(sex.toUpperCase());

/** 생애 단계 code ↔ 백엔드 lifeStageId [가정] LIFE_STAGES 참고 */
export const lifeStageIdOf = (code: string | null | undefined) =>
  LIFE_STAGES.find((s) => s.code === code)?.id ?? null;
const lifeStageCodeOf = (id: number | null) => LIFE_STAGES.find((s) => s.id === id)?.code ?? null;

/**
 * GET /pets/{id}, POST /pets 응답의 개체 (백엔드 PetResponse).
 * 지금은 온보딩 입력값만 온다. 상태·사진 주소·오늘 할 일 수·기록 수는 아직 없어 기본값으로 둔다
 * (목업은 채워 준다). TODO 체크리스트·기록 구현 후 백엔드 스펙에 맞춘다
 */
export const petResponseSchema = z.object({
  /** 백엔드는 숫자, 목업은 문자열 */
  id: z.union([z.number().int(), z.string()]).transform(String),
  speciesId: z.number().int(),
  name: z.string(),
  morphs: z.array(morphSchema).default([]),
  customMorph: z.string().nullish(),
  hatchedAt: z.iso.date().nullish(),
  adoptedAt: z.iso.date().nullish(),
  lifeStageId: z.number().int().nullish(),
  stageCertainty: certaintySchema.default("UNKNOWN"),
  sex: serverSexSchema.default("UNKNOWN"),
  photoFileId: z.union([z.number().int(), z.string()]).nullish(),
  createdAt: z.iso.datetime({ offset: true, local: true }),
  status: petStatusSchema.default("active"),
  endReason: endReasonSchema.nullish(),
  endedOn: z.iso.date().nullish(),
  photoUrl: z.string().nullish(),
  todayRemaining: z.number().int().min(0).default(0),
  recordCount: z.number().int().min(0).default(0),
  firstRecordOn: z.iso.date().nullish(),
});
export type PetResponse = z.infer<typeof petResponseSchema>;

/** 백엔드 개체를 앱 개체로. 종은 백엔드 종 ID로 찾는다 */
export function toPet(res: PetResponse, speciesList: Species[]): Pet {
  const species = speciesList.find((s) => s.serverId === res.speciesId);
  if (!species) throw new Error(`알 수 없는 종이에요 (speciesId ${res.speciesId})`);
  const hatchedOn = res.hatchedAt ?? null;
  const stageCode =
    lifeStageCodeOf(res.lifeStageId ?? null) ?? lifeStageFromHatch(species, hatchedOn)?.code;
  const morph = [...res.morphs.map((m) => m.name), res.customMorph].filter(Boolean).join(", ");
  return {
    id: res.id,
    name: res.name,
    speciesId: species.id,
    morph: morph || null,
    sex: res.sex.toLowerCase() as Sex,
    hatchedOn,
    lifeStageCode: stageCode ?? "",
    lifeStageSource: hatchedOn ? "hatch" : "manual",
    stageUncertain: !hatchedOn && res.stageCertainty === "ESTIMATED",
    acquiredOn: res.adoptedAt ?? null,
    photoUrl: res.photoUrl ?? null,
    status: res.status,
    endReason: res.endReason ?? null,
    endedOn: res.endedOn ?? null,
    createdAt: res.createdAt,
    todayRemaining: res.todayRemaining,
    recordCount: res.recordCount,
    firstRecordOn: res.firstRecordOn ?? null,
  };
}

/** PATCH /pets/{id} 본문 (아직 목업 모양) */
export type PetUpdateInput = Partial<{
  name: string;
  morph: string | null;
  sex: Sex;
  hatchedOn: string | null;
  lifeStageCode: string | null;
  stageUncertain: boolean;
  acquiredOn: string | null;
  photoFileId: string | null;
}>;

export type PetStatusChangeInput =
  { type: "end"; reason: EndReason; date: string } | { type: "revert" };
