"use client";

import { useQuery } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { handoverQueries } from "@/entities/handover";
import { FullScreenLoading } from "@/features/auth";
import { AcceptHandoverForm } from "@/features/handover";
import { StateMessage } from "@/shared/ui/display";
import { Screen } from "@/shared/ui/screen";

/** SCR-T03. 카드를 쓸 수 없으면(만료·먼저 수락됨) 일반 등록으로 안내 */
export function AcceptHandoverScreen({ code }: { code: string }) {
  const router = useRouter();
  const { data, isPending, isError } = useQuery(handoverQueries.preview(code));

  if (isPending) return <FullScreenLoading />;
  if (isError || !data.pet || data.status !== "unused") {
    return (
      <Screen className="justify-center">
        <StateMessage
          icon={<Ban className="size-5" />}
          title="이 인계 카드는 열 수 없어요"
          description={"기간이 지났거나, 보낸 분이 취소했거나,\n이미 다른 분이 등록했어요."}
          action={{ label: "직접 등록하기", onClick: () => router.replace("/pets/new") }}
          secondaryAction={{ label: "오늘로 가기", onClick: () => router.replace("/home") }}
        />
      </Screen>
    );
  }
  return <AcceptHandoverForm preview={{ ...data, pet: data.pet }} />;
}
