"use client";

import { useQuery } from "@tanstack/react-query";
import { EndedPetCard, petQueries } from "@/entities/pet";
import { Skeleton, StateMessage } from "@/shared/ui/display";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-P08 함께했던 개체 목록. 탭바 없음 [제안] */
export function ArchivedPetsScreen() {
  const { data, isPending, isError, refetch } = useQuery(petQueries.list("ended"));

  return (
    <Screen>
      <TopBar title="함께했던 개체" fallbackHref="/pets" />
      <ScreenBody className="space-y-3">
        <p className="text-[13px] text-muted-foreground">
          함께했던 개체는 기록만 볼 수 있어요. 오늘 할 일에는 뜨지 않아요.
        </p>
        {isPending ? (
          <Skeleton className="h-[94px]" />
        ) : isError ? (
          <StateMessage
            title="목록을 불러오지 못했어요"
            action={{ label: "다시 시도", onClick: () => refetch() }}
          />
        ) : data.length === 0 ? (
          <StateMessage icon={null} title="함께했던 개체가 없어요" className="pt-24" />
        ) : (
          data.map((pet) => <EndedPetCard key={pet.id} pet={pet} href={`/pets/${pet.id}`} />)
        )}
      </ScreenBody>
    </Screen>
  );
}
