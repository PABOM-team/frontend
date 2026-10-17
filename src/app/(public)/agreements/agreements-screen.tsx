"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { safeNext, useLogout } from "@/features/auth";
import { meApi } from "@/shared/api/endpoints";
import { getApiError, getErrorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query-keys";
import { clearSignupSession, getSignupSession, setAccessToken } from "@/shared/api/session";
import { AGREEMENTS, type AgreementType } from "@/shared/domain/user";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/form";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { toast } from "@/shared/ui/toast";

/** 가입 토큰이 없거나 10분이 지나 처음부터 다시 로그인해야 할 때 */
class SignupExpired extends Error {}

/**
 * SCR-A03 첫 로그인 약관 동의. 뒤로 없음, 나가기는 로그아웃.
 * 로그인 결과로 받은 가입 토큰으로 동의를 보내고, 가입이 끝나면 access 토큰을 받는다
 */
export function AgreementsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // 인계 카드 링크로 들어온 사람만 그 카드로 돌려보내고, 나머지는 가입 직후 개체 등록(A04 A안)으로
  const requested = safeNext(useSearchParams().get("next"));
  const next = requested?.startsWith("/share/") ? requested : null;
  const logout = useLogout();
  const [checked, setChecked] = useState<Set<AgreementType>>(new Set());

  // 로그인을 거치지 않고 들어왔으면 첫 화면으로
  useEffect(() => {
    if (!getSignupSession()) router.replace("/welcome");
  }, [router]);

  const allChecked = AGREEMENTS.every((a) => checked.has(a.type));
  const requiredDone = AGREEMENTS.filter((a) => a.required).every((a) => checked.has(a.type));

  const toggle = (type: AgreementType, on: boolean) =>
    setChecked((prev) => {
      const nextSet = new Set(prev);
      if (on) nextSet.add(type);
      else nextSet.delete(type);
      return nextSet;
    });

  const agree = useMutation({
    mutationFn: () => {
      const signup = getSignupSession();
      if (!signup) throw new SignupExpired();
      return meApi.agree([...checked], signup.token);
    },
    onSuccess: ({ accessToken }) => {
      setAccessToken(accessToken);
      clearSignupSession();
      queryClient.removeQueries({ queryKey: queryKeys.me });
      // 인계 카드로 들어온 사람은 시작 안내 없이 바로 등록 화면으로 (FL-10)
      router.replace(next ?? "/pets/new?onboarding=1");
    },
    onError: (error) => {
      if (error instanceof SignupExpired || getApiError(error)?.code === "INVALID_TOKEN") {
        clearSignupSession();
        toast("가입 시간이 지났어요. 다시 로그인해 주세요.");
        router.replace("/welcome");
        return;
      }
      toast(getErrorMessage(error));
    },
  });

  return (
    <Screen>
      <div className="flex h-[52px] shrink-0 items-center justify-end px-4">
        <button
          type="button"
          className="text-[13px] text-[#888]"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          나가기
        </button>
      </div>
      {/* 저장 중에는 입력을 흐리게 잠근다 (C2-2) */}
      <ScreenBody className={agree.isPending ? "pointer-events-none opacity-50" : undefined}>
        <h1 className="text-[22px] leading-snug font-bold">
          파봄을 쓰려면
          <br />
          동의가 필요해요
        </h1>
        <label className="mt-7 flex items-center gap-2.5 border-b-[1.5px] border-foreground pb-3.5 text-[15px] font-bold">
          <Checkbox
            checked={allChecked}
            onCheckedChange={(on) =>
              setChecked(on === true ? new Set(AGREEMENTS.map((a) => a.type)) : new Set())
            }
          />
          전체 동의
        </label>
        <ul>
          {AGREEMENTS.map((agreement) => (
            <li
              key={agreement.type}
              className="flex h-[50px] items-center gap-2.5 border-b border-border"
            >
              <label className="flex min-w-0 flex-1 items-center gap-2.5 text-[14.5px]">
                <Checkbox
                  checked={checked.has(agreement.type)}
                  onCheckedChange={(on) => toggle(agreement.type, on === true)}
                />
                <span className="truncate">
                  [{agreement.required ? "필수" : "선택"}] {agreement.label}
                </span>
              </label>
              {agreement.href ? (
                <Link
                  href={agreement.href}
                  className="flex items-center gap-1 text-[13px] text-[#888]"
                  aria-label={`${agreement.label} 보기`}
                >
                  보기
                  <ChevronRight className="size-3.5" />
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-[10px] bg-[#f5f5f5] p-3 text-[12px] leading-relaxed text-[#666]">
          받는 정보: 로그인 서비스의 고유 식별값, 닉네임(구글은 이름). 이메일·연락처는 받지 않아요.
        </div>
      </ScreenBody>
      <ScreenFooter>
        <Button
          size="xl"
          disabled={!requiredDone || agree.isPending}
          onClick={() => agree.mutate()}
        >
          {agree.isPending ? (
            <LoaderCircle className="size-5 animate-spin" aria-label="저장 중" />
          ) : (
            "시작하기"
          )}
        </Button>
        {!requiredDone ? (
          <p className="text-center text-[11.5px] text-[#888]">
            필수 항목에 모두 동의하면 시작할 수 있어요
          </p>
        ) : null}
      </ScreenFooter>
    </Screen>
  );
}
