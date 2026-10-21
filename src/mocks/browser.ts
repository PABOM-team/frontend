import { FetchInterceptor } from "@mswjs/interceptors/fetch";
import { defineNetwork, InterceptorSource } from "msw/experimental";
import { env } from "@/shared/config/env";
import {
  appHandlers,
  authHandlers,
  fileHandlers,
  petHandlers,
  recordHandlers,
  speciesHandlers,
  userHandlers,
} from "./handlers";

/**
 * 브라우저 목업. 서비스 워커 대신 페이지의 fetch를 직접 가로챈다.
 * 서비스 워커 방식은 탭이 백그라운드에 오래 있으면 브라우저가 워커를 멈춰서,
 * 요청이 목업을 거치지 않고 진짜 서버로 새는 문제가 있었다.
 *
 * NEXT_PUBLIC_API_LIVE에 적은 묶음은 가로채지 않고 진짜 백엔드로 보낸다.
 * auth = 로그인·약관 동의, user = 내 정보·회원 탈퇴, species = 종·모프,
 * pet = 개체 등록·조회·수정·삭제, record = 기록, file = 사진
 *
 * 일정·오늘 할 일은 아직 목업이라, pet·record를 진짜로 보내면 진짜 개체에는 일정이 없어
 * 홈(오늘 할 일)과 체크 리스트가 비어 보인다
 */
const groups = {
  auth: authHandlers,
  user: userHandlers,
  species: speciesHandlers,
  pet: petHandlers,
  record: recordHandlers,
  file: fileHandlers,
};

export const network = defineNetwork({
  sources: [new InterceptorSource({ interceptors: [new FetchInterceptor()] })],
  handlers: [
    ...Object.entries(groups).flatMap(([name, handlers]) =>
      env.apiLive.has(name) ? [] : handlers,
    ),
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
