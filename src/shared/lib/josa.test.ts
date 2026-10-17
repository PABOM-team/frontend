import { describe, expect, it } from "vitest";
import { josa } from "./josa";

describe("josa", () => {
  it("받침에 맞춰 조사를 붙인다", () => {
    expect(josa("콩이", "을/를")).toBe("콩이를");
    expect(josa("별", "을/를")).toBe("별을");
    expect(josa("분무", "은/는")).toBe("분무는");
    expect(josa("체중", "으로/로")).toBe("체중으로");
    expect(josa("탈피 확인", "을/를")).toBe("탈피 확인을");
  });
});
