import { differenceInCalendarDays } from "date-fns";
import { z } from "zod";
import { routineCareItemSchema } from "./care";

/** MVP에서 지원하는 종. 볼파이톤은 신고 요건이 달라 초기 출시에서 제외 (10/6 IA 피드백 1번) */
export const SPECIES = ["crested_gecko", "leopard_gecko"] as const;
export const speciesIdSchema = z.enum(SPECIES);
export type SpeciesId = z.infer<typeof speciesIdSchema>;

export const SPECIES_LABEL: Record<SpeciesId, string> = {
  crested_gecko: "크레스티드 게코",
  leopard_gecko: "레오파드 게코",
};

/** 개체 등록 1단계 분류. 뱀은 Figma에 있지만 MVP 범위 밖이라 '준비 중'으로만 보인다 */
export const SPECIES_GROUPS = ["lizard", "snake"] as const;
export type SpeciesGroup = (typeof SPECIES_GROUPS)[number];
export const SPECIES_GROUP_LABEL: Record<SpeciesGroup, string> = { lizard: "도마뱀", snake: "뱀" };

export const lifeStageSchema = z.object({
  code: z.string(),
  name: z.string(),
  /** 부화 후 이 일수부터 이 단계 [미확정] 10/10 공동 기획에서 확정 */
  minAgeDays: z.number().int().min(0),
  criteria: z.string(),
});
export type LifeStage = z.infer<typeof lifeStageSchema>;

export const speciesSchema = z.object({
  id: speciesIdSchema,
  group: z.enum(SPECIES_GROUPS),
  commonName: z.string(),
  officialName: z.string(),
  scientificName: z.string(),
  aliases: z.array(z.string()),
  lifeStages: z.array(lifeStageSchema).min(1),
  /** 모프 목록은 예시 (Figma P02 3/4) */
  morphs: z.array(z.string()),
  defaultFoodName: z.string(),
});
export type Species = z.infer<typeof speciesSchema>;

export const careLabelSchema = z.enum(["recommended", "reference"]);
export type CareLabel = z.infer<typeof careLabelSchema>;
/** 권고는 수의학 자문을 마친 항목만. 그 전에는 모두 참고 정보 */
export const CARE_LABEL_TEXT: Record<CareLabel, string> = {
  recommended: "권고",
  reference: "참고 정보",
};

export const careStandardSchema = z.object({
  lifeStageCode: z.string(),
  careItem: routineCareItemSchema,
  intervalDays: z.number().int().min(1),
  label: careLabelSchema,
});
export type CareStandard = z.infer<typeof careStandardSchema>;

export const careStandardTableSchema = z.object({
  speciesId: speciesIdSchema,
  version: z.string(),
  effectiveFrom: z.iso.date(),
  /** 기준표 확정 전 시안 값이면 '예시'로 표시 */
  isDraft: z.boolean(),
  standards: z.array(careStandardSchema),
  references: z.array(z.object({ title: z.string(), url: z.url().nullable() })),
  reviewNote: z.string().nullable(),
});
export type CareStandardTable = z.infer<typeof careStandardTableSchema>;

/** 부화일로 생애 단계를 고른다. 부화일을 모르면 null */
export function lifeStageFromHatch(
  species: Pick<Species, "lifeStages">,
  hatchedOn: string | null | undefined,
  today = new Date(),
): LifeStage | null {
  if (!hatchedOn) return null;
  const age = differenceInCalendarDays(today, new Date(`${hatchedOn}T00:00:00`));
  const sorted = [...species.lifeStages].sort((a, b) => b.minAgeDays - a.minAgeDays);
  return sorted.find((stage) => age >= stage.minAgeDays) ?? sorted.at(-1) ?? null;
}
