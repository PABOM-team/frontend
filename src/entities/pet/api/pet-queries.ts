import { queryOptions } from "@tanstack/react-query";
import { petsApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import type { PetStatus } from "@/shared/domain/pet";

// 응답은 shared/api/endpoints에서 zod로 한 번 검증한다
export const petQueries = {
  all: () => queryKeys.pets,
  list: (status: PetStatus = "active") =>
    queryOptions({
      queryKey: queryKeys.petList(status),
      queryFn: () => petsApi.list(status),
    }),
  detail: (petId: string) =>
    queryOptions({
      queryKey: queryKeys.pet(petId),
      queryFn: () => petsApi.get(petId),
    }),
};
