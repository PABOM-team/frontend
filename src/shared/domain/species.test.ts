import { describe, expect, it } from "vitest";
import { lifeStageFromHatch } from "./species";

const species = {
  lifeStages: [
    { code: "hatchling", name: "해츨링", minAgeDays: 0, criteria: "" },
    { code: "juvenile", name: "준성체", minAgeDays: 90, criteria: "" },
    { code: "adult", name: "성체", minAgeDays: 365, criteria: "" },
  ],
};

describe("lifeStageFromHatch", () => {
  const today = new Date(2026, 9, 17);

  it("부화 후 일수로 단계를 고른다", () => {
    expect(lifeStageFromHatch(species, "2026-10-01", today)?.code).toBe("hatchling");
    expect(lifeStageFromHatch(species, "2026-03-02", today)?.code).toBe("juvenile");
    expect(lifeStageFromHatch(species, "2024-06-01", today)?.code).toBe("adult");
  });

  it("부화일을 모르면 null", () => {
    expect(lifeStageFromHatch(species, null, today)).toBeNull();
  });
});
