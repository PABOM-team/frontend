"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { meQueries } from "@/entities/session";
import { useLogout } from "@/features/auth";
import { clearSession } from "@/shared/api/session";
import { env } from "@/shared/config/env";
import { AUTH_PROVIDER_LABEL } from "@/shared/domain/user";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

const MENU = [
  { href: "/settings/guidelines", label: "관리 가이드라인" },
  { href: "/terms", label: "이용약관" },
  { href: "/terms?tab=privacy", label: "개인정보 처리방침" },
  { href: "/settings/handover-cards", label: "보낸 인계 카드" },
];

/** SCR-S01 설정(계정 메뉴). 알림 설정은 범위 밖 */
export function SettingsScreen() {
  const { data: me } = useQuery(meQueries.detail());
  const logout = useLogout();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <>
      <TopBar leading="none" title="설정" />
      <ScreenBody>
        {me ? (
          <p className="mb-2 text-[13px] text-[#888]">
            {me.nickname}님 · {AUTH_PROVIDER_LABEL[me.provider]}로 로그인
          </p>
        ) : null}
        <ul>
          {MENU.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-[50px] items-center justify-between border-b border-border text-[15px]"
              >
                {item.label}
                <ChevronRight className="size-4 text-[#aaa]" />
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="mt-4 flex h-[50px] w-full items-center justify-between border-b border-border text-[15px]"
        >
          로그아웃
          {me ? (
            <span className="text-[13px] text-[#888]">{AUTH_PROVIDER_LABEL[me.provider]} 계정</span>
          ) : null}
        </button>
        <Link href="/settings/withdraw" className="mt-3 inline-block text-[12.5px] text-[#888]">
          회원 탈퇴
        </Link>
        <p className="mt-8 text-[11.5px] text-[#aaa]">앱 버전 0.1.0</p>
        {env.apiMocking ? <MockTools /> : null}
      </ScreenBody>
      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="로그아웃할까요?"
        description="다시 로그인하면 기록을 그대로 볼 수 있어요."
        confirmLabel="로그아웃"
        pending={logout.isPending}
        onConfirm={() => logout.mutate()}
      />
    </>
  );
}

/** 목업 모드에서만 보이는 개발 도구 */
function MockTools() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return (
    <div className="mt-6 rounded-[10px] border border-dashed border-primary/40 p-3 text-[12px] text-[#666]">
      <p className="font-bold text-primary">목업 모드 (개발용)</p>
      <p className="mt-1">백엔드 없이 MSW가 응답해요. 데이터는 이 브라우저에만 저장돼요.</p>
      <button
        type="button"
        className="mt-2 font-medium text-primary underline"
        onClick={async () => {
          const { resetDb } = await import("@/mocks/db");
          resetDb();
          clearSession();
          queryClient.clear();
          router.replace("/welcome");
        }}
      >
        목업 데이터 처음으로 되돌리기
      </button>
    </div>
  );
}
