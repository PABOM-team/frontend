import { z } from "zod";
import { careItemSchema, intakeSchema } from "./care";

export const photoSchema = z.object({ id: z.string(), url: z.string() });
export type Photo = z.infer<typeof photoSchema>;

export const recordRevisionSchema = z.object({
  at: z.iso.datetime(),
  /** 바뀐 칸의 이전 값 → 이후 값 요약 */
  summary: z.string(),
});

/** 관리 기록 한 건 (care_records). 완료 체크·건너뜀·직접 기록이 모두 여기에 쌓인다 */
export const careRecordSchema = z.object({
  id: z.string(),
  petId: z.string(),
  petName: z.string(),
  routineId: z.string().nullable(),
  careItem: careItemSchema,
  type: z.enum(["done", "skipped"]),
  /** routine: 할 일 체크, manual: 직접 기록 */
  method: z.enum(["routine", "manual"]),
  /** 사건 시각과 입력 시각은 따로 저장한다 */
  occurredAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  intake: intakeSchema.nullable(),
  weightG: z.number().positive().nullable(),
  memo: z.string().nullable(),
  foodName: z.string().nullable(),
  skipReason: z.string().nullable(),
  photos: z.array(photoSchema),
  revisions: z.array(recordRevisionSchema),
});
export type CareRecord = z.infer<typeof careRecordSchema>;

export const recordPageSchema = z.object({
  items: z.array(careRecordSchema),
  nextCursor: z.string().nullable(),
});
export type RecordPage = z.infer<typeof recordPageSchema>;

export const MEMO_MAX = 200;

export type RecordQuery = {
  petId?: string;
  careItem?: string;
  /** YYYY-MM-DD, 양 끝 포함 */
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};

export type RecordCreateInput = {
  petId: string;
  careItem: z.infer<typeof careItemSchema>;
  occurredAt: string;
  intake?: z.infer<typeof intakeSchema> | null;
  weightG?: number | null;
  memo?: string | null;
  photoFileIds?: string[];
};

export type RecordUpdateInput = Partial<Omit<RecordCreateInput, "petId" | "careItem">>;

export type CompleteInput = {
  occurredAt?: string;
  intake?: z.infer<typeof intakeSchema> | null;
  weightG?: number | null;
  memo?: string | null;
};
