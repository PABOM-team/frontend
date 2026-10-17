"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { FullScreenLoading } from "@/features/auth";
import { petQueries } from "@/entities/pet";
import { EditPetForm } from "@/features/pet-form";
import { DeletePetDialog } from "@/features/pet-lifecycle";
import { getHttpStatus } from "@/shared/api/errors";
import { LoadError } from "@/shared/ui/display";
import { Screen } from "@/shared/ui/screen";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-P05 개체 정보 수정·삭제 */
export function EditPetScreen() {
  const { petId } = useParams<{ petId: string }>();
  const { data, isPending, isError, error, refetch } = useQuery(petQueries.detail(petId));
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isPending) return <FullScreenLoading />;
  // 없는 개체는 E01, 그 밖의 실패는 C1-2
  if (isError && getHttpStatus(error) === 404) notFound();
  if (isError) {
    return (
      <Screen>
        <TopBar leading="close" title="개체 정보 수정" fallbackHref="/pets" />
        <LoadError className="flex-1 justify-center" onRetry={() => refetch()} />
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
