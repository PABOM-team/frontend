import ky from "ky";
import { env } from "@/shared/config/env";

/**
 * 모든 API 호출은 이 인스턴스를 거친다.
 * 백엔드 REST API를 직접 호출하므로 나중에 네이티브 앱에서도 그대로 재사용할 수 있다.
 */
export const api = ky.create({
  prefix: env.apiBaseUrl,
  credentials: "include",
  timeout: 10_000,
  retry: { limit: 1 },
});

/** orval이 생성한 코드가 쓰는 mutator. orval.config.ts 참고 */
export async function customFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await api(url.replace(/^\//, ""), init);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
