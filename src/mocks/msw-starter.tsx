"use client";

import { useEffect } from "react";
import { network, removeLegacyWorker } from "./browser";
import { resetDb } from "./db";

// StrictMode에서 effect가 두 번 돌아도 목업은 한 번만 켠다
let starting: Promise<unknown> | undefined;

declare global {
  interface Window {
    /** 개발용. 화면에는 두지 않고 브라우저 콘솔에서 pabomMock.reset()으로 목업 데이터를 처음 상태로 */
    pabomMock?: { reset: () => void };
  }
}

/** 브라우저에서만 로드된다 (mock-provider에서 ssr: false로 불러옴) */
export default function MswStarter({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    starting ??= Promise.all([network.enable(), removeLegacyWorker().catch(() => undefined)]).then(
      () => {
        window.pabomMock = {
          reset: () => {
            resetDb();
            sessionStorage.clear();
            // 메모리 상태까지 비우려고 페이지를 새로 연다
            window.history.replaceState(null, "", "/welcome");
            window.location.reload();
          },
        };
        console.info("[MSW] 목업 API를 켰어요. 데이터를 처음으로 되돌리려면 pabomMock.reset()");
      },
    );
    void starting.then(onReady);
  }, [onReady]);

  return null;
}
