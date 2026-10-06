"use client";

import { useEffect } from "react";
import { worker } from "./browser";

// StrictMode에서 effect가 두 번 돌아도 워커는 한 번만 시작한다
let starting: Promise<unknown> | undefined;

/** 브라우저에서만 로드된다 (mock-provider에서 ssr: false로 불러옴) */
export default function MswStarter({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    starting ??= worker.start({ onUnhandledFrame: "bypass" });
    starting.then(onReady);
  }, [onReady]);

  return null;
}
