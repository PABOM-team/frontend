import type { QueryClient } from "@tanstack/react-query";

/** 쿼리 키를 한곳에 모은다. 저장 뒤 다시 불러올 범위를 맞추기 쉽게 */
export const queryKeys = {
  me: ["me"] as const,
  species: ["species"] as const,
  morphs: (serverId: number) => ["species", serverId, "morphs"] as const,
  careStandards: (speciesId: string) => ["species", speciesId, "care-standards"] as const,
  pets: ["pets"] as const,
  petList: (status: string) => ["pets", "list", status] as const,
  pet: (petId: string) => ["pets", "detail", petId] as const,
  routines: (petId: string) => ["routines", petId] as const,
  today: ["today"] as const,
  todayAt: (date: string, petId?: string) => ["today", date, petId ?? "all"] as const,
  records: ["records"] as const,
  recordList: (query: object) => ["records", "list", query] as const,
  record: (recordId: string) => ["records", "detail", recordId] as const,
  handoverCards: ["handover-cards"] as const,
  handoverPreview: (code: string) => ["handover-cards", "preview", code] as const,
};

/** 할 일·기록·일정이 바뀌면 오늘 할 일과 개체 요약(오늘 할 일 수·최근 기록)도 같이 바뀐다 */
export function invalidateCareData(queryClient: QueryClient) {
  return Promise.all(
    [queryKeys.today, queryKeys.records, queryKeys.pets, ["routines"]].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}
