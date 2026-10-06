"use client";

import { SerwistProvider } from "@serwist/next/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";
import { getQueryClient } from "@/shared/api/query-client";
import { MockProvider } from "./mock-provider";

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    // 개발 중에는 MSW 워커와 충돌하지 않게 Serwist 서비스 워커를 끈다
    <SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV === "development"}>
      <QueryClientProvider client={queryClient}>
        <MockProvider>{children}</MockProvider>
        <ReactQueryDevtools buttonPosition="top-right" />
      </QueryClientProvider>
    </SerwistProvider>
  );
}
