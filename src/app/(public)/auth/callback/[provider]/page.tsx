import type { Metadata } from "next";
import { Suspense } from "react";
import { FullScreenLoading } from "@/features/auth";
import { LoginCallback } from "./login-callback";

export const metadata: Metadata = { title: "로그인 중" };

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<FullScreenLoading />}>
      <LoginCallback />
    </Suspense>
  );
}
