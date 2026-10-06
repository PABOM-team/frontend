import { addDays, format, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "홈" };

// TODO: 날짜 중심 캘린더. 지난 날은 기록 보기, 앞으로의 날은 루틴 미리보기 (IA 5번 C안)
export default function HomePage() {
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(today, { weekStartsOn: 0 }), i),
  );

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">{format(today, "M월 d일 EEEE", { locale: ko })}</h1>
      <ol className="grid grid-cols-7 text-center text-sm">
        {week.map((day) => (
          <li key={day.toISOString()} className="space-y-1">
            <span className="block text-muted-foreground">
              {format(day, "EEEEE", { locale: ko })}
            </span>
            <span className="block">{format(day, "d")}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
