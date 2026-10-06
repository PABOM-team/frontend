import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { getOccurrences } from "./routine";

const fmt = (dates: Date[]) => dates.map((d) => format(d, "yyyy-MM-dd"));

describe("getOccurrences", () => {
  it("시작일이 구간 안에 있으면 시작일부터 간격대로 나열한다", () => {
    const result = getOccurrences(
      { intervalDays: 3, startDate: "2026-10-01", enabled: true },
      new Date(2026, 9, 1),
      new Date(2026, 9, 10),
    );
    expect(fmt(result)).toEqual(["2026-10-01", "2026-10-04", "2026-10-07", "2026-10-10"]);
  });

  it("시작일이 구간보다 앞이면 구간 안의 첫 회차부터 계산한다", () => {
    const result = getOccurrences(
      { intervalDays: 7, startDate: "2026-09-01", enabled: true },
      new Date(2026, 9, 1),
      new Date(2026, 9, 31),
    );
    expect(fmt(result)).toEqual(["2026-10-06", "2026-10-13", "2026-10-20", "2026-10-27"]);
  });

  it("비활성 루틴은 비어 있다", () => {
    expect(
      getOccurrences(
        { intervalDays: 1, startDate: "2026-10-01", enabled: false },
        new Date(2026, 9, 1),
        new Date(2026, 9, 5),
      ),
    ).toEqual([]);
  });
});
