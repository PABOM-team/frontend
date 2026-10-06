import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import { petSchema } from "@/shared/domain/pet";

// API 스펙 확정(10/14) 후에는 orval 생성 훅으로 바꾼다. 응답은 zod로 한 번 검증한다.
export const petQueries = {
  all: () => ["pets"] as const,
  list: () =>
    queryOptions({
      queryKey: [...petQueries.all(), "list"],
      queryFn: async () => petSchema.array().parse(await api.get("pets").json()),
    }),
};
