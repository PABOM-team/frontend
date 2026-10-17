import type { Metadata } from "next";
import { Suspense } from "react";
import { TermsScreen } from "./terms-screen";

export const metadata: Metadata = { title: "이용약관·개인정보 처리방침" };

/** SCR-S03. 로그인 없이 열린다 */
export default function TermsPage() {
  return (
    <Suspense>
      <TermsScreen />
    </Suspense>
  );
}
