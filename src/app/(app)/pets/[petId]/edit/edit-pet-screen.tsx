"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { FullScreenLoading } from "@/features/auth";
import { petQueries } from "@/entities/pet";
import { EditPetForm } from "@/features/pet-form";
import { DeletePetDialog } from "@/features/pet-lifecycle";
import { StateMessage } from "@/shared/ui/display";
import { Screen } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-P05 개체 정보 수정·삭제 */
export function EditPetScreen() {
  const { petId } = useParams<{ petId: string }>();
  const router = useRouter();
  const { data, isPending, isError } = useQuery(petQueries.detail(petId));
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isPending) return <FullScreenLoading />;
  if (isError) {
    return (
      <Screen>
        <TopBar leading="close" title="개체 정보 수정" fallbackHref="/pets" />
        <StateMessage
          className="flex-1 justify-center"
          title="개체를 찾을 수 없어요"
          action={{ label: "내 개체로 가기", onClick: () => router.replace("/pets") }}
        />
      </Screen>
    );
  }

  return (
    <>
      <EditPetForm key={data.pet.id} pet={data.pet} onDelete={() => setDeleteOpen(true)} />
      <DeletePetDialog pet={data.pet} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
