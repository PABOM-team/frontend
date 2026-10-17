"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { meQueries } from "@/entities/session";
import { LoginButtons, safeNext } from "@/features/auth";
import { env, isAuthMocked } from "@/shared/config/env";
import { PabomAppIcon, PabomLogo } from "@/shared/ui/pabom-logo";
import { Screen, ScreenFooter } from "@/shared/ui/screen";

/** SCR-A01 첫 화면 */
export function WelcomeScreen() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { data: me } = useQuery({ ...meQueries.detail(), retry: false });

  useEffect(() => {
    if (me) router.replace(me.status === "pending_agreement" ? "/agreements" : (next ?? "/home"));
  }, [me, next, router]);

  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <PabomAppIcon size={72} className="mb-5 shadow-[0_8px_24px_rgba(41,153,255,0.3)]" />
        <PabomLogo size="lg" />
        <p className="mt-5 text-[15px] leading-relaxed text-[#555]">
          게코 관리, 오늘 뭘 해야 할지
          <br />
          파봄이 알려 드릴게요
        </p>
        <p className="mt-3 text-[12.5px] text-[#999]">크레스티드 게코 · 레오파드 게코</p>
      </div>
      <ScreenFooter className="pb-[max(26px,env(safe-area-inset-bottom))]">
        <LoginButtons next={next} />
        <p className="mt-1 text-center text-[11.5px] leading-relaxed text-[#999]">
          시작하면{" "}
          <Link href="/terms" className="underline">
            이용약관
          </Link>
          과{" "}
          <Link href="/terms?tab=privacy" className="underline">
            개인정보 처리방침
          </Link>
          을 확인한 것으로 봐요.
        </p>
        {isAuthMocked ? (
          <p className="text-center text-[11px] text-primary/70">
            목업 모드 · 카카오는 기록이 있는 회원, 구글은 처음 가입하는 회원
          </p>
        ) : env.apiMocking ? (
          <p className="text-center text-[11px] text-primary/70">
            로그인은 개발 서버로 · 나머지 기능은 목업 데이터
          </p>
        ) : null}
      </ScreenFooter>
    </Screen>
  );
}
