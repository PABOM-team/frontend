import { z } from "zod";
import { intakeSchema, routineCareItemSchema } from "./care";
import { speciesIdSchema } from "./species";

/** 넘길 최근 기록 범위(주). 0이면 넘기지 않음 */
export const RECORD_WEEKS = [0, 2, 4] as const;

export const handoverScopeSchema = z.object({
  routines: z.boolean(),
  recordWeeks: z.union([z.literal(0), z.literal(2), z.literal(4)]),
  photos: z.boolean(),
  nickname: z.boolean(),
});
export type HandoverScope = z.infer<typeof handoverScopeSchema>;

export const handoverStatusSchema = z.enum(["unused", "accepted", "expired", "canceled"]);
export type HandoverStatus = z.infer<typeof handoverStatusSchema>;
export const HANDOVER_STATUS_LABEL: Record<HandoverStatus, string> = {
  unused: "사용 전",
  accepted: "등록에 쓰임",
  expired: "기간 지남",
  canceled: "취소함",
};

export const handoverCardSchema = z.object({
  code: z.string(),
  petId: z.string(),
  petName: z.string(),
  scope: handoverScopeSchema,
  status: handoverStatusSchema,
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  url: z.string(),
});
export type HandoverCard = z.infer<typeof handoverCardSchema>;

/** 받는 사람이 로그인 없이 보는 미리보기 (API-81). 쓸 수 없는 카드면 pet이 null */
export const handoverPreviewSchema = z.object({
  code: z.string(),
  status: handoverStatusSchema,
  senderNickname: z.string().nullable(),
  /** 넘긴 최근 기록 기간(주). 넘기지 않았으면 0 */
  recordWeeks: z.number().int().min(0),
  pet: z
    .object({
      name: z.string(),
      speciesId: speciesIdSchema,
      morph: z.string().nullable(),
      lifeStageCode: z.string(),
      hatchedOn: z.iso.date().nullable(),
      handedOverOn: z.iso.date(),
    })
    .nullable(),
  routines: z.array(z.object({ careItem: routineCareItemSchema, intervalDays: z.number().int() })),
  records: z
    .array(
      z.object({
        occurredAt: z.iso.datetime(),
        careItem: z.string(),
        intake: intakeSchema.nullable(),
        weightG: z.number().nullable(),
        memo: z.string().nullable(),
        method: z.enum(["routine", "manual"]),
        photoCount: z.number().int(),
      }),
    )
    .nullable(),
});
export type HandoverPreview = z.infer<typeof handoverPreviewSchema>;

export type HandoverAcceptInput = {
  name: string;
  hatchedOn: string | null;
  acquiredOn: string;
  importRoutines: boolean;
};
