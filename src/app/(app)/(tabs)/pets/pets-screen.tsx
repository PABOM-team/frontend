"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { AddPetCard, PetCard, petQueries } from "@/entities/pet";
import { stageName, useSpeciesMap } from "@/entities/species";
import { Skeleton, StateMessage } from "@/shared/ui/display";
import { Menu } from "@/shared/ui/menu";
import { ScreenBody } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-P01 내 개체 목록. 지금 키우는 개체만 보여 준다 */
export function PetsScreen() {
  const router = useRouter();
  const species = useSpeciesMap();
  const { data, isPending, isError, refetch } = useQuery(petQueries.list("active"));

  return (
    <>
      <TopBar
        leading="none"
        title="내 개체"
        trailing={
          <Menu
            label="개체 메뉴"
            items={[
              { label: "함께했던 개체 목록 보기", onSelect: () => router.push("/pets/archived") },
            ]}
          />
        }
      />
      <ScreenBody className="space-y-3">
        {isPending ? (
          <>
            <Skeleton className="h-[94px]" />
            <Skeleton className="h-[94px]" />
          </>
        ) : isError ? (
          <StateMessage
            compact
            icon={<span className="text-[17px] font-bold">!</span>}
            title="불러오지 못했어요"
            description="인터넷 연결을 확인하고 다시 시도해 주세요."
            action={{ label: "다시 불러오기", onClick: () => refetch(), variant: "outline" }}
            className="pt-32"
          />
        ) : data.length === 0 ? (
          <StateMessage
            compact
            icon={<Plus className="size-5" />}
            title="아직 등록한 개체가 없어요"
            description="개체를 등록하면 체크 리스트와 오늘 할 일이 생겨요."
            action={{ label: "개체 등록하기", onClick: () => router.push("/pets/new") }}
            className="pt-32"
          />
        ) : (
          <>
            {data.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                href={`/pets/${pet.id}`}
                stageName={stageName(species.get(pet.speciesId), pet.lifeStageCode)}
              />
            ))}
            <AddPetCard href="/pets/new" />
          </>
        )}
      </ScreenBody>
    </>
  );
}
