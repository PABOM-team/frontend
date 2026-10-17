"use client";

import { addDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { Pet } from "@/shared/domain/pet";
import { fromYmd, toYmd } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Avatar } from "@/shared/ui/display";

/** 주간 달력 (Figma 주간 캘린더). 기록·할 일이 있는 날에 점 */
export function WeekStrip({
  weekStart,
  selected,
  today,
  marked,
  onSelect,
}: {
  weekStart: string;
  selected: string;
  today: string;
  marked: Set<string>;
  onSelect: (ymd: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => toYmd(addDays(fromYmd(weekStart), i)));

  return (
    <ol className="grid grid-cols-7">
      {days.map((ymd) => {
        const isToday = ymd === today;
        const isSelected = ymd === selected;
        const date = fromYmd(ymd);
        return (
          <li key={ymd}>
            <button
              type="button"
              onClick={() => onSelect(ymd)}
              aria-pressed={isSelected}
              aria-label={format(date, "M월 d일 EEEE", { locale: ko })}
              className={cn(
                "mx-auto flex w-full max-w-[51px] flex-col items-center gap-0.5 rounded-[10px] py-1",
                isToday && "bg-primary text-white",
                isSelected && !isToday && "bg-primary-soft text-primary",
              )}
            >
              <span
                className={cn(
                  "text-[11px]",
                  isToday ? "text-white" : isSelected ? "text-primary" : "text-[#888]",
                )}
              >
                {format(date, "EEEEE", { locale: ko })}
              </span>
              <span className="text-[15px] font-medium">{format(date, "d")}</span>
              <span
                aria-hidden
                className={cn(
                  "size-[5px] rounded-full",
                  marked.has(ymd) ? (isToday ? "bg-white" : "bg-[#bbb]") : "bg-transparent",
                )}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** 개체 고르기 줄 (전체 · 개체들 · 추가). 남은 할 일이 있는 개체에 빨간 점 */
export function PetFilterRow({
  pets,
  selected,
  onSelect,
  showDots,
}: {
  pets: Pet[];
  selected: string | null;
  onSelect: (petId: string | null) => void;
  showDots: boolean;
}) {
  const item = "flex w-14 shrink-0 flex-col items-center gap-1.5";
  const label = (active: boolean) =>
    cn("max-w-full truncate text-[11.5px]", active ? "font-bold text-primary" : "text-[#888]");

  return (
    <div className="-mx-4 scrollbar-none flex gap-3 overflow-x-auto px-4">
      {pets.length > 0 ? (
        <button
          type="button"
          className={item}
          onClick={() => onSelect(null)}
          aria-pressed={selected === null}
        >
          <span
            className={cn(
              "flex size-[52px] items-center justify-center rounded-full bg-[#e8e8e8] text-[11.5px] text-[#555]",
              selected === null && "ring-[2.5px] ring-primary",
            )}
          >
            전체
          </span>
          <span className={label(selected === null)}>전체</span>
        </button>
      ) : null}
      {pets.map((pet) => (
        <button
          key={pet.id}
          type="button"
          className={item}
          onClick={() => onSelect(pet.id)}
          aria-pressed={selected === pet.id}
        >
          <span className="relative">
            <Avatar
              src={pet.photoUrl}
              size={52}
              className={cn(selected === pet.id && "border-0 ring-[2.5px] ring-primary")}
            />
            {showDots && pet.todayRemaining > 0 ? (
              <span
                aria-label="남은 할 일 있음"
                className="absolute top-0.5 right-0.5 size-2 rounded-full border border-white bg-[#e5484d]"
              />
            ) : null}
          </span>
          <span className={label(selected === pet.id)}>{pet.name}</span>
        </button>
      ))}
      <Link href="/pets/new" className={item}>
        <span className="flex size-[52px] items-center justify-center rounded-full border-[1.5px] border-dashed border-[#bbb] text-[#888]">
          <Plus className="size-5" />
        </span>
        <span className={label(false)}>추가</span>
      </Link>
    </div>
  );
}
