"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { petQueries } from "@/entities/pet";
import { meApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { clearSession } from "@/shared/api/session";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { InfoBox } from "@/shared/ui/display";
import { Checkbox } from "@/shared/ui/form";
import { Screen, ScreenBody, ScreenFooter } from "@/shared/ui/screen";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";

/** SCR-S02 회원 탈퇴. 확인 체크 전에는 버튼이 꺼져 있고, 누르면 최종 확인 창. 이유는 묻지 않음 [제안] */
export function WithdrawScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: pets } = useQuery(petQueries.list("active"));
  const [checked, setChecked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const withdraw = useMutation({
    mutationFn: meApi.withdraw,
    onSuccess: () => {
      clearSession();
      queryClient.clear();
      router.replace("/welcome");
      toast("탈퇴했어요. 그동안 함께해 주셔서 고마워요.");
    },
    onError: (error) => toast(getErrorMessage(error, "탈퇴하지 못했어요.")),
  });

  return (
    <Screen>
      <TopBar title="회원 탈퇴" fallbackHref="/settings" />
      <ScreenBody>
        <h2 className="text-[18px] font-bold">탈퇴하기 전에 확인해 주세요</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#555]">
          개체·기록·사진이 모두 삭제되고 되돌릴 수 없어요. 카카오·구글 계정 연결도 끊어져요.
        </p>
        <InfoBox className="mt-3 space-y-0.5 text-[12.5px]">
          <p>· 개체 {pets?.length ?? 0}마리와 기록</p>
          <p>· 사진</p>
          <p>· 보낸 인계 카드</p>
          <p>· 로그인 연결(카카오·구글)</p>
        </InfoBox>
        <label className="mt-6 flex items-center gap-2.5 text-[14px]">
          <Checkbox checked={checked} onCheckedChange={(on) => setChecked(on === true)} />위 내용을
          확인했어요
        </label>
      </ScreenBody>
      <ScreenFooter>
        <Button variant="danger" size="xl" disabled={!checked} onClick={() => setConfirmOpen(true)}>
          탈퇴하기
        </Button>
      </ScreenFooter>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="정말 탈퇴할까요?"
        description="모든 데이터가 24시간 안에 지워지고 되돌릴 수 없어요."
        confirmLabel="탈퇴"
        tone="danger"
        pending={withdraw.isPending}
        onConfirm={() => withdraw.mutate()}
      />
    </Screen>
  );
}
