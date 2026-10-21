import { beforeEach, describe, expect, it } from "vitest";
import {
  authApi,
  meApi,
  petsApi,
  recordsApi,
  routinesApi,
  speciesApi,
  todayApi,
} from "@/shared/api/endpoints";
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
    expect(await meApi.get()).toMatchObject({
      id: 42,
      nickname: "파봄",
      status: "ACTIVE",
      petCount: { active: 0, ended: 0 },
    });
  });

  it("회원 탈퇴는 확인(confirm)을 보내야 하고, 탈퇴하면 내 정보를 못 불러온다", async () => {
    await login("kakao");
    expect(await meApi.get()).toMatchObject({ status: "ACTIVE", petCount: { active: 2 } });
    await meApi.withdraw();
    await expect(meApi.get()).rejects.toMatchObject({ response: { status: 401 } });
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
    // 카카오 회원(유나)의 콩이
    await expect(petsApi.get("1")).rejects.toMatchObject({ response: { status: 404 } });
  });

  it("종 목록은 MVP 종만, 모프는 백엔드 모프 이름으로 보여 준다", async () => {
    const species = await speciesApi.list();
    expect(species.map((s) => s.id)).toEqual(["crested_gecko", "leopard_gecko"]);
    expect(species[0]!.morphs).toContain("할리퀸");
  });

  it("개체는 백엔드 모양으로 주고받고, 화면에는 도메인 모양으로 보인다", async () => {
    await login("google");
    const pet = await petsApi.create({
      name: "모찌",
      speciesId: "leopard_gecko",
      morph: "맥스노우",
      sex: "female",
      hatchedOn: null,
      lifeStageCode: "juvenile",
      stageUncertain: true,
      acquiredOn: null,
      photoFileId: null,
    });
    expect(pet).toMatchObject({
      id: expect.stringMatching(/^\d+$/),
      speciesId: "leopard_gecko",
      morph: "맥스노우",
      sex: "female",
      lifeStageCode: "juvenile",
      lifeStageSource: "manual",
      stageUncertain: true,
    });

    // 목록에 없는 모프는 직접 입력으로 남는다
    const updated = await petsApi.update(pet, { morph: "슈퍼 맥스노우", stageUncertain: false });
    expect(updated).toMatchObject({ morph: "슈퍼 맥스노우", stageUncertain: false });
    expect(await petsApi.list()).toHaveLength(1);

    await petsApi.remove(pet.id);
    expect(await petsApi.list()).toHaveLength(0);
  });

  it("기록은 직접 추가·정정·삭제·복구할 수 있고, 오래된 revisionNo로 고치면 409", async () => {
    await login("kakao");
    const record = await recordsApi.create({
      petId: "1",
      careItem: "weight",
      occurredAt: new Date().toISOString(),
      weightG: 46.5,
      memo: "많이 컸어요",
    });
    expect(record).toMatchObject({ careItem: "weight", weightG: 46.5, method: "manual" });

    const fixed = await recordsApi.update(record, { memo: "조금 컸어요" });
    expect(fixed.memo).toBe("조금 컸어요");
    expect((await recordsApi.get(record.id)).revisions).toHaveLength(1);
    // 처음 받은 revisionNo로 또 고치면 다른 정정과 부딪힌다
    await expect(recordsApi.update(record, { memo: "또" })).rejects.toMatchObject({
      response: { status: 409 },
    });

    await recordsApi.remove(record.id);
    await expect(recordsApi.get(record.id)).rejects.toMatchObject({ response: { status: 404 } });
    expect((await recordsApi.restore(record.id)).id).toBe(record.id);
  });

  it("기록 목록은 50개씩 이어 받아 요청한 개수를 채운다", async () => {
    await login("kakao");
    const page = await recordsApi.list({ limit: 60 });
    expect(page.items).toHaveLength(60);
    const weights = await recordsApi.list({ petId: "1", careItem: "weight", limit: 5 });
    expect(weights.items.every((r) => r.careItem === "weight" && r.petId === "1")).toBe(true);
  });
});
