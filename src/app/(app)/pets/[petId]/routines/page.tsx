import type { Metadata } from "next";
import { Suspense } from "react";
import { RoutinesScreen } from "./routines-screen";

export const metadata: Metadata = { title: "체크 리스트" };

export default function RoutinesPage() {
  return (
    <Suspense>
      <RoutinesScreen />
    </Suspense>
  );
}
