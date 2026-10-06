import { addDays, differenceInCalendarDays, isAfter, isBefore, startOfDay } from "date-fns";
import { z } from "zod";

export const ROUTINE_TYPES = ["feeding", "misting", "cleaning", "weighing", "supplement"] as const;
export const routineTypeSchema = z.enum(ROUTINE_TYPES);
export type RoutineType = z.infer<typeof routineTypeSchema>;

export const ROUTINE_LABEL: Record<RoutineType, string> = {
  feeding: "먹이",
  misting: "분무",
  cleaning: "청소",
  weighing: "체중 측정",
  supplement: "영양제",
};

export const routineSchema = z.object({
  id: z.string(),
  petId: z.string(),
  type: routineTypeSchema,
  /** N일마다 반복 */
  intervalDays: z.number().int().min(1).max(90),
  startDate: z.iso.date(),
  enabled: z.boolean().default(true),
});
export type Routine = z.infer<typeof routineSchema>;

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
