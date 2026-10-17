import { QueryClient, isServer } from "@tanstack/react-query";
import { getHttpStatus } from "./errors";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        // 4xx(없음·권한 없음)는 다시 불러도 같으니 재시도하지 않는다
        retry: (failureCount, error) => {
          const status = getHttpStatus(error);
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        // 연결이 돌아와도 실패한 저장은 자동 재전송하지 않는다 [제안] (SCR-E01)
        retry: false,
        networkMode: "always",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
