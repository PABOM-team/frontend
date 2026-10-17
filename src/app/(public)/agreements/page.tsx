import type { Metadata } from "next";
import { Suspense } from "react";
import { AgreementsScreen } from "./agreements-screen";

export const metadata: Metadata = { title: "약관 동의" };

export default function AgreementsPage() {
  return (
    <Suspense>
      <AgreementsScreen />
    </Suspense>
  );
}
