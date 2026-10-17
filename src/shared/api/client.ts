import ky from "ky";
import { env } from "@/shared/config/env";
import { tokenSchema } from "@/shared/domain/user";
import { getAccessToken, notifySessionExpired, setAccessToken } from "./session";

/** 경로는 /api/v1 고정 (IA 8_개발 참고 · API 공통) */
export const apiBaseUrl = `${env.apiBaseUrl.replace(/\/$/, "")}/api/v1`;

let refreshing: Promise<string | null> | undefined;
/** 앱을 연 뒤 첫 요청들이 함께 기다리는 refresh 한 번 */
let bootstrap: Promise<unknown> | undefined;

/**
 * 로그인 전에 부르는 API(인증)와 가입 토큰을 직접 싣는 약관 동의.
 * 앱 시작 refresh를 기다리지 않고, 401이어도 refresh로 다시 시도하지 않는다
 */
const isAuthPath = (url: string) => /\/(auth\/|me\/agreements$)/.test(new URL(url).pathname);

/** refresh 쿠키로 access 토큰을 다시 받는다 (API-02). 동시에 여러 번 불려도 요청은 한 번만 */
export function refreshAccessToken() {
  refreshing ??= ky
    .post(`${apiBaseUrl}/auth/refresh`, { credentials: "include", retry: 0 })
    .json(tokenSchema)
    .then(({ accessToken }) => {
      setAccessToken(accessToken);
      return accessToken;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = undefined;
    });
  return refreshing;
}

/**
 * 모든 API 호출은 이 인스턴스를 거친다.
 * 백엔드 REST API를 직접 호출하므로 나중에 네이티브 앱에서도 그대로 재사용할 수 있다.
 */
export const api = ky.create({
  prefix: apiBaseUrl,
  credentials: "include",
  timeout: 10_000,
  retry: { limit: 1 },
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        // 새로고침하면 access 토큰이 없으니, 401을 먼저 받지 않도록 앱 시작 때 한 번 재발급한다
        if (!isAuthPath(request.url)) {
          if (!getAccessToken()) bootstrap ??= refreshAccessToken();
          await bootstrap;
        }
        // 약관 동의처럼 가입 토큰을 직접 실어 보낸 요청은 그대로 둔다
        const token = getAccessToken();
        if (token && !request.headers.has("Authorization")) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async ({ request, response, retryCount }) => {
        if (response.status !== 401 || retryCount > 0) return;
        if (isAuthPath(request.url)) return;

        const token = await refreshAccessToken();
        if (!token) {
          notifySessionExpired();
          return;
        }
        const headers = new Headers(request.headers);
        headers.set("Authorization", `Bearer ${token}`);
        return ky.retry({ request: new Request(request, { headers }), code: "TOKEN_REFRESHED" });
      },
    ],
  },
});

/** orval이 생성한 코드가 쓰는 mutator. orval.config.ts 참고 */
export async function customFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await api(url.replace(/^\//, ""), init);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
