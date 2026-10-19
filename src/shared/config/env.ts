/** 쉼표로 적은 목록을 Set으로 */
const list = (value: string | undefined) =>
  new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

export const env = {
  /**
   * 브라우저가 API를 부르는 백엔드 주소. 배포에서는 반드시 넣는다 (예: https://api.pabom.app).
   * 로컬 개발에서 비워 두면 같은 주소의 /api/v1로 부르고, 개발 전용 프록시(src/app/api/v1)가
   * API_PROXY_TARGET 백엔드로 넘긴다.
   */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  apiMocking: process.env.NEXT_PUBLIC_API_MOCKING === "enabled",
  /** 목업 모드에서도 진짜 백엔드로 보내는 API 묶음. auth(로그인·약관 동의), user(내 정보·회원 탈퇴) */
  apiLive: list(process.env.NEXT_PUBLIC_API_LIVE),
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
} as const;

/** 로그인을 목업으로 하는지 (목업 모드이면서 auth를 진짜로 보내지 않을 때) */
export const isAuthMocked = env.apiMocking && !env.apiLive.has("auth");
