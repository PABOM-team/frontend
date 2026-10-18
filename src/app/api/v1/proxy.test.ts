import { describe, expect, it } from "vitest";
import { GET as proxyGet, POST as proxyPost } from "./[...path]/route";
import { GET as callbackGet } from "./auth/[provider]/callback/route";

// 테스트는 NODE_ENV=test라 배포와 같다: 프록시는 꺼지고 콜백 경로의 화면 이동만 남는다
describe("로컬 개발 전용 프록시", () => {
  it("배포에서는 /api/v1 요청을 넘기지 않고 404", async () => {
    const ctx = { params: Promise.resolve({ path: ["auth", "refresh"] }) };
    const response = await proxyPost(
      new Request("https://pabom.app/api/v1/auth/refresh", { method: "POST" }),
      ctx,
    );
    expect(response.status).toBe(404);
    const get = await proxyGet(new Request("https://pabom.app/api/v1/me"), {
      params: Promise.resolve({ path: ["me"] }),
    });
    expect(get.status).toBe(404);
  });

  it("카카오·구글에서 돌아오면 code·state를 붙여 로그인 처리 화면으로 보낸다", async () => {
    const response = await callbackGet(
      new Request("https://pabom.app/api/v1/auth/kakao/callback?code=abc&state=xyz", {
        headers: { "sec-fetch-mode": "navigate" },
      }),
      { params: Promise.resolve({ provider: "kakao" }) },
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://pabom.app/auth/callback/kakao?code=abc&state=xyz",
    );
  });

  it("동의 화면에서 취소해도 error 파라미터를 그대로 넘긴다 (Sec-Fetch-Mode 없는 브라우저 포함)", async () => {
    const response = await callbackGet(
      new Request("https://pabom.app/api/v1/auth/google/callback?error=access_denied", {
        headers: { accept: "text/html,application/xhtml+xml" },
      }),
      { params: Promise.resolve({ provider: "google" }) },
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://pabom.app/auth/callback/google?error=access_denied",
    );
  });

  it("화면이 fetch로 부른 콜백은 배포에서 넘기지 않는다 (화면이 백엔드를 바로 부른다)", async () => {
    const response = await callbackGet(
      new Request("https://pabom.app/api/v1/auth/kakao/callback?code=abc&state=xyz", {
        headers: { "sec-fetch-mode": "cors", accept: "application/json" },
      }),
      { params: Promise.resolve({ provider: "kakao" }) },
    );
    expect(response.status).toBe(404);
  });
});
