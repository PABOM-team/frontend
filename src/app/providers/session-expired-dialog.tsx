"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onSessionExpired } from "@/shared/api/session";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

/** 어느 화면에서든 로그인이 끊기면 뜨는 창 (C5-2). 다시 로그인하면 보던 화면으로 돌아온다 */
export function SessionExpiredDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => onSessionExpired(() => setOpen(true)), []);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="로그인이 만료됐어요"
      description="다시 로그인하면 보던 화면으로 돌아와요."
      confirmLabel="다시 로그인"
      cancelLabel={null}
      onConfirm={() => {
        setOpen(false);
        queryClient.clear();
        router.replace(`/welcome?next=${encodeURIComponent(pathname)}`);
      }}
    />
  );
}
