"use client";

import { useMutation } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { FullScreenLoading, takeLoginNext } from "@/features/auth";
import { authApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { setAccessToken, setSignupSession, setStoredAccount } from "@/shared/api/session";
import { authProviderSchema, type AuthProvider } from "@/shared/domain/user";
import { toast } from "@/shared/ui/toast";

type LoginOutcome =
  | { kind: "signup"; token: string; expiresIn: number; id: number; nickname?: string }
  | { kind: "access"; token: string; id: number; nickname?: string };

/** 인가 코드 없이 돌아온 경우 (동의 화면에서 취소 등) */
class LoginCanceled extends Error {}

/**
 * 카카오·구글이 /api/v1/auth/{provider}/callback으로 돌려보내면 그 경로가 code·state를 붙여
 * 이 화면으로 보낸다(목업은 바로 이 화면으로 온다). 이 화면이 백엔드 콜백 API를 불러
 * 새 회원이면 가입 토큰, 기존 회원이면 access 토큰과 refresh 쿠키를 받는다
 */
async function resolveLogin(
  provider: AuthProvider,
  code: string | null,
  state: string | null,
): Promise<LoginOutcome> {
  if (!code || !state) throw new LoginCanceled();

  const login = await authApi.callback(provider, { code, state });
  const user = { id: login.user.id, nickname: login.user.nickname };
  return "signupToken" in login
    ? { kind: "signup", token: login.signupToken, expiresIn: login.expiresIn, ...user }
    : { kind: "access", token: login.accessToken, ...user };
}

/**
 * SCR-A02 로그인 처리 중. Figma에는 이 화면의 실패 화면이 없어서
 * 취소하면 첫 화면으로 그냥 돌아가고, 실패하면 오류 토스트(C3-4)와 함께 첫 화면으로 간다.
 * 처리 뒤 뒤로 가기로 이 화면에 다시 오지 않게 replace로 이동
 */
export function LoginCallback() {
  const router = useRouter();
  const params = useParams<{ provider: string }>();
  const search = useSearchParams();
  const provider = authProviderSchema.safeParse(params.provider);
  const code = search.get("code");
  const state = search.get("state");
  const errorCode = search.get("error");
  const errorMessage = search.get("message");
  const started = useRef(false);

  const login = useMutation({
    mutationFn: () => resolveLogin(provider.data!, code, state),
    onSuccess: (outcome) => {
      const next = takeLoginNext();
      setStoredAccount({ id: outcome.id, nickname: outcome.nickname, provider: provider.data! });
      if (outcome.kind === "signup") {
        setSignupSession(outcome.token, outcome.expiresIn);
        router.replace(next ? `/agreements?next=${encodeURIComponent(next)}` : "/agreements");
      } else {
        setAccessToken(outcome.token);
        router.replace(next ?? "/home");
      }
    },
    onError: (error) => {
      if (!(error instanceof LoginCanceled)) {
        toast(getErrorMessage(error, FAILED));
      }
      router.replace("/welcome");
    },
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!provider.success || errorCode) {
      // 동의 화면에서 취소(access_denied)는 조용히, 백엔드 오류는 문구를 보여 주고 첫 화면으로
      if (provider.success && errorCode !== "access_denied") toast(errorMessage ?? FAILED);
      router.replace("/welcome");
      return;
    }
    login.mutate();
  }, [provider.success, errorCode, errorMessage, login, router]);

  return <FullScreenLoading />;
}

const FAILED = "로그인하지 못했어요. 다시 시도해 주세요.";
