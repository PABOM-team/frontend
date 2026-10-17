import { z } from "zod";
import { successEnvelope } from "./envelope";

export const authProviderSchema = z.enum(["kakao", "google"]);
export type AuthProvider = z.infer<typeof authProviderSchema>;
export const AUTH_PROVIDER_LABEL: Record<AuthProvider, string> = {
  kakao: "카카오",
  google: "구글",
};

export const meSchema = z.object({
  id: z.string(),
  /** 카카오 닉네임·구글 이름. 비어 오면 서버가 '파봄 사용자0000'을 넣는다 */
  nickname: z.string(),
  provider: authProviderSchema,
  /** pending_agreement면 약관 동의 전이라 다른 화면으로 못 간다 */
  status: z.enum(["pending_agreement", "active"]),
  joinedAt: z.iso.datetime(),
  petCount: z.number().int().min(0),
});
export type Me = z.infer<typeof meSchema>;

/** 백엔드 회원. PENDING_TERMS는 약관 동의 전이라 가입 토큰만 있다 */
export const accountSchema = z.object({
  id: z.number(),
  nickname: z.string().optional(),
  status: z.enum(["PENDING_TERMS", "ACTIVE", "WITHDRAWN"]),
});
export type Account = z.infer<typeof accountSchema>;

/** API-01 카카오·구글 로그인 주소. 응답과 함께 state 쿠키가 온다 */
export const loginUrlSchema = successEnvelope(z.object({ authorizationUrl: z.url() }));

/**
 * API-01 인가 코드로 로그인한 결과.
 * 새 회원은 약관 동의에만 쓰는 가입 토큰(10분), 기존 회원은 access 토큰(refresh는 httpOnly 쿠키)
 */
export const oauthLoginSchema = z.union([
  z.object({
    signupToken: z.string(),
    expiresIn: z.number(),
    isNewUser: z.boolean(),
    user: accountSchema,
  }),
  z.object({
    accessToken: z.string(),
    expiresIn: z.number(),
    isNewUser: z.boolean(),
    user: accountSchema,
  }),
]);
export type OAuthLoginResult = z.infer<typeof oauthLoginSchema>;

/** API-05 약관 동의로 가입을 마치면 access 토큰이 나온다 */
export const agreementCompletionSchema = z.object({
  user: accountSchema,
  accessToken: z.string(),
  expiresIn: z.number(),
});

export const tokenSchema = z.object({ accessToken: z.string(), expiresIn: z.number().optional() });

/** 약관 버전. 백엔드 최신 버전과 다르면 409 AGREEMENT_VERSION_MISMATCH */
export const AGREEMENT_VERSION = "1.0";

export const AGREEMENTS = [
  { type: "TERMS", label: "이용약관 동의", required: true, href: "/terms" },
  { type: "PRIVACY", label: "개인정보 수집·이용 동의", required: true, href: "/terms?tab=privacy" },
  { type: "AGE_14", label: "만 14세 이상이에요", required: true, href: null },
  { type: "MARKETING", label: "마케팅 정보 수신 동의", required: false, href: "/terms" },
] as const;
export type AgreementType = (typeof AGREEMENTS)[number]["type"];
