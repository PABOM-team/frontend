import { z } from "zod";
import { successEnvelope } from "./envelope";

export const authProviderSchema = z.enum(["kakao", "google"]);
export type AuthProvider = z.infer<typeof authProviderSchema>;
export const AUTH_PROVIDER_LABEL: Record<AuthProvider, string> = {
  kakao: "카카오",
  google: "구글",
};

/** 회원 상태. PENDING_TERMS는 약관 동의 전이라 가입 토큰만 있고 다른 화면으로 못 간다 */
export const accountStatusSchema = z.enum(["PENDING_TERMS", "ACTIVE", "WITHDRAWN"]);

const agreementTypeSchema = z.enum(["TERMS", "PRIVACY", "AGE_14", "MARKETING"]);

/**
 * API-04 GET /users/me 내 정보. 로그인한 소셜 종류(provider)는 오지 않아서
 * 로그인할 때 저장해 둔 값(getStoredAccount)을 쓴다
 */
export const meSchema = successEnvelope(
  z.object({
    id: z.number(),
    nickname: z.string().nullable(),
    status: accountStatusSchema,
    role: z.enum(["USER", "ADMIN"]),
    agreements: z.array(
      z.object({
        type: agreementTypeSchema,
        version: z.string(),
        agreed: z.boolean(),
        agreedAt: z.iso.datetime({ offset: true }).nullish(),
      }),
    ),
    requiredAgreements: z.array(
      z.object({ type: agreementTypeSchema, currentVersion: z.string(), required: z.boolean() }),
    ),
    /** 필수 약관 버전이 올라가 다시 동의해야 하는지 */
    needsReconsent: z.boolean(),
    petCount: z.object({ active: z.number().int().min(0), ended: z.number().int().min(0) }),
    createdAt: z.iso.datetime({ offset: true }),
  }),
);
export type Me = z.output<typeof meSchema>;

/** 백엔드 회원. PENDING_TERMS는 약관 동의 전이라 가입 토큰만 있다 */
export const accountSchema = z.object({
  id: z.number(),
  nickname: z.string().optional(),
  status: accountStatusSchema,
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
