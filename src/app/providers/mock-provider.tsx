"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";
import { env } from "@/shared/config/env";

// msw/browser는 SSR 번들에서 resolve되지 않으므로 클라이언트에서만 불러온다
const MswStarter = dynamic(() => import("@/mocks/msw-starter"), { ssr: false });

/**
 * NEXT_PUBLIC_API_MOCKING=enabled 이면 목업을 켠 뒤에 화면을 그린다.
 * 로컬 개발뿐 아니라 데모 서버·개발 서버 배포에서도 쓴다 (운영은 disabled)
 */
export function MockProvider({ children }: { children: ReactNode }) {
  const shouldMock = env.apiMocking;
  const [ready, setReady] = useState(!shouldMock);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <>
      {shouldMock && !ready && <MswStarter onReady={handleReady} />}
      {ready ? children : null}
    </>
  );
}
