import { beforeEach, describe, expect, it } from "vitest";
import { authApi, meApi, petsApi, recordsApi, routinesApi, todayApi } from "@/shared/api/endpoints";
import { clearSession, setAccessToken, setStoredAccount } from "@/shared/api/session";
import { todayYmd } from "@/shared/lib/date";
import { resetDb } from "./db";

/** 로그인 주소 → (카카오·구글 대신 목업이 넘겨 준) 인가 코드로 콜백 */
async function callback(provider: "kakao" | "google") {
  const { authorizationUrl } = await authApi.loginUrl(provider);
  const query = new URL(authorizationUrl).searchParams;
  return authApi.callback(provider, { code: query.get("code")!, state: query.get("state")! });
}

/** 새 회원이면 필수 약관에 동의해 가입까지 마친다 */
async function login(provider: "kakao" | "google") {
  const result = await callback(provider);
  if ("signupToken" in result) {
    const done = await meApi.agree(["TERMS", "PRIVACY", "AGE_14"], result.signupToken);
    setAccessToken(done.accessToken);
  } else {
    setAccessToken(result.accessToken);
  }
  return result;
}

describe("목업 API", () => {
  beforeEach(() => {
    resetDb();
    clearSession();
  });

  it("카카오는 기록이 있는 회원, 구글은 약관 동의 전 새 회원이다", async () => {
    expect((await callback("kakao")).user.status).toBe("ACTIVE");
    const google = await callback("google");
    expect(google.user.status).toBe("PENDING_TERMS");
    expect("signupToken" in google).toBe(true);
  });

  it("약관 동의는 가입 토큰으로 하고, 필수 약관이 빠지면 422, 다 쓴 토큰은 401", async () => {
    const google = await callback("google");
    if (!("signupToken" in google)) throw new Error("가입 토큰이 와야 한다");
    await expect(meApi.agree(["TERMS"], google.signupToken)).rejects.toMatchObject({
      response: { status: 422 },
    });
    const done = await meApi.agree(["TERMS", "PRIVACY", "AGE_14"], google.signupToken);
    expect(done.user.status).toBe("ACTIVE");
    await expect(
      meApi.agree(["TERMS", "PRIVACY", "AGE_14"], google.signupToken),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it("진짜 백엔드 access 토큰(JWT)도 받아서 그 회원의 빈 목업 계정을 만든다", async () => {
    const payload = btoa(JSON.stringify({ sub: "42", tokenType: "ACCESS" }));
    setStoredAccount({ id: 42, nickname: "파봄", provider: "google" });
    setAccessToken(`eyJhbGciOiJIUzI1NiJ9.${payload}.signature`);
    expect(await meApi.get()).toMatchObject({ id: "live-42", nickname: "파봄", petCount: 0 });
  });

  it("오늘 할 일은 지난 할 일을 먼저 보여 주고, 체크하면 완료로 바뀐다", async () => {
    await login("kakao");
    const today = await todayApi.get(todayYmd());
    const todo = today.items.filter((t) => t.state === "todo");
    expect(todo[0]).toMatchObject({ petName: "콩이", careItem: "misting", overdueDays: 1 });

    const record = await routinesApi.complete(todo[0]!.routineId, {});
    const after = await todayApi.get(todayYmd());
    expect(after.items.find((t) => t.routineId === todo[0]!.routineId)?.state).toBe("done");

    // 되돌리기 = 기록 삭제 → 다시 할 일
    await recordsApi.remove(record.id);
    const undone = await todayApi.get(todayYmd());
    expect(undone.items.find((t) => t.routineId === todo[0]!.routineId)?.state).toBe("todo");
  });

  it("같은 날 두 번 체크하면 409로 막는다", async () => {
    await login("kakao");
    const { items } = await todayApi.get(todayYmd());
    const feeding = items.find((t) => t.careItem === "feeding" && t.state === "todo")!;
    await routinesApi.complete(feeding.routineId, { intake: "all" });
    await expect(routinesApi.complete(feeding.routineId, {})).rejects.toMatchObject({
      response: { status: 409 },
    });
  });

  it("개체를 등록하면 기준표대로 일정이 생기고 첫 예정일은 오늘이다", async () => {
    await login("google");
    const pet = await petsApi.create({
      name: "모찌",
      speciesId: "crested_gecko",
      morph: null,
      sex: "unknown",
      hatchedOn: null,
      lifeStageCode: "adult",
      stageUncertain: false,
      acquiredOn: null,
      photoFileId: null,
    });
    const routines = await routinesApi.list(pet.id);
    expect(routines.map((r) => r.careItem).sort()).toEqual(
      ["cleaning", "feeding", "misting", "shed", "weight"].sort(),
    );
    expect(routines.every((r) => r.nextDueOn === todayYmd())).toBe(true);
  });

  it("남의 개체는 404로 존재를 숨긴다", async () => {
    await login("google");
    await expect(petsApi.get("p-kong")).rejects.toMatchObject({ response: { status: 404 } });
  });
});
