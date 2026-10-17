"use client";

import { useEffect } from "react";
import { network, removeLegacyWorker } from "./browser";

// StrictMode에서 effect가 두 번 돌아도 목업은 한 번만 켠다
let starting: Promise<unknown> | undefined;

/** 브라우저에서만 로드된다 (mock-provider에서 ssr: false로 불러옴) */
export default function MswStarter({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    starting ??= Promise.all([network.enable(), removeLegacyWorker().catch(() => undefined)]).then(
      () => console.info("[MSW] 목업 API를 켰어요 (fetch 가로채기)"),
    );
    void starting.then(onReady);
  }, [onReady]);

  return null;
}
