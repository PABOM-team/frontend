import { queryOptions } from "@tanstack/react-query";
import { meApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";

export const meQueries = {
  detail: () =>
    queryOptions({
      queryKey: queryKeys.me,
      queryFn: meApi.get,
      staleTime: 5 * 60 * 1000,
      retry: false,
    }),
};
