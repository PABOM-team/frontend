"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Segmented } from "@/shared/ui/display";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

type Tab = "terms" | "privacy";

/** [미확정] 약관 원문은 11/20 확정 뒤 게시. 그 전까지 목차와 회색 막대로 자리만 잡는다 */
const DOCS: Record<Tab, { title: string; version: string; sections: string[] }> = {
  terms: {
    title: "이용약관",
    version: "시행일 2026-10-12 · 버전 v1.0 (예시)",
    sections: ["제1조 목적", "제2조 정의", "제3조 서비스 내용"],
  },
  privacy: {
    title: "개인정보 처리방침",
    version: "시행일 2026-10-12 · 버전 v1.0 (예시)",
    sections: ["1. 수집하는 정보", "2. 이용 목적", "3. 보관 기간과 파기"],
  },
};

export function TermsScreen() {
  const router = useRouter();
  const tab: Tab = useSearchParams().get("tab") === "privacy" ? "privacy" : "terms";
  const doc = DOCS[tab];

  return (
    <Screen>
      <TopBar title={doc.title} fallbackHref="/settings" />
      <ScreenBody>
        <Segmented
          label="문서"
          options={[
            { value: "terms", label: "이용약관" },
            { value: "privacy", label: "개인정보 처리방침" },
          ]}
          value={tab}
          onChange={(next) => router.replace(next === "privacy" ? "/terms?tab=privacy" : "/terms")}
        />
        <p className="mt-3 text-[12px] text-[#888]">{doc.version}</p>
        <nav className="mt-3 rounded-[10px] bg-[#f3f3f3] p-3 text-[13px]">
          <p className="mb-1 font-bold">목차</p>
          {doc.sections.map((s, i) => (
            <a key={s} href={`#sec-${i}`} className="block py-0.5 text-primary">
              {s}
            </a>
          ))}
        </nav>
        {doc.sections.map((s, i) => (
          <section key={s} id={`sec-${i}`} className="mt-5">
            <h2 className="mb-2.5 text-[14px] font-bold">{s}</h2>
            <div className="space-y-2" aria-label="원문 준비 중">
              {[100, 100, 100, 62].map((w, j) => (
                <div
                  key={j}
                  className="h-2.5 rounded-full bg-[#ececec]"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </section>
        ))}
        <p className="mt-6 text-[13px] font-medium text-primary">이전 버전 보기</p>
      </ScreenBody>
    </Screen>
  );
}
