import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { defineNetwork, InterceptorSource } from "msw/experimental";
import { env } from "@/shared/config/env";
import { appHandlers, authHandlers, speciesHandlers } from "./handlers";

/**
 * 브라우저 목업. 서비스 워커 대신 페이지의 fetch를 직접 가로챈다.
 * 서비스 워커 방식은 탭이 백그라운드에 오래 있으면 브라우저가 워커를 멈춰서,
 * 요청이 목업을 거치지 않고 진짜 서버로 새는 문제가 있었다.
 *
 * NEXT_PUBLIC_API_LIVE에 auth가 있으면 로그인·약관 동의를, species가 있으면 종·모프 조회를
 * 가로채지 않고 진짜 백엔드로 보낸다.
 */
export const network = defineNetwork({
  sources: [new InterceptorSource({ interceptors: [new FetchInterceptor()] })],
  handlers: [
    ...(env.apiLive.has("auth") ? [] : authHandlers),
    ...(env.apiLive.has("species") ? [] : speciesHandlers),
    ...appHandlers,
  ],
  onUnhandledFrame: "bypass",
});

/** 예전에 등록된 MSW 서비스 워커가 남아 있으면 지운다 (가로채기는 이제 페이지에서 한다) */
export async function removeLegacyWorker() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((r) => r.active?.scriptURL.includes("mockServiceWorker"))
      .map((r) => r.unregister()),
  );
}
