"use client";

import { useRouter } from "next/navigation";
import { StateMessage } from "@/shared/ui/display";
import { Screen } from "@/shared/ui/screen";

/** SCR-E01 없는 페이지. 남의 개체·기록도 같은 화면으로 보여 존재 여부를 숨긴다. 탭바 없음 */
export function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen className="justify-center">
      <StateMessage
        icon={null}
        title="페이지를 찾을 수 없어요"
        description="주소가 바뀌었거나 삭제된 정보예요."
        action={{ label: "홈 화면으로 가기 (오늘)", onClick: () => router.replace("/home") }}
      />
    </Screen>
  );
}

/** C5-3 오류 경계. 화면을 그리다 오류가 나면 이 화면으로 바뀐다 */
export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  const router = useRouter();
  return (
    <Screen className="justify-center">
      <StateMessage
        title="화면을 보여 주지 못했어요"
        description="잠시 뒤 다시 시도해 주세요."
        action={{ label: "새로고침", onClick: onRetry }}
        secondaryAction={{
          label: "홈 화면으로 가기 (오늘)",
          onClick: () => router.replace("/home"),
        }}
      />
    </Screen>
  );
}
