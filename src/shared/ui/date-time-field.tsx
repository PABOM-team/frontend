"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { formatDateTime, timeOf, toYmd, withTime, ymdOf } from "@/shared/lib/date";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { FieldButton } from "./form";
import { Sheet } from "./sheet";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type Clock = { pm: boolean; hour: number; minute: number };

const toClock = (hhmm: string): Clock => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return { pm: h >= 12, hour: h % 12 === 0 ? 12 : h % 12, minute: m };
};

const fromClock = ({ pm, hour, minute }: Clock) =>
  `${String((hour % 12) + (pm ? 12 : 0)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

/** 시각 끝 숫자를 읽는 소리에 맞춘 조사: 8:30(삼십)으로, 8:02(이)로 */
const roParticle = (iso: string) => (/[036]$/.test(timeOf(iso)) ? "으로" : "로");

const wheel =
  "h-10 w-full appearance-none rounded-[8px] bg-background text-center text-[16px] font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

/**
 * 기록한 시각 칸 (D3 날짜 + 시각).
 * 지금까지만 고를 수 있고, 버튼에 고른 값을 그대로 보여 준다 (예: 10월 7일 (수) 오후 8:02로 고르기)
 */
export function DateTimeField({
  value,
  onChange,
  title = "기록한 시각",
}: {
  value: string;
  onChange: (iso: string) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(ymdOf(value));
  const [clock, setClock] = useState<Clock>(toClock(timeOf(value)));
  const draft = withTime(day, fromClock(clock));
  const future = new Date(draft) > new Date();

  return (
    <>
      <FieldButton
        icon={<CalendarIcon className="size-[18px]" />}
        onClick={() => {
          setDay(ymdOf(value));
          setClock(toClock(timeOf(value)));
          setOpen(true);
        }}
      >
        {formatDateTime(value)}
      </FieldButton>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        footer={
          <Button
            size="xl"
            disabled={future}
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            {`${formatDateTime(draft)}${roParticle(draft)} 고르기`}
          </Button>
        }
      >
        <Calendar value={day} onChange={setDay} max={toYmd(new Date())} />
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-[12px] bg-[#f3f3f3] p-2.5">
          <select
            aria-label="오전·오후"
            className={wheel}
            value={clock.pm ? "pm" : "am"}
            onChange={(e) => setClock({ ...clock, pm: e.target.value === "pm" })}
          >
            <option value="am">오전</option>
            <option value="pm">오후</option>
          </select>
          <select
            aria-label="시"
            className={wheel}
            value={clock.hour}
            onChange={(e) => setClock({ ...clock, hour: Number(e.target.value) })}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <select
            aria-label="분"
            className={wheel}
            value={clock.minute}
            onChange={(e) => setClock({ ...clock, minute: Number(e.target.value) })}
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-[12px] text-[#888]">지금보다 뒤 날짜·시각은 고를 수 없어요</p>
      </Sheet>
    </>
  );
}
