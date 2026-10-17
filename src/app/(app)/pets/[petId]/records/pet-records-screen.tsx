"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  endOfMonth,
  format,
  max as maxDate,
  min as minDate,
  startOfMonth,
  subMonths,
} from "date-fns";
import { Check, EllipsisVertical } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { petQueries } from "@/entities/pet";
import { recordQueries, RecordRow } from "@/entities/record";
import { EditRecordSheet } from "@/features/record-editor";
import type { CareRecord } from "@/shared/domain/record";
import { addDays, formatDayLabel, toYmd, ymdOf } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { LoadError, Spinner } from "@/shared/ui/display";
import { PhotoViewer } from "@/shared/ui/photo-viewer";
import { Screen, ScreenBody } from "@/shared/ui/screen";
import { Sheet } from "@/shared/ui/sheet";
import { TopBar } from "@/shared/ui/top-bar";

const PERIODS = [1, 2, 6, 12] as const;
type Period = (typeof PERIODS)[number];

/** SCR-P07 전체 기록. 기본 기간 최근 2개월 [제안], 달별로 나눠 보여 준다 */
export function PetRecordsScreen() {
  const { petId } = useParams<{ petId: string }>();
  const { data: detail } = useQuery(petQueries.detail(petId));
  const [period, setPeriod] = useState<Period>(2);
  const [periodOpen, setPeriodOpen] = useState(false);
  const today = new Date();
  const rangeStart = addDays(subMonths(today, period), 1);
  const months = Array.from({ length: period + 1 }, (_, i) =>
    startOfMonth(subMonths(today, period - i)),
  );
  const [monthIndex, setMonthIndex] = useState<number | null>(null);
  const selectedIndex = monthIndex ?? months.length - 1;
  const tablistRef = useRef<HTMLDivElement>(null);

  // 기간을 늘려 달 탭이 넘치면 고른 달이 화면 안에 오도록 가로로 스크롤한다
  useEffect(() => {
    const list = tablistRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (list && tab) list.scrollLeft = tab.offsetLeft - list.clientWidth + tab.offsetWidth;
  }, [period, selectedIndex]);
  const month = months[selectedIndex]!;
  const from = toYmd(maxDate([month, rangeStart]));
  const to = toYmd(minDate([endOfMonth(month), today]));

  return (
    <Screen>
      <TopBar
        title={detail ? `${detail.pet.name}의 전체 기록` : "전체 기록"}
        fallbackHref={`/pets/${petId}`}
        trailing={
          <button
            type="button"
            aria-label="조회 기간"
            onClick={() => setPeriodOpen(true)}
            className="flex size-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <EllipsisVertical className="size-5" />
          </button>
        }
      />
      <div className="shrink-0 px-4 pb-2">
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="달"
          className="relative scrollbar-none flex overflow-x-auto rounded-[10px] border border-input"
        >
          {months.map((m, i) => (
            <button
              key={m.toISOString()}
              type="button"
              role="tab"
              aria-selected={i === selectedIndex}
              onClick={() => setMonthIndex(i)}
              className={cn(
                "h-9 min-w-[64px] flex-1 text-[13.5px]",
                i > 0 && "border-l border-input",
                i === selectedIndex ? "bg-primary-soft font-bold text-primary" : "bg-background",
              )}
            >
              {format(m, "M월")}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-[#888]">
          최근 {period}개월 · {format(rangeStart, "M월 d일")} ~ {format(today, "M월 d일")}
        </p>
      </div>
      <MonthRecords
        key={`${from}-${to}`}
        petId={petId}
        from={from}
        to={to}
        isOldest={selectedIndex === 0}
        period={period}
        onExtend={() => setPeriodOpen(true)}
      />
      <Sheet
        open={periodOpen}
        onOpenChange={setPeriodOpen}
        title="조회 기간"
        description="고른 기간의 기록을 달별로 보여 줘요."
      >
        <ul>
          {PERIODS.map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => {
                  setPeriod(p);
                  setMonthIndex(null);
                  setPeriodOpen(false);
                }}
                className="flex h-12 w-full items-center justify-between border-b border-border text-[15px]"
              >
                최근 {p}개월
                {p === period ? <Check className="size-4 text-primary" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </Screen>
  );
}

function MonthRecords({
  petId,
  from,
  to,
  isOldest,
  period,
  onExtend,
}: {
  petId: string;
  from: string;
  to: string;
  isOldest: boolean;
  period: number;
  onExtend: () => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<CareRecord | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery(recordQueries.infinite({ petId, from, to, limit: 20 }));
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (query.isPending) {
    return (
      <div className="flex flex-1 justify-center pt-10">
        <Spinner />
      </div>
    );
  }
  if (query.isError) return <LoadError onRetry={() => query.refetch()} />;

  const records = query.data.pages.flatMap((p) => p.items);
  const groups = new Map<string, CareRecord[]>();
  for (const record of records) {
    const day = ymdOf(record.occurredAt);
    groups.set(day, [...(groups.get(day) ?? []), record]);
  }

  return (
    <ScreenBody flush className="pt-0">
      {[...groups.entries()].map(([day, items]) => (
        <section key={day}>
          <h2 className="bg-[#f3f3f3] px-4 py-1.5 text-[13px] text-[#555]">
            {formatDayLabel(day)}
          </h2>
          <div className="px-4">
            {items.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                variant="list"
                onClick={() => setEditId(record.id)}
                onPhotoClick={() => setViewing(record)}
              />
            ))}
          </div>
        </section>
      ))}
      <div
        ref={sentinel}
        className="flex flex-col items-center py-5 text-center text-[12px] text-[#888]"
      >
        {isFetchingNextPage ? (
          <Spinner />
        ) : !hasNextPage && isOldest ? (
          <p>
            최근 {period}개월 기록을 모두 봤어요 ·{" "}
            <button type="button" className="font-medium text-primary" onClick={onExtend}>
              기간 늘리기
            </button>
          </p>
        ) : null}
      </div>
      <EditRecordSheet recordId={editId} onOpenChange={(open) => !open && setEditId(null)} />
      <PhotoViewer
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && setViewing(null)}
        photos={viewing?.photos ?? []}
        caption={
          viewing ? <p className="font-bold">{formatDayLabel(ymdOf(viewing.occurredAt))}</p> : null
        }
      />
    </ScreenBody>
  );
}
