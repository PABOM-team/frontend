import { addDays, differenceInCalendarDays, isAfter, isBefore, startOfDay } from "date-fns";
import { z } from "zod";
import { routineCareItemSchema } from "./care";
import { careLabelSchema } from "./species";

export const ROUTINE_INTERVAL_MIN = 1;
export const ROUTINE_INTERVAL_MAX = 365;

/** 개체의 관리 일정 한 줄 (API-30). 다음 예정일은 '마지막 완료일 + 주기'로 서버가 계산한다 */
export const routineSchema = z.object({
  id: z.string(),
  petId: z.string(),
  careItem: routineCareItemSchema,
  /** N일마다 반복 */
  intervalDays: z.number().int().min(ROUTINE_INTERVAL_MIN).max(ROUTINE_INTERVAL_MAX),
  /** 기준표 값. 바꾸면 customized가 켜진다 */
  standardIntervalDays: z.number().int().min(1),
  customized: z.boolean(),
  enabled: z.boolean(),
  startDate: z.iso.date(),
  /** 급여일 때 먹이 이름 */
  foodName: z.string().nullable(),
  nextDueOn: z.iso.date(),
  /** 미룬 날짜. 미루기 전 예정일은 originalDueOn */
  postponedTo: z.iso.date().nullable(),
  originalDueOn: z.iso.date().nullable(),
  basis: z.object({
    label: careLabelSchema,
    /** 적용 조건 (예: 크레스티드 게코 · 준성체) */
    condition: z.string(),
    sourceText: z.string().nullable(),
    version: z.string(),
  }),
});
export type Routine = z.infer<typeof routineSchema>;

export type RoutineUpdateInput = {
  intervalDays?: number;
  enabled?: boolean;
  foodName?: string | null;
  reason?: string | null;
};

/**
 * [from, to] 구간(양 끝 포함)에서 루틴이 돌아오는 날짜를 구한다.
 * 홈 캘린더의 미래 날짜 미리보기와 알림 예약에서 같이 쓴다.
 */
export function getOccurrences(
  routine: Pick<Routine, "intervalDays" | "startDate" | "enabled">,
  from: Date,
  to: Date,
): Date[] {
  if (!routine.enabled) return [];

  const start = startOfDay(new Date(`${routine.startDate}T00:00:00`));
  const rangeStart = startOfDay(from);
  const rangeEnd = startOfDay(to);
  if (isBefore(rangeEnd, rangeStart)) return [];

  let cursor = start;
  if (isBefore(start, rangeStart)) {
    const elapsed = differenceInCalendarDays(rangeStart, start);
    const steps = Math.ceil(elapsed / routine.intervalDays);
    cursor = addDays(start, steps * routine.intervalDays);
  }

  const result: Date[] = [];
  while (!isAfter(cursor, rangeEnd)) {
    result.push(cursor);
    cursor = addDays(cursor, routine.intervalDays);
  }
  return result;
}
