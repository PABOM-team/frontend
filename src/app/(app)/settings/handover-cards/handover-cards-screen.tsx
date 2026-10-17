"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import { handoverQueries } from "@/entities/handover";
import { copyText, downloadQr } from "@/features/handover";
import { handoverApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query-keys";
import { HANDOVER_STATUS_LABEL, type HandoverCard } from "@/shared/domain/handover";
import { formatMonthDay, ymdOf } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Avatar, Badge, Skeleton, StateMessage } from "@/shared/ui/display";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { toast } from "@/shared/ui/toast";
import { TopBar } from "@/shared/ui/top-bar";

function scopeLine(card: HandoverCard) {
  return [
    "기본 정보",
    "분양일",
    card.scope.routines ? "체크 리스트" : null,
    card.scope.recordWeeks ? `최근 ${card.scope.recordWeeks}주 기록` : null,
    card.scope.photos ? "사진" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** SCR-T04 보낸 인계 카드 관리 (2차). 링크 복사·QR·취소는 사용 전 카드만 */
export function HandoverCardsScreen() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery(handoverQueries.list());
  const [qrCard, setQrCard] = useState<HandoverCard | null>(null);
  const [canceling, setCanceling] = useState<HandoverCard | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const cancel = useMutation({
    mutationFn: (card: HandoverCard) => handoverApi.cancel(card.code),
    onSuccess: () => {
      setCanceling(null);
      toast("카드를 취소했어요. 받는 분에게 내용이 보이지 않아요.");
    },
    onError: (error) => toast(getErrorMessage(error, "취소하지 못했어요.")),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.handoverCards }),
  });

  return (
    <Screen>
      <TopBar title="보낸 인계 카드" fallbackHref="/settings" />
      <ScreenBody className="space-y-3">
        {isPending ? (
          <Skeleton className="h-32" />
        ) : isError ? (
          <StateMessage
            title="카드를 불러오지 못했어요"
            action={{ label: "다시 시도", onClick: () => refetch() }}
          />
        ) : data.length === 0 ? (
          <StateMessage
            icon={null}
            className="pt-24"
            title="보낸 인계 카드가 없어요"
            description="개체 상세의 ⋯ 메뉴에서 인계 카드를 만들 수 있어요."
          />
        ) : (
          data.map((card) => (
            <article key={card.code} className="rounded-[14px] border-[1.3px] border-[#ddd] p-3.5">
              <div className="flex items-center gap-2">
                <Avatar size={28} />
                <h2 className="text-[15px] font-bold">{card.petName}</h2>
                <Badge tone={card.status === "unused" ? "gray-outline" : "gray"}>
                  {HANDOVER_STATUS_LABEL[card.status]}
                </Badge>
              </div>
              <p className="mt-1.5 text-[12.5px] text-[#666]">
                만든 날 {formatMonthDay(ymdOf(card.createdAt))} ·{" "}
                {formatMonthDay(ymdOf(card.expiresAt))}까지
              </p>
              <p className="text-[12px] text-[#888]">{scopeLine(card)}</p>
              {card.status === "unused" ? (
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => copyText(card.url, "링크를 복사했어요")}
                  >
                    링크 복사
                  </Button>
                  <Button variant="outline" size="md" onClick={() => setQrCard(card)}>
                    QR
                  </Button>
                  <Button variant="outline" size="md" onClick={() => setCanceling(card)}>
                    카드 취소
                  </Button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </ScreenBody>
      <Sheet
        open={Boolean(qrCard)}
        onOpenChange={(o) => !o && setQrCard(null)}
        title={qrCard ? `${qrCard.petName} 인계 카드 QR` : "QR"}
        footer={
          <Button
            size="xl"
            onClick={() => qrCard && downloadQr(qrRef.current, `pabom-${qrCard.code}.svg`)}
          >
            QR 저장
          </Button>
        }
      >
        <div
          ref={qrRef}
          className="mx-auto my-2 w-fit rounded-xl border border-[#ddd] bg-white p-3"
        >
          {qrCard ? <QRCodeSVG value={qrCard.url} size={180} /> : null}
        </div>
      </Sheet>
      <ConfirmDialog
        open={Boolean(canceling)}
        onOpenChange={(o) => !o && setCanceling(null)}
        title="인계 카드를 취소할까요?"
        description="취소하면 받는 분이 링크·QR을 열어도 내용이 보이지 않아요."
        confirmLabel="카드 취소"
        tone="danger"
        pending={cancel.isPending}
        onConfirm={() => canceling && cancel.mutate(canceling)}
      />
    </Screen>
  );
}
