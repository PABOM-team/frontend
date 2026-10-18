import { describe, expect, it } from "vitest";
import { agreementCompletionSchema, oauthLoginSchema, tokenSchema } from "./user";

const envelope = <T>(data: T) => ({
  resultType: "SUCCESS",
  success: { data },
  error: null,
  meta: { timestamp: "2026-10-18T12:00:00", path: "/api/v1/auth/kakao/callback" },
});

// 백엔드 스펙(API-01) 예시 그대로
const signup = {
  signupToken: "eyJhbGciOi...",
  expiresIn: 600,
  isNewUser: true,
  user: { id: 1, nickname: "파봄 사용자1234", status: "PENDING_TERMS" },
};
const access = {
  accessToken: "eyJhbGciOi...",
  expiresIn: 1800,
  isNewUser: false,
  user: { id: 1, nickname: "파봄", status: "ACTIVE" },
};

describe("로그인 콜백 응답", () => {
  it("새 회원은 가입 토큰, 기존 회원은 access 토큰", () => {
    const newUser = oauthLoginSchema.parse(signup);
    expect("signupToken" in newUser && newUser.signupToken).toBe(signup.signupToken);
    const member = oauthLoginSchema.parse(access);
    expect("accessToken" in member && member.accessToken).toBe(access.accessToken);
  });

  it("공통 봉투에 싸서 와도 같은 결과", () => {
    expect(oauthLoginSchema.parse(envelope(signup))).toEqual(oauthLoginSchema.parse(signup));
    expect(oauthLoginSchema.parse(envelope(access))).toEqual(oauthLoginSchema.parse(access));
    expect(tokenSchema.parse(envelope({ accessToken: "a", expiresIn: 1800 })).accessToken).toBe(
      "a",
    );
    expect(
      agreementCompletionSchema.parse(
        envelope({ user: { id: 1, status: "ACTIVE" }, accessToken: "a", expiresIn: 1800 }),
      ).accessToken,
    ).toBe("a");
  });

  it("토큰이 없으면 거부한다", () => {
    expect(oauthLoginSchema.safeParse({ ...access, accessToken: undefined }).success).toBe(false);
    expect(oauthLoginSchema.safeParse(envelope({ user: access.user })).success).toBe(false);
  });
});
