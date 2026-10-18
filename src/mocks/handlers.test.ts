import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { apiBaseUrl } from "@/shared/api/client";
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
import { server } from "./node";

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

  it("종·모프는 로그인 없이 부르고, MVP 밖의 종(볼파이톤)은 목록에서 빠진다", async () => {
    const species = await speciesApi.list();
    expect(species.map((s) => [s.id, s.serverId])).toEqual([
      ["crested_gecko", 1],
      ["leopard_gecko", 2],
    ]);
    const morphs = await speciesApi.morphs(species[1]!.serverId);
    expect(morphs[0]).toMatchObject({ id: 8, code: "NORMAL", name: "노멀" });
    await expect(speciesApi.morphs(999)).rejects.toMatchObject({ response: { status: 404 } });
  });

  it("공개 API에는 access 토큰을 싣지 않는다", async () => {
    let authorization: string | null = "unset";
    server.use(
      http.get(`${apiBaseUrl}/species`, ({ request }) => {
        authorization = request.headers.get("Authorization");
        return HttpResponse.json({ resultType: "SUCCESS", success: { data: [] }, error: null });
      }),
    );
    setAccessToken("some-token");
    await speciesApi.list();
    expect(authorization).toBeNull();
  });

  it("개체 등록은 백엔드 본문(숫자 ID·대문자 값)으로 보내고 앱 개체로 받는다", async () => {
    await login("google");
    const pet = await petsApi.create({
      clientRequestId: "550e8400-e29b-41d4-a716-446655440000",
      speciesId: 1,
      name: " 모찌 ",
      morphIds: [2],
      customMorph: null,
      hatchedAt: null,
      adoptedAt: null,
      lifeStageId: 2,
      stageCertainty: "ESTIMATED",
      sex: "FEMALE",
      sexCertainty: "CONFIRMED",
      photoFileId: null,
    });
    expect(pet).toMatchObject({
      name: "모찌",
      speciesId: "crested_gecko",
      morph: "할리퀸",
      sex: "female",
      lifeStageCode: "juvenile",
      lifeStageSource: "manual",
      stageUncertain: true,
    });
    const detail = await petsApi.get(pet.id);
    expect(detail.pet).toEqual(pet);
  });

  it("개체 상세에 체크 리스트·최근 기록이 없어도 빈 목록으로 받는다", async () => {
    server.use(
      http.get(`${apiBaseUrl}/pets/12`, () =>
        HttpResponse.json({
          resultType: "SUCCESS",
          success: {
            data: {
              id: 12,
              speciesId: 2,
              name: "콩이",
              morphs: [],
              customMorph: "트라이컬러",
              hatchedAt: "2026-03-02",
              adoptedAt: null,
              lifeStageId: null,
              stageCertainty: "UNKNOWN",
              sex: "UNKNOWN",
              sexCertainty: "UNKNOWN",
              photoFileId: null,
              createdAt: "2026-10-18T07:52:18.222",
              updatedAt: "2026-10-18T07:52:18.222",
            },
          },
          error: null,
        }),
      ),
    );
    await login("google");
    const detail = await petsApi.get("12");
    expect(detail.routines).toEqual([]);
    expect(detail.recentRecords).toEqual([]);
    expect(detail.pet).toMatchObject({
      id: "12",
      speciesId: "leopard_gecko",
      morph: "트라이컬러",
      status: "active",
      lifeStageSource: "hatch",
      todayRemaining: 0,
    });
  });

  it("남의 개체는 404로 존재를 숨긴다", async () => {
    await login("google");
    await expect(petsApi.get("p-kong")).rejects.toMatchObject({ response: { status: 404 } });
  });
});
