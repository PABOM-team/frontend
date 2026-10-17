"use client";

import { createContext, useContext } from "react";

/**
 * 시트·창·메뉴를 띄울 자리. 데스크톱에서도 모바일 화면 틀 안에만 뜨도록
 * AppShell이 화면 틀 안에 둔 요소를 넘겨준다.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer() {
  return useContext(PortalContainerContext) ?? undefined;
}
