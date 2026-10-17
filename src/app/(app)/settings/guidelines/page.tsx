import type { Metadata } from "next";
import { Suspense } from "react";
import { GuidelinesScreen } from "./guidelines-screen";

export const metadata: Metadata = { title: "관리 가이드라인" };

export default function GuidelinesPage() {
  return (
    <Suspense>
      <GuidelinesScreen />
    </Suspense>
  );
}
