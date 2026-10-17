"use client";

import { useQuery } from "@tanstack/react-query";
import { handoverQueries } from "@/entities/handover";
import { FullScreenLoading } from "@/features/auth";
import { AcceptHandoverForm, UnavailableCard } from "@/features/handover";

/** SCR-T03. 카드를 쓸 수 없으면(만료·취소·먼저 등록됨) U8과 같은 화면 */
export function AcceptHandoverScreen({ code }: { code: string }) {
  const { data, isPending, isError } = useQuery(handoverQueries.preview(code));

  if (isPending) return <FullScreenLoading />;
  if (isError || !data.pet || data.status !== "unused") return <UnavailableCard loggedIn />;
  return <AcceptHandoverForm preview={{ ...data, pet: data.pet }} />;
}
