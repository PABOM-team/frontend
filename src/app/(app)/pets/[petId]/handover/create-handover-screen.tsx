"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound, useParams } from "next/navigation";
import { petQueries } from "@/entities/pet";
import { FullScreenLoading } from "@/features/auth";
import { CreateHandoverFlow } from "@/features/handover";
import { getHttpStatus } from "@/shared/api/errors";
import { LoadError } from "@/shared/ui/display";
import { Screen } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

export function CreateHandoverScreen() {
  const { petId } = useParams<{ petId: string }>();
  const { data, isPending, isError, error, refetch } = useQuery(petQueries.detail(petId));

  if (isPending) return <FullScreenLoading />;
  // 없는 개체는 E01, 그 밖의 실패는 C1-2
  if (isError && getHttpStatus(error) === 404) notFound();
  if (isError) {
    return (
      <Screen>
        <TopBar title="인계 카드 만들기" fallbackHref="/pets" />
        <LoadError className="flex-1 justify-center" onRetry={() => refetch()} />
      </Screen>
    );
  }
  return <CreateHandoverFlow detail={data} />;
}
