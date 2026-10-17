import { z } from "zod";
import { speciesIdSchema } from "./species";

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

/** POST /pets, PATCH /pets/{id} 본문 */
export type PetCreateInput = {
  name: string;
  speciesId: z.infer<typeof speciesIdSchema>;
  morph: string | null;
  sex: Sex;
  hatchedOn: string | null;
  lifeStageCode: string | null;
  stageUncertain: boolean;
  acquiredOn: string | null;
  photoFileId: string | null;
};
export type PetUpdateInput = Partial<Omit<PetCreateInput, "speciesId">>;

export type PetStatusChangeInput =
  { type: "end"; reason: EndReason; date: string } | { type: "revert" };
