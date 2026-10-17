"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { petQueries } from "@/entities/pet";
import { FullScreenLoading } from "@/features/auth";
import { CreateHandoverFlow } from "@/features/handover";
import { StateMessage } from "@/shared/ui/display";
import { Screen } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

export function CreateHandoverScreen() {
  const { petId } = useParams<{ petId: string }>();
  const router = useRouter();
  const { data, isPending, isError } = useQuery(petQueries.detail(petId));

  if (isPending) return <FullScreenLoading />;
  if (isError) {
    return (
      <Screen>
        <TopBar title="인계 카드 만들기" fallbackHref="/pets" />
        <StateMessage
          className="flex-1 justify-center"
          title="개체를 찾을 수 없어요"
          action={{ label: "내 개체로 가기", onClick: () => router.replace("/pets") }}
        />
      </Screen>
    );
  }
  return <CreateHandoverFlow detail={data} />;
}
