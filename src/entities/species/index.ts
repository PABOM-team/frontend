import { queryOptions, useQuery } from "@tanstack/react-query";
import { speciesApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import type { Species, SpeciesId } from "@/shared/domain/species";

export const speciesQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.species,
      queryFn: speciesApi.list,
      staleTime: Infinity,
    }),
  /** 종별 모프 (로그인 없이 부른다). 종을 고르기 전에는 부르지 않는다 */
  morphs: (serverId: number | undefined) =>
    queryOptions({
      queryKey: queryKeys.morphs(serverId ?? 0),
      queryFn: () => speciesApi.morphs(serverId!),
      enabled: serverId !== undefined,
      staleTime: Infinity,
    }),
  careStandards: (speciesId: SpeciesId) =>
    queryOptions({
      queryKey: queryKeys.careStandards(speciesId),
      queryFn: () => speciesApi.careStandards(speciesId),
      staleTime: 30 * 60 * 1000,
    }),
};

/** 종 목록을 id로 찾는다. 성장 단계 이름 같은 값은 하드코딩하지 않고 API 값만 쓴다 */
export function useSpeciesMap() {
  const { data } = useQuery(speciesQueries.list());
  return new Map<SpeciesId, Species>((data ?? []).map((s) => [s.id, s]));
}

export function stageName(species: Species | undefined, code: string) {
  return species?.lifeStages.find((s) => s.code === code)?.name ?? "";
}
