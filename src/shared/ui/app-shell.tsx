"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, type ReactNode } from "react";
import { PabomLogo } from "./pabom-logo";
import { PortalContainerContext } from "./portal";

/**
 * 모바일 웹앱 틀.
 * - 휴대폰: 화면 전체를 쓴다 (360~430px 기준)
 * - 태블릿·데스크톱: 가운데 430px 화면 틀, 넓으면 왼쪽에 파봄 소개를 띄운다
 * 시트·창·토스트는 portal 자리에 떠서 화면 틀 밖으로 나가지 않는다.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);

  return (
    <div className="min-h-dvh bg-shell md:flex md:justify-center lg:gap-20">
      <DesktopIntro />
      <div
        id="app-column"
        className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background md:mx-0 md:shadow-[0_0_24px_rgba(0,0,0,0.06)]"
      >
        <PortalContainerContext value={portal}>{children}</PortalContainerContext>
        <div
          ref={setPortal}
          className="pointer-events-none absolute inset-0 z-50 *:pointer-events-auto"
        />
      </div>
    </div>
  );
}

function DesktopIntro() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    // 서버 렌더와 맞추려고 주소는 마운트 뒤에 읽는다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(window.location.origin);
  }, []);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[344px] shrink-0 flex-col justify-center lg:flex">
      <div className="flex aspect-[344/400] flex-col items-center justify-center rounded-3xl bg-linear-to-b from-brand-from to-brand text-white shadow-[0_12px_40px_rgba(41,153,255,0.3)]">
        <PabomLogo size="lg" className="text-white" />
        <p className="mt-5 text-center text-[15px] leading-relaxed text-white/90">
          크레스티드 게코 · 레오파드 게코
          <br />
          관리 일정과 기록을 한곳에
        </p>
      </div>
      <div className="mt-8 flex items-center justify-between gap-6">
        <p className="text-[17px] leading-relaxed font-bold text-foreground">
          휴대폰으로 열면
          <br />
          홈 화면에 추가해
          <br />
          앱처럼 쓸 수 있어요
        </p>
        <div className="flex size-[124px] shrink-0 items-center justify-center rounded-xl bg-white p-2">
          {url ? <QRCodeSVG value={url} size={108} /> : null}
        </div>
      </div>
    </aside>
  );
}
