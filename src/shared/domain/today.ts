import { z } from "zod";
import { intakeSchema, routineCareItemSchema } from "./care";

export const taskStateSchema = z.enum(["todo", "done", "skipped", "planned"]);
export type TaskState = z.infer<typeof taskStateSchema>;

/** 오늘 할 일 한 장 (API-40). 앞 날짜를 조회하면 planned로 온다 */
export const taskSchema = z.object({
  routineId: z.string(),
  petId: z.string(),
  petName: z.string(),
  careItem: routineCareItemSchema,
  title: z.string(),
  intervalDays: z.number().int(),
  dueOn: z.iso.date(),
  /** 미룬 할 일이면 원래 예정일 */
  originalDueOn: z.iso.date().nullable(),
  /** 지난 할 일이면 며칠 지났는지. '안 함'으로 단정하지 않고 'n일 지남'으로만 보인다 */
  overdueDays: z.number().int().min(0),
  state: taskStateSchema,
  record: z
    .object({
      id: z.string(),
      occurredAt: z.iso.datetime(),
      intake: intakeSchema.nullable(),
      weightG: z.number().nullable(),
      skipReason: z.string().nullable(),
    })
    .nullable(),
});
export type Task = z.infer<typeof taskSchema>;

export const todaySchema = z.object({
  date: z.iso.date(),
  items: z.array(taskSchema),
});
export type Today = z.infer<typeof todaySchema>;
