import type { Metadata } from "next";
import { Suspense } from "react";
import { WelcomeScreen } from "./welcome-screen";

export const metadata: Metadata = { title: "시작하기" };

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomeScreen />
    </Suspense>
  );
}
