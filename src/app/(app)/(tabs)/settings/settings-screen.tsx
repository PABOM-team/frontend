"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { meQueries } from "@/entities/session";
import { useLogout } from "@/features/auth";
import { AUTH_PROVIDER_LABEL } from "@/shared/domain/user";
import { ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

const MENU = [
  { href: "/settings/guidelines", label: "관리 가이드라인" },
  { href: "/terms", label: "이용약관" },
  { href: "/terms?tab=privacy", label: "개인정보 처리방침" },
];

/** SCR-S01 설정(계정 메뉴). Figma 그대로: 메뉴 3개, 로그아웃, 회원 탈퇴 */
export function SettingsScreen() {
  const { data: me } = useQuery(meQueries.detail());
  const logout = useLogout();

  return (
    <>
      <TopBar leading="none" title="설정" />
      <ScreenBody>
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
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
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
      </ScreenBody>
    </>
  );
}
