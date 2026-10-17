import { queryOptions } from "@tanstack/react-query";
import { routinesApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import {
  formatInterval,
  RECORD_KIND,
  RECORD_KIND_LABEL,
  ROUTINE_LABEL,
} from "@/shared/domain/care";
import type { Routine } from "@/shared/domain/routine";

export const routineQueries = {
  list: (petId: string) =>
    queryOptions({
      queryKey: queryKeys.routines(petId),
      queryFn: () => routinesApi.list(petId),
    }),
};

/** 2일마다 · 먹은 정도 · 먹이: 인공 사료 */
export function routineSummary(routine: Routine) {
  return [
    formatInterval(routine.intervalDays),
    RECORD_KIND_LABEL[RECORD_KIND[routine.careItem]],
    routine.foodName ? `먹이: ${routine.foodName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** 급여 2일 · 분무 매일 · 체중 14일 */
export function routinesShortLine(routines: Routine[]) {
  return routines
    .filter((r) => r.enabled)
    .map(
      (r) =>
        `${ROUTINE_LABEL[r.careItem].replace(" 확인", "")} ${r.intervalDays === 1 ? "매일" : `${r.intervalDays}일`}`,
    )
    .join(" · ");
}
