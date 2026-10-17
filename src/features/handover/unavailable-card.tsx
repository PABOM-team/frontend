"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { StateMessage } from "@/shared/ui/display";
import { Screen } from "@/shared/ui/screen";

/**
 * U8 링크 사용 불가: 만료·취소·이미 사용을 한 화면으로 (T02·T03 공통).
 * '직접 등록하기'는 로그인했을 때만
 */
export function UnavailableCard({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  return (
    <Screen className="justify-center">
      <StateMessage
        icon={<Ban className="size-5" />}
        title="이 인계 카드는 열 수 없어요"
        description={"기간이 지났거나, 보낸 분이 취소했거나,\n이미 다른 분이 등록했어요."}
        action={{
          label: "파봄 시작하기",
          onClick: () => router.push(loggedIn ? "/home" : "/welcome"),
        }}
        secondaryAction={
          loggedIn ? { label: "직접 등록하기", onClick: () => router.push("/pets/new") } : undefined
        }
      />
    </Screen>
  );
}
