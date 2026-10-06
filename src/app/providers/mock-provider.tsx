"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";
import { env } from "@/shared/config/env";

// msw/browser는 SSR 번들에서 resolve되지 않으므로 클라이언트에서만 불러온다
const MswStarter = dynamic(() => import("@/mocks/msw-starter"), { ssr: false });

/** NEXT_PUBLIC_API_MOCKING=enabled 이면 MSW 워커가 뜬 뒤에 화면을 그린다 (개발 전용) */
export function MockProvider({ children }: { children: ReactNode }) {
  const shouldMock = process.env.NODE_ENV === "development" && env.apiMocking;
  const [ready, setReady] = useState(!shouldMock);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <>
      {shouldMock && !ready && <MswStarter onReady={handleReady} />}
      {ready ? children : null}
    </>
  );
}
