import { queryOptions } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { todayApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import { formatInterval } from "@/shared/domain/care";
import type { Task } from "@/shared/domain/today";
import { formatMonthDay, formatTime, todayYmd } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/display";
import { Menu, type MenuItem } from "@/shared/ui/menu";

export const todayQueries = {
  byDate: (date: string, petId?: string) =>
    queryOptions({
      queryKey: queryKeys.todayAt(date, petId),
      queryFn: () => todayApi.get(date, petId),
    }),
};

function TaskBadge({ task }: { task: Task }) {
  if (task.state === "skipped") return <Badge tone="gray-outline">건너뜀</Badge>;
  if (task.originalDueOn && (task.state === "todo" || task.state === "planned")) {
    return <Badge tone="blue-outline">미룸</Badge>;
  }
  if (task.state !== "todo") return null;
  if (task.overdueDays > 0) return <Badge tone="black">{task.overdueDays}일 지남</Badge>;
  return <Badge>오늘</Badge>;
}

function taskSubline(task: Task) {
  const interval = formatInterval(task.intervalDays);
  if (task.state === "done" && task.record) {
    return `${interval} · ${formatTime(task.record.occurredAt)} 완료`;
  }
  if (task.state === "skipped") {
    return [interval, task.record?.skipReason].filter(Boolean).join(" · ");
  }
  if (task.originalDueOn) {
    // 앞 날짜(U1)에서는 그날로 미뤄진 것이니 '원래 날짜'만, 오늘 이후로 옮겨 온 할 일은 화살표까지 (D1)
    if (task.state === "planned") return `원래 ${formatMonthDay(task.originalDueOn)} · ${interval}`;
    const to = task.dueOn === todayYmd() ? "오늘" : formatMonthDay(task.dueOn);
    return `원래 ${formatMonthDay(task.originalDueOn)} → ${to} · ${interval}`;
  }
  return interval;
}

/**
 * 할 일 카드 (D1): 할 일 · 미룸 · 완료 · 건너뜀 4상태 + 앞 날짜(planned).
 * 체크 동그라미는 할 일일 때만 누를 수 있다.
 */
export function TaskCard({
  task,
  onCheck,
  onOpen,
  menu,
  checking,
}: {
  task: Task;
  onCheck?: () => void;
  onOpen?: () => void;
  menu?: MenuItem[];
  checking?: boolean;
}) {
  const finished = task.state === "done" || task.state === "skipped";

  return (
    <article className="flex items-center gap-2.5 rounded-[14px] border-[1.3px] border-[#ddd] bg-background py-2.5 pr-1 pl-3">
      <CheckCircle task={task} onCheck={onCheck} checking={checking} />
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className="flex min-w-0 flex-1 flex-col gap-0.5 py-1 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Badge tone="blue" className={cn(finished && "opacity-60")}>
            {task.petName}
          </Badge>
          <span
            className={cn(
              "truncate text-[15px] font-bold",
              task.state === "done" ? "text-[#999]" : "text-foreground",
            )}
          >
            {task.title}
          </span>
          <TaskBadge task={task} />
        </span>
        <span
          className={cn(
            "truncate text-[12.5px]",
            task.state === "done" ? "text-[#aaa]" : "text-[#777]",
          )}
        >
          {taskSubline(task)}
        </span>
      </button>
      {menu && menu.length ? (
        <Menu items={menu} label={`${task.title} 메뉴`} />
      ) : (
        <span className="w-2" />
      )}
    </article>
  );
}

function CheckCircle({
  task,
  onCheck,
  checking,
}: {
  task: Task;
  onCheck?: () => void;
  checking?: boolean;
}) {
  if (task.state === "done") {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Check className="size-4" strokeWidth={3} aria-label="완료" />
      </span>
    );
  }
  if (task.state === "skipped") {
    return (
      <span
        aria-label="건너뜀"
        className="size-7 shrink-0 rounded-full border-[1.8px] border-dashed border-[#aaa]"
      />
    );
  }
  if (task.state === "planned") {
    return (
      <span
        aria-label="예정"
        className="size-7 shrink-0 rounded-full border-[1.5px] border-[#ccc] bg-[#f3f3f3]"
      />
    );
  }
  return (
    <button
      type="button"
      aria-label={`${task.petName} ${task.title} 완료 체크`}
      onClick={onCheck}
      disabled={checking}
      className={cn(
        "size-7 shrink-0 rounded-full border-[1.8px] border-[#222] transition-colors hover:bg-primary-soft",
        checking && "animate-pulse border-primary",
      )}
    />
  );
}
