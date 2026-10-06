"use client";

import { usePushSubscription } from "@/features/push-notification";
import { Button } from "@/shared/ui/button";

export function NotificationSetting() {
  const { status, subscribe, unsubscribe } = usePushSubscription();

  return (
    <div className="space-y-2 rounded-xl border p-4">
      <h2 className="font-semibold">관리 일정 알림</h2>
      {status === "needs-install" && (
        <p className="text-sm text-muted-foreground">
          iPhone에서는 공유 버튼에서 &lsquo;홈 화면에 추가&rsquo;를 한 뒤에 알림을 받을 수 있어요.
        </p>
      )}
      {status === "unsupported" && (
        <p className="text-sm text-muted-foreground">이 브라우저는 알림을 지원하지 않아요.</p>
      )}
      {status === "denied" && (
        <p className="text-sm text-muted-foreground">
          브라우저 설정에서 알림 권한을 허용해 주세요.
        </p>
      )}
      {status === "idle" && <Button onClick={subscribe}>알림 받기</Button>}
      {status === "subscribed" && (
        <Button variant="outline" onClick={unsubscribe}>
          알림 끄기
        </Button>
      )}
    </div>
  );
}
