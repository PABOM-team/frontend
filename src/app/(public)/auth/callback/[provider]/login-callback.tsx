"use client";

import { useMutation } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { FullScreenLoading, takeLoginNext } from "@/features/auth";
import { refreshAccessToken } from "@/shared/api/client";
import { authApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { setAccessToken, setSignupSession, setStoredAccount } from "@/shared/api/session";
import { authProviderSchema, type AuthProvider } from "@/shared/domain/user";
import { StateMessage } from "@/shared/ui/display";
import { Screen } from "@/shared/ui/screen";

type LoginOutcome =
  | { kind: "signup"; token: string; expiresIn: number; id: number; nickname?: string }
  | { kind: "access"; token: string; id: number; nickname?: string };

/** 결과도 인가 코드도 없이 돌아온 경우 (동의 화면에서 취소 등) */
class LoginCanceled extends Error {}
/** 이 화면에서 알아낸 실패. 문구를 그대로 보여 준다 */
class LoginFailure extends Error {}

/**
 * 결과를 두 가지 방법으로 받는다.
 * - 주소 #result=… : 카카오·구글이 /api/v1/auth/{provider}/callback으로 돌아와 프록시가 처리한 뒤 넘겨 준 결과
 * - 주소 ?code&state : 인가 코드만 받은 경우(목업 포함). 이 화면이 백엔드 콜백 API를 부른다
 */
async function resolveLogin(
  provider: AuthProvider,
  code: string | null,
  state: string | null,
): Promise<LoginOutcome> {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const result = hash.get("result");
  const id = Number(hash.get("id"));
  const nickname = hash.get("nickname") || undefined;

  if (result === "signup") {
    const token = hash.get("token");
    if (!token) throw new LoginFailure("가입 정보를 받지 못했어요.");
    return { kind: "signup", token, expiresIn: Number(hash.get("expiresIn")) || 600, id, nickname };
  }
  if (result === "access") {
    // 프록시가 refresh 쿠키를 저장해 두었으니 access 토큰을 다시 받는다
    const token = await refreshAccessToken();
    if (!token) throw new LoginFailure("로그인 정보를 받지 못했어요. 다시 로그인해 주세요.");
    return { kind: "access", token, id, nickname };
  }
  if (!code || !state) throw new LoginCanceled();

  const login = await authApi.callback(provider, { code, state });
  const user = { id: login.user.id, nickname: login.user.nickname };
  return "signupToken" in login
    ? { kind: "signup", token: login.signupToken, expiresIn: login.expiresIn, ...user }
    : { kind: "access", token: login.accessToken, ...user };
}

/** SCR-A02 로그인 처리 중. 처리 뒤 뒤로 가기로 이 화면에 다시 오지 않게 replace로 이동 */
export function LoginCallback() {
  const router = useRouter();
  const params = useParams<{ provider: string }>();
  const search = useSearchParams();
  const provider = authProviderSchema.safeParse(params.provider);
  const code = search.get("code");
  const state = search.get("state");
  const errorCode = search.get("error");
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
  });

  useEffect(() => {
    if (!provider.success || errorCode || started.current) return;
    started.current = true;
    login.mutate();
  }, [provider.success, errorCode, login]);

  if (!provider.success || errorCode === "access_denied" || login.error instanceof LoginCanceled) {
    return (
      <Screen className="justify-center">
        <StateMessage
          title="로그인을 취소했어요"
          description="다시 시작하려면 처음 화면에서 로그인해 주세요."
          action={{ label: "처음으로", onClick: () => router.replace("/welcome") }}
        />
      </Screen>
    );
  }

  // 인가 코드는 한 번만 쓸 수 있어서 '다시 시도' 대신 처음부터 다시 로그인하게 한다
  if (errorCode || login.isError) {
    const message =
      search.get("message") ??
      (login.error instanceof LoginFailure ? login.error.message : getErrorMessage(login.error));
    return (
      <Screen className="justify-center">
        <StateMessage
          title="로그인하지 못했어요"
          description={message}
          action={{ label: "다시 로그인", onClick: () => router.replace("/welcome") }}
        />
      </Screen>
    );
  }

  return <FullScreenLoading />;
}
