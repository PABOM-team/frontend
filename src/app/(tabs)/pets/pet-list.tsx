"use client";

import { useQuery } from "@tanstack/react-query";
import { PetCard, petQueries } from "@/entities/pet";

export function PetList() {
  const { data, isPending, isError } = useQuery(petQueries.list());

  if (isPending) return <p className="text-sm text-muted-foreground">불러오는 중…</p>;
  if (isError) return <p className="text-sm text-destructive">개체 목록을 불러오지 못했어요.</p>;
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">등록된 개체가 없어요.</p>;
  }

  return (
    <ul className="space-y-2">
      {data.map((pet) => (
        <li key={pet.id}>
          <PetCard pet={pet} />
        </li>
      ))}
    </ul>
  );
}
