import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { recordsApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import { CARE_ITEM_LABEL, INTAKE_LABEL } from "@/shared/domain/care";
import type { CareRecord, RecordQuery } from "@/shared/domain/record";
import { formatTime } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Avatar, PhotoBox } from "@/shared/ui/display";

export const recordQueries = {
  list: (query: RecordQuery) =>
    queryOptions({
      queryKey: queryKeys.recordList(query),
      queryFn: () => recordsApi.list(query),
    }),
  infinite: (query: Omit<RecordQuery, "cursor">) =>
    infiniteQueryOptions({
      queryKey: [...queryKeys.recordList(query), "infinite"],
      queryFn: ({ pageParam }) => recordsApi.list({ ...query, cursor: pageParam ?? undefined }),
      initialPageParam: null as string | null,
      getNextPageParam: (last) => last.nextCursor,
    }),
  detail: (recordId: string) =>
    queryOptions({
      queryKey: queryKeys.record(recordId),
      queryFn: () => recordsApi.get(recordId),
    }),
};

/** 급여 · 일부 먹음 / 체중 · 45.0 g / 메모 */
export function describeRecord(
  record: Pick<CareRecord, "careItem" | "intake" | "weightG" | "photos" | "type">,
) {
  const parts: string[] = [CARE_ITEM_LABEL[record.careItem]];
  if (record.type === "skipped") parts.push("건너뜀");
  if (record.intake) parts.push(INTAKE_LABEL[record.intake]);
  if (record.weightG) parts.push(`${record.weightG.toFixed(1)} g`);
  if (record.photos.length) parts.push(`사진 ${record.photos.length}`);
  return parts.join(" · ");
}

export function recordMethodLabel(record: Pick<CareRecord, "method">) {
  return record.method === "routine" ? "할 일 체크" : "직접 기록";
}

/**
 * 기록 한 줄.
 * - day: 홈 지난 날짜 (개체 이름 + '고치기 ›')
 * - list: 전체 기록 (날짜 머리 아래, 사진이 있으면 썸네일·메모) · '›'
 * - list + prefix: 개체 상세 최근 기록 ('10월 5일 · 탈피 · 사진 1', 썸네일·메모 없음)
 */
export function RecordRow({
  record,
  variant,
  prefix,
  onClick,
  onPhotoClick,
}: {
  record: CareRecord;
  variant: "day" | "list";
  /** 줄 앞에 붙는 글 (개체 상세의 '10월 7일') */
  prefix?: string;
  onClick: () => void;
  onPhotoClick?: () => void;
}) {
  const compact = Boolean(prefix);
  const photo = compact ? undefined : record.photos[0];
  // 썸네일이 보이면 '사진 N'은 제목에서 뺀다
  const title =
    variant === "day"
      ? `${record.petName} · ${describeRecord({ ...record, photos: [] })}`
      : describeRecord(photo ? { ...record, photos: [] } : record);

  return (
    <div className="flex items-center gap-3 border-b border-border py-2.5">
      {variant === "day" || photo ? (
        photo ? (
          <button
            type="button"
            onClick={onPhotoClick}
            aria-label="사진 크게 보기"
            className="shrink-0"
          >
            <PhotoBox src={photo.url} />
          </button>
        ) : (
          <Avatar size={28} />
        )
      ) : null}
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[15px]", variant === "day" && "font-bold")}>
            {prefix ? `${prefix} · ` : null}
            {title}
          </span>
          {record.memo && !compact ? (
            <span className="block truncate text-[13px] text-[#555]">{record.memo}</span>
          ) : null}
          <span className="block text-[12px] text-[#888]">
            {recordMethodLabel(record)}
            {variant === "day" || !prefix ? ` · ${formatTime(record.occurredAt)}` : null}
          </span>
        </span>
        {variant === "day" ? (
          <span className="shrink-0 text-[13px] text-[#555]">고치기</span>
        ) : null}
        <ChevronRight className="size-4 shrink-0 text-[#aaa]" aria-hidden />
      </button>
    </div>
  );
}
