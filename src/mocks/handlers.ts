import { addDays, differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { delay, http, HttpResponse } from "msw";
import { apiBaseUrl } from "@/shared/api/client";
import { getStoredAccount } from "@/shared/api/session";
import { CARE_ITEM_LABEL, INTAKE_LABEL, type CareItem, type Intake } from "@/shared/domain/care";
import type { HandoverAcceptInput, HandoverPreview, HandoverScope } from "@/shared/domain/handover";
import type { PetCreateInput, PetStatusChangeInput, PetUpdateInput } from "@/shared/domain/pet";
import type { CompleteInput, RecordCreateInput, RecordUpdateInput } from "@/shared/domain/record";
import type { RoutineUpdateInput } from "@/shared/domain/routine";
import type { SpeciesId } from "@/shared/domain/species";
import { authProviderSchema } from "@/shared/domain/user";
import { careStandardTable, SPECIES_DATA } from "./data";
import { addRoutines, db, nextId, save, ymd, type DbCard, type DbRecord, type DbUser } from "./db";
import { buildToday, serializePet, serializeRecord, serializeRoutine, stageCodeOf } from "./logic";

const url = (path: string) => `${apiBaseUrl}${path}`;

/** 서버 오류 형식 {resultType:"FAIL", error:{code,message,details}}. 목업은 칸별 오류 fields도 준다 */
function fail(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json(
    {
      resultType: "FAIL",
      success: null,
      error: { code, message, details: null, fields, traceId: `mock-${Date.now()}` },
    },
    { status },
  );
}

/** 백엔드 공통 성공 응답 {resultType:"SUCCESS", success:{data}} */
function success(data: unknown) {
  return HttpResponse.json({ resultType: "SUCCESS", success: { data }, error: null });
}

/** 인계 카드 링크는 프론트 주소로 만든다 */
const appOrigin = () =>
  typeof location === "undefined" ? "http://localhost:3000" : location.origin;

const notFound = () => fail(404, "NOT_FOUND", "찾을 수 없어요.");

/** 실제 네트워크처럼 조금 기다린다 */
const wait = () => delay(process.env.NODE_ENV === "test" ? 0 : 250);

function currentUser(request: Request): DbUser | null {
  const header = request.headers.get("Authorization");
  if (db.session.token && header === `Bearer ${db.session.token}`) {
    return db.users.find((u) => u.id === db.session.userId) ?? null;
  }
  return liveUser(header);
}

/**
 * 로그인은 진짜 백엔드로 하고 나머지 API만 목업일 때(NEXT_PUBLIC_API_LIVE=auth).
 * 백엔드 access 토큰(JWT)의 sub(회원 번호)로 목업 회원을 찾고, 처음이면 빈 계정을 만든다.
 * 서명은 확인하지 않는다 (목업 전용)
 */
function liveUser(header: string | null): DbUser | null {
  const payload = header?.replace(/^Bearer /, "").split(".")[1];
  if (!payload) return null;
  let sub: string | undefined;
  try {
    sub = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).sub;
  } catch {
    return null;
  }
  if (!sub) return null;

  const id = `live-${sub}`;
  let user = db.users.find((u) => u.id === id);
  if (!user) {
    const account = getStoredAccount();
    const known = account?.id === Number(sub) ? account : null;
    user = {
      id,
      nickname: known?.nickname || `파봄 사용자${sub}`,
      provider: known?.provider ?? "kakao",
      status: "active",
      joinedAt: new Date().toISOString(),
      agreements: ["TERMS", "PRIVACY", "AGE_14"],
    };
    db.users.push(user);
    save();
  }
  return user;
}

/** 백엔드 회원 번호는 숫자라 목업 id를 숫자로 바꿔 준다 */
function accountId(user: DbUser) {
  const digits = user.id.replace(/\D/g, "");
  return digits
    ? Number(digits)
    : [...user.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 99991, 7);
}

const accountOf = (user: DbUser, status: "PENDING_TERMS" | "ACTIVE") => ({
  id: accountId(user),
  nickname: user.nickname,
  status,
});

/** 목업 가입 토큰. 약관 동의(/me/agreements)에서만 쓴다 */
const signupTokenOf = (user: DbUser) => `mock-signup-${user.id}`;

type Resolver = (args: {
  request: Request;
  params: Record<string, string>;
  user: DbUser;
}) => Response | Promise<Response>;

/** 로그인이 필요한 API. 토큰이 없거나 틀리면 401 → 클라이언트가 refresh 후 재시도 */
function authed(resolver: Resolver) {
  return async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return fail(401, "UNAUTHORIZED", "로그인이 필요해요.");
    const response = await resolver({ request, params: params as Record<string, string>, user });
    save();
    return response;
  };
}

const myPet = (user: DbUser, petId: string) =>
  db.pets.find((p) => p.id === petId && p.userId === user.id && !p.deletedAt);

const myRoutine = (user: DbUser, routineId: string) => {
  const routine = db.routines.find((r) => r.id === routineId);
  return routine && myPet(user, routine.petId) ? routine : undefined;
};

const myRecord = (user: DbUser, recordId: string) => {
  const record = db.records.find((r) => r.id === recordId);
  return record && myPet(user, record.petId) ? record : undefined;
};

function meOf(user: DbUser) {
  const pets = db.pets.filter((p) => p.userId === user.id && !p.deletedAt);
  return {
    id: accountId(user),
    nickname: user.nickname,
    status: user.status === "active" ? "ACTIVE" : "PENDING_TERMS",
    role: "USER",
    region: null,
    agreements: user.agreements.map((type) => ({
      type,
      version: "1.0",
      agreed: true,
      agreedAt: user.joinedAt,
    })),
    requiredAgreements: ["TERMS", "PRIVACY", "AGE_14"].map((type) => ({
      type,
      currentVersion: "1.0",
      required: true,
    })),
    needsReconsent: false,
    petCount: {
      active: pets.filter((p) => p.status === "active").length,
      ended: pets.filter((p) => p.status === "ended").length,
    },
    createdAt: user.joinedAt,
  };
}

function newToken() {
  db.session.token = `mock-token-${Math.random().toString(36).slice(2)}`;
  return db.session.token;
}

function petDetail(petId: string) {
  const pet = db.pets.find((p) => p.id === petId)!;
  return {
    pet: serializePet(pet),
    routines: db.routines.filter((r) => r.petId === petId).map(serializeRoutine),
    recentRecords: db.records
      .filter((r) => r.petId === petId && !r.deletedAt)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 5)
      .map(serializeRecord),
  };
}

function cardStatus(card: DbCard) {
  if (card.status === "unused" && new Date(card.expiresAt) < new Date()) return "expired" as const;
  return card.status;
}

function serializeCard(card: DbCard, origin: string) {
  const pet = db.pets.find((p) => p.id === card.petId);
  return {
    code: card.code,
    petId: card.petId,
    petName: pet?.name ?? "",
    scope: card.scope,
    status: cardStatus(card),
    createdAt: card.createdAt,
    expiresAt: card.expiresAt,
    url: `${origin}/share/${card.code}`,
  };
}

function summarize(record: Pick<DbRecord, "occurredAt" | "intake" | "weightG" | "memo">) {
  return [
    format(parseISO(record.occurredAt), "M/d HH:mm"),
    record.intake ? INTAKE_LABEL[record.intake] : null,
    record.weightG ? `${record.weightG}g` : null,
    record.memo ? `메모 ${record.memo.length}자` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * 인증·약관 동의 (백엔드에 이미 있는 API와 같은 모양).
 * NEXT_PUBLIC_API_LIVE에 auth를 넣으면 이 묶음은 빼고 진짜 백엔드로 보낸다 (browser.ts)
 */
export const authHandlers = [
  http.get(url("/auth/:provider/login-url"), async ({ params }) => {
    await wait();
    const provider = authProviderSchema.safeParse(params.provider);
    if (!provider.success) {
      return fail(400, "UNSUPPORTED_OAUTH_PROVIDER", "지원하지 않는 OAuth 제공자입니다.");
    }
    // 목업은 카카오·구글 화면을 건너뛰고 바로 로그인 처리 화면으로 보낸다
    const callback = new URL(`/auth/callback/${provider.data}`, appOrigin());
    callback.search = new URLSearchParams({
      code: `mock-${provider.data}`,
      state: "mock-state",
    }).toString();
    return success({ authorizationUrl: callback.toString() });
  }),

  http.get(url("/auth/:provider/callback"), async ({ params, request }) => {
    await wait();
    const parsed = authProviderSchema.safeParse(params.provider);
    if (!parsed.success) {
      return fail(400, "UNSUPPORTED_OAUTH_PROVIDER", "지원하지 않는 OAuth 제공자입니다.");
    }
    const query = new URL(request.url).searchParams;
    if (!query.get("code") || !query.get("state")) {
      return fail(400, "VALIDATION_FAILED", "요청값이 누락되었거나 올바르지 않습니다.");
    }
    const provider = parsed.data;
    // 목업 규칙: 카카오는 기록이 쌓인 기존 회원, 구글은 처음 가입하는 회원
    let user = db.users.find((u) => u.provider === provider);
    if (!user) {
      user = {
        id: nextId("u"),
        nickname: provider === "google" ? "서윤" : "파봄 사용자1024",
        provider,
        status: "pending_agreement",
        joinedAt: new Date().toISOString(),
        agreements: [],
      };
      db.users.push(user);
    }
    save();
    // 약관 동의 전이면 가입 토큰만 주고 refresh 세션은 만들지 않는다
    if (user.status === "pending_agreement") {
      return HttpResponse.json({
        signupToken: signupTokenOf(user),
        expiresIn: 600,
        isNewUser: true,
        user: accountOf(user, "PENDING_TERMS"),
      });
    }
    db.session.userId = user.id;
    const accessToken = newToken();
    save();
    return HttpResponse.json({
      accessToken,
      expiresIn: 1800,
      isNewUser: false,
      user: accountOf(user, "ACTIVE"),
    });
  }),

  http.post(url("/auth/refresh"), async () => {
    await wait();
    if (!db.session.userId) {
      return fail(401, "REFRESH_INVALID", "유효하지 않거나 만료된 리프레시 토큰입니다.");
    }
    const accessToken = newToken();
    save();
    return HttpResponse.json({ accessToken, expiresIn: 1800 });
  }),

  http.post(url("/auth/logout"), async () => {
    await wait();
    db.session = { userId: null, token: null };
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  // 가입 토큰으로 부른다. 동의가 끝나면 access 토큰을 주고 refresh 세션을 만든다
  http.post(url("/me/agreements"), async ({ request }) => {
    await wait();
    const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "");
    const user = db.users.find((u) => signupTokenOf(u) === token);
    if (!user || user.status !== "pending_agreement") {
      return fail(401, "INVALID_TOKEN", "유효하지 않거나 만료된 인증 토큰입니다.");
    }
    const { agreements } = (await request.json()) as {
      agreements: { type: string; version: string; agreed: boolean }[];
    };
    if (agreements.some((a) => a.version !== "1.0")) {
      return fail(409, "AGREEMENT_VERSION_MISMATCH", "약관 버전이 최신 버전과 일치하지 않습니다.");
    }
    const agreed = agreements.filter((a) => a.agreed).map((a) => a.type);
    if (!["TERMS", "PRIVACY", "AGE_14"].every((t) => agreed.includes(t))) {
      return fail(422, "REQUIRED_AGREEMENT_MISSING", "필수 약관에 모두 동의해야 합니다.");
    }
    user.agreements = agreed;
    user.status = "active";
    db.session.userId = user.id;
    const accessToken = newToken();
    save();
    return HttpResponse.json({ user: accountOf(user, "ACTIVE"), accessToken, expiresIn: 1800 });
  }),
];

/**
 * 내 정보·회원 탈퇴 (백엔드에 이미 있는 API와 같은 모양).
 * NEXT_PUBLIC_API_LIVE에 user를 넣으면 이 묶음은 빼고 진짜 백엔드로 보낸다 (browser.ts)
 */
export const userHandlers = [
  http.get(
    url("/users/me"),
    authed(({ user }) => success(meOf(user))),
  ),

  http.delete(
    url("/users/me"),
    authed(async ({ request, user }) => {
      const body = (await request.json().catch(() => null)) as { confirm?: boolean } | null;
      if (body?.confirm !== true) {
        return fail(422, "CONFIRM_REQUIRED", "회원 탈퇴 확인이 필요합니다.");
      }
      const petIds = new Set(db.pets.filter((p) => p.userId === user.id).map((p) => p.id));
      db.records = db.records.filter((r) => !petIds.has(r.petId));
      db.routines = db.routines.filter((r) => !petIds.has(r.petId));
      db.pets = db.pets.filter((p) => !petIds.has(p.id));
      db.cards = db.cards.filter((c) => c.userId !== user.id);
      db.files = db.files.filter((f) => f.ownerId !== user.id);
      db.users = db.users.filter((u) => u.id !== user.id);
      db.session = { userId: null, token: null };
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];

/** 백엔드에 아직 없는 API. 로그인이 진짜여도 목업이 답한다 */
export const appHandlers = [
  // ── 종·관리 기준 ────────────────────────────────────────
  http.get(url("/species"), async () => {
    await wait();
    return HttpResponse.json(SPECIES_DATA);
  }),

  http.get(url("/species/:speciesId/care-standards"), async ({ params }) => {
    await wait();
    const speciesId = params.speciesId as SpeciesId;
    if (!SPECIES_DATA.some((s) => s.id === speciesId)) return notFound();
    return HttpResponse.json(careStandardTable(speciesId));
  }),

  // ── 개체 ───────────────────────────────────────────────
  http.get(
    url("/pets"),
    authed(({ request, user }) => {
      const status = new URL(request.url).searchParams.get("status") ?? "active";
      const pets = db.pets
        .filter((p) => p.userId === user.id && !p.deletedAt && p.status === status)
        .sort((a, b) =>
          status === "ended"
            ? (b.endedOn ?? "").localeCompare(a.endedOn ?? "")
            : a.createdAt.localeCompare(b.createdAt),
        );
      return HttpResponse.json(pets.map(serializePet));
    }),
  ),

  http.post(
    url("/pets"),
    authed(async ({ request, user }) => {
      const input = (await request.json()) as PetCreateInput;
      if (!input.name?.trim()) {
        return fail(422, "VALIDATION", "입력한 값을 확인해 주세요.", {
          name: "이름을 입력해 주세요",
        });
      }
      const photo = db.files.find((f) => f.id === input.photoFileId);
      const pet = {
        id: nextId("p"),
        userId: user.id,
        name: input.name.trim(),
        speciesId: input.speciesId,
        morph: input.morph,
        sex: input.sex,
        hatchedOn: input.hatchedOn,
        manualStageCode: input.hatchedOn ? null : input.lifeStageCode,
        stageUncertain: !input.hatchedOn && Boolean(input.stageUncertain),
        acquiredOn: input.acquiredOn,
        photoUrl: photo?.url ?? null,
        status: "active" as const,
        endReason: null,
        endedOn: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };
      db.pets.push(pet);
      // 첫 예정일은 등록 당일 [제안]
      addRoutines(db, pet.id, pet.speciesId, stageCodeOf(pet), new Date());
      return HttpResponse.json(serializePet(pet), { status: 201 });
    }),
  ),

  http.get(
    url("/pets/:petId"),
    authed(({ params, user }) => {
      const pet = myPet(user, params.petId);
      // 남의 개체도 '찾을 수 없음'으로 보여 존재 여부를 숨긴다
      if (!pet) return notFound();
      return HttpResponse.json(petDetail(pet.id));
    }),
  ),

  http.patch(
    url("/pets/:petId"),
    authed(async ({ request, params, user }) => {
      const pet = myPet(user, params.petId);
      if (!pet) return notFound();
      const input = (await request.json()) as PetUpdateInput;
      const beforeStage = stageCodeOf(pet);

      if (input.name !== undefined) pet.name = input.name.trim();
      if (input.morph !== undefined) pet.morph = input.morph;
      if (input.sex !== undefined) pet.sex = input.sex;
      if (input.acquiredOn !== undefined) pet.acquiredOn = input.acquiredOn;
      if (input.hatchedOn !== undefined) {
        pet.hatchedOn = input.hatchedOn;
        if (input.hatchedOn) pet.manualStageCode = null;
      }
      if (input.lifeStageCode !== undefined && !pet.hatchedOn) {
        pet.manualStageCode = input.lifeStageCode;
      }
      if (input.stageUncertain !== undefined) {
        pet.stageUncertain = !pet.hatchedOn && input.stageUncertain;
      }
      if (input.photoFileId !== undefined) {
        pet.photoUrl = db.files.find((f) => f.id === input.photoFileId)?.url ?? null;
      }

      // 생애 단계가 바뀌면 직접 바꾸지 않은 주기를 새 단계 기준으로 다시 제안
      const afterStage = stageCodeOf(pet);
      if (afterStage !== beforeStage) {
        const fresh = { ...db, routines: [] as typeof db.routines };
        addRoutines(fresh, pet.id, pet.speciesId, afterStage, new Date());
        for (const routine of db.routines.filter((r) => r.petId === pet.id)) {
          const next = fresh.routines.find((r) => r.careItem === routine.careItem);
          if (!next) continue;
          const customized = routine.intervalDays !== routine.standardIntervalDays;
          routine.standardIntervalDays = next.standardIntervalDays;
          if (!customized) routine.intervalDays = next.intervalDays;
        }
      }
      return HttpResponse.json(serializePet(pet));
    }),
  ),

  http.delete(
    url("/pets/:petId"),
    authed(({ params, user }) => {
      const pet = myPet(user, params.petId);
      if (!pet) return notFound();
      pet.deletedAt = new Date().toISOString();
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  http.post(
    url("/pets/:petId/status-changes"),
    authed(async ({ request, params, user }) => {
      const pet = myPet(user, params.petId);
      if (!pet) return notFound();
      const input = (await request.json()) as PetStatusChangeInput;
      if (input.type === "end") {
        pet.status = "ended";
        pet.endReason = input.reason;
        pet.endedOn = input.date;
      } else {
        pet.status = "active";
        pet.endReason = null;
        pet.endedOn = null;
      }
      return HttpResponse.json(serializePet(pet));
    }),
  ),

  // ── 관리 일정 ───────────────────────────────────────────
  http.get(
    url("/pets/:petId/routines"),
    authed(({ params, user }) => {
      if (!myPet(user, params.petId)) return notFound();
      return HttpResponse.json(
        db.routines.filter((r) => r.petId === params.petId).map(serializeRoutine),
      );
    }),
  ),

  http.patch(
    url("/routines/:routineId"),
    authed(async ({ request, params, user }) => {
      const routine = myRoutine(user, params.routineId);
      if (!routine) return notFound();
      const input = (await request.json()) as RoutineUpdateInput;
      if (input.intervalDays !== undefined) {
        if (
          !Number.isInteger(input.intervalDays) ||
          input.intervalDays < 1 ||
          input.intervalDays > 365
        ) {
          return fail(422, "VALIDATION", "입력한 값을 확인해 주세요.", {
            intervalDays: "1~365일 사이로 입력해 주세요",
          });
        }
        routine.intervalDays = input.intervalDays;
      }
      if (input.enabled !== undefined) routine.enabled = input.enabled;
      if (input.foodName !== undefined) routine.foodName = input.foodName?.trim() || null;
      if (input.reason !== undefined) routine.reason = input.reason;
      return HttpResponse.json(serializeRoutine(routine));
    }),
  ),

  http.post(
    url("/routines/:routineId/reset"),
    authed(({ params, user }) => {
      const routine = myRoutine(user, params.routineId);
      if (!routine) return notFound();
      routine.intervalDays = routine.standardIntervalDays;
      routine.reason = null;
      return HttpResponse.json(serializeRoutine(routine));
    }),
  ),

  http.post(
    url("/routines/:routineId/complete"),
    authed(async ({ request, params, user }) => {
      const routine = myRoutine(user, params.routineId);
      if (!routine) return notFound();
      const input = (await request.json()) as CompleteInput;
      const occurredAt = input.occurredAt ?? new Date().toISOString();
      if (parseISO(occurredAt) > new Date()) {
        return fail(422, "FUTURE_TIME", "앞으로의 시각은 기록할 수 없어요.");
      }
      const sameDay = db.records.some(
        (r) =>
          !r.deletedAt &&
          r.routineId === routine.id &&
          ymd(parseISO(r.occurredAt)) === ymd(parseISO(occurredAt)),
      );
      if (sameDay) return fail(409, "ALREADY_RECORDED", "오늘 이미 기록했어요.");

      const record: DbRecord = {
        id: nextId("r"),
        petId: routine.petId,
        routineId: routine.id,
        careItem: routine.careItem,
        type: "done",
        method: "routine",
        occurredAt,
        createdAt: new Date().toISOString(),
        intake: input.intake ?? null,
        weightG: input.weightG ?? null,
        memo: input.memo?.trim() || null,
        foodName: routine.foodName,
        skipReason: null,
        photoIds: [],
        deletedAt: null,
        revisions: [],
      };
      db.records.push(record);
      routine.postponedTo = null;
      return HttpResponse.json(serializeRecord(record), { status: 201 });
    }),
  ),

  http.post(
    url("/routines/:routineId/skip"),
    authed(async ({ request, params, user }) => {
      const routine = myRoutine(user, params.routineId);
      if (!routine) return notFound();
      const { reason } = (await request.json()) as { reason: string | null };
      const now = new Date().toISOString();
      const record: DbRecord = {
        id: nextId("r"),
        petId: routine.petId,
        routineId: routine.id,
        careItem: routine.careItem,
        type: "skipped",
        method: "routine",
        occurredAt: now,
        createdAt: now,
        intake: null,
        weightG: null,
        memo: null,
        foodName: routine.foodName,
        skipReason: reason,
        photoIds: [],
        deletedAt: null,
        revisions: [],
      };
      db.records.push(record);
      routine.postponedTo = null;
      return HttpResponse.json(serializeRecord(record), { status: 201 });
    }),
  ),

  http.post(
    url("/routines/:routineId/postpone"),
    authed(async ({ request, params, user }) => {
      const routine = myRoutine(user, params.routineId);
      if (!routine) return notFound();
      const { date } = (await request.json()) as { date: string | null };
      if (date) {
        const diff = differenceInCalendarDays(parseISO(`${date}T00:00:00`), new Date());
        if (diff < 1 || diff > 30) {
          return fail(422, "VALIDATION", "내일부터 30일 뒤까지만 고를 수 있어요.");
        }
      }
      routine.postponedTo = date;
      return HttpResponse.json(serializeRoutine(routine));
    }),
  ),

  // ── 오늘 할 일 ──────────────────────────────────────────
  http.get(
    url("/today"),
    authed(({ request, user }) => {
      const params = new URL(request.url).searchParams;
      const date = params.get("date") ?? ymd(new Date());
      return HttpResponse.json(buildToday(user.id, date, params.get("petId") ?? undefined));
    }),
  ),

  // ── 기록 ───────────────────────────────────────────────
  http.get(
    url("/records"),
    authed(({ request, user }) => {
      const params = new URL(request.url).searchParams;
      const petId = params.get("petId");
      const careItem = params.get("careItem");
      const from = params.get("from");
      const to = params.get("to");
      const limit = Number(params.get("limit") ?? 30);
      const offset = Number(params.get("cursor") ?? 0);
      const myPetIds = new Set(
        db.pets.filter((p) => p.userId === user.id && !p.deletedAt).map((p) => p.id),
      );
      const rows = db.records
        .filter((r) => !r.deletedAt && myPetIds.has(r.petId))
        .filter((r) => !petId || r.petId === petId)
        .filter((r) => !careItem || r.careItem === careItem)
        .filter((r) => !from || ymd(parseISO(r.occurredAt)) >= from)
        .filter((r) => !to || ymd(parseISO(r.occurredAt)) <= to)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      const page = rows.slice(offset, offset + limit);
      return HttpResponse.json({
        items: page.map(serializeRecord),
        nextCursor: offset + limit < rows.length ? String(offset + limit) : null,
      });
    }),
  ),

  http.post(
    url("/records"),
    authed(async ({ request, user }) => {
      const input = (await request.json()) as RecordCreateInput;
      if (!myPet(user, input.petId)) return notFound();
      if (parseISO(input.occurredAt) > new Date()) {
        return fail(422, "FUTURE_TIME", "앞으로의 시각은 기록할 수 없어요.");
      }
      // 같은 항목 일정이 있으면 그 일정의 기록으로 남겨 다음 예정일이 다시 계산되게 한다
      const routine = db.routines.find(
        (r) => r.petId === input.petId && r.careItem === input.careItem && r.enabled,
      );
      const record: DbRecord = {
        id: nextId("r"),
        petId: input.petId,
        routineId: routine?.id ?? null,
        careItem: input.careItem as CareItem,
        type: "done",
        method: "manual",
        occurredAt: input.occurredAt,
        createdAt: new Date().toISOString(),
        intake: (input.intake as Intake | null) ?? null,
        weightG: input.weightG ?? null,
        memo: input.memo?.trim() || null,
        foodName: routine?.foodName ?? null,
        skipReason: null,
        photoIds: input.photoFileIds ?? [],
        deletedAt: null,
        revisions: [],
      };
      db.records.push(record);
      if (routine) routine.postponedTo = null;
      return HttpResponse.json(serializeRecord(record), { status: 201 });
    }),
  ),

  http.get(
    url("/records/:recordId"),
    authed(({ params, user }) => {
      const record = myRecord(user, params.recordId);
      if (!record || record.deletedAt) return notFound();
      return HttpResponse.json(serializeRecord(record));
    }),
  ),

  http.patch(
    url("/records/:recordId"),
    authed(async ({ request, params, user }) => {
      const record = myRecord(user, params.recordId);
      if (!record || record.deletedAt) return notFound();
      const input = (await request.json()) as RecordUpdateInput;
      if (input.occurredAt && parseISO(input.occurredAt) > new Date()) {
        return fail(422, "FUTURE_TIME", "앞으로의 시각은 기록할 수 없어요.");
      }
      const before = summarize(record);
      if (input.occurredAt !== undefined) record.occurredAt = input.occurredAt;
      if (input.intake !== undefined) record.intake = input.intake ?? null;
      if (input.weightG !== undefined) record.weightG = input.weightG ?? null;
      if (input.memo !== undefined) record.memo = input.memo?.trim() || null;
      if (input.photoFileIds !== undefined) record.photoIds = input.photoFileIds;
      record.revisions.push({
        at: new Date().toISOString(),
        summary: `${before} → ${summarize(record)}`,
      });
      return HttpResponse.json(serializeRecord(record));
    }),
  ),

  http.delete(
    url("/records/:recordId"),
    authed(({ params, user }) => {
      const record = myRecord(user, params.recordId);
      if (!record || record.deletedAt) return notFound();
      record.deletedAt = new Date().toISOString();
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  http.post(
    url("/records/:recordId/restore"),
    authed(({ params, user }) => {
      const record = myRecord(user, params.recordId);
      if (!record) return notFound();
      record.deletedAt = null;
      return HttpResponse.json(serializeRecord(record));
    }),
  ),

  // ── 파일 ───────────────────────────────────────────────
  http.post(
    url("/files"),
    authed(async ({ request, user }) => {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof Blob)) return fail(422, "VALIDATION", "파일을 골라 주세요.");
      if (file.size > 10 * 1024 * 1024) {
        return fail(413, "FILE_TOO_LARGE", "사진은 10MB까지 올릴 수 있어요.");
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const dataUrl = `data:${file.type || "image/jpeg"};base64,${btoa(binary)}`;
      const saved = { id: nextId("f"), url: dataUrl, ownerId: user.id };
      db.files.push(saved);
      return HttpResponse.json({ id: saved.id, url: saved.url }, { status: 201 });
    }),
  ),

  // ── 인계 카드 (2차) ─────────────────────────────────────
  http.post(
    url("/handover-cards"),
    authed(async ({ request, user }) => {
      const { petId, scope } = (await request.json()) as { petId: string; scope: HandoverScope };
      if (!myPet(user, petId)) return notFound();
      const now = new Date();
      const card: DbCard = {
        code: Math.random().toString(36).slice(2, 10).toUpperCase(),
        userId: user.id,
        petId,
        scope,
        status: "unused",
        createdAt: now.toISOString(),
        expiresAt: addDays(now, 7).toISOString(),
      };
      db.cards.push(card);
      return HttpResponse.json(serializeCard(card, appOrigin()), {
        status: 201,
      });
    }),
  ),

  http.get(
    url("/handover-cards"),
    authed(({ user }) =>
      HttpResponse.json(
        db.cards
          .filter((c) => c.userId === user.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((c) => serializeCard(c, appOrigin())),
      ),
    ),
  ),

  http.get(url("/handover-cards/:code"), async ({ params }) => {
    await wait();
    const card = db.cards.find((c) => c.code === params.code);
    if (!card) return notFound();
    const status = cardStatus(card);
    const pet = db.pets.find((p) => p.id === card.petId);
    const sender = db.users.find((u) => u.id === card.userId);
    const usable = status === "unused" && pet;
    const since = ymd(subDays(new Date(), card.scope.recordWeeks * 7));
    const preview: HandoverPreview = {
      code: card.code,
      status,
      senderNickname: usable && card.scope.nickname ? (sender?.nickname ?? null) : null,
      recordWeeks: usable ? card.scope.recordWeeks : 0,
      pet: usable
        ? {
            name: pet.name,
            speciesId: pet.speciesId,
            morph: pet.morph,
            lifeStageCode: stageCodeOf(pet),
            hatchedOn: pet.hatchedOn,
            handedOverOn: pet.endedOn ?? ymd(new Date()),
          }
        : null,
      routines:
        usable && card.scope.routines
          ? db.routines
              .filter((r) => r.petId === pet.id && r.enabled)
              .map((r) => ({ careItem: r.careItem, intervalDays: r.intervalDays }))
          : [],
      records:
        usable && card.scope.recordWeeks > 0
          ? db.records
              .filter((r) => r.petId === pet.id && !r.deletedAt)
              .filter((r) => ymd(parseISO(r.occurredAt)) >= since || pet.endedOn !== null)
              .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
              .slice(0, 12)
              .map((r) => ({
                occurredAt: r.occurredAt,
                careItem: CARE_ITEM_LABEL[r.careItem],
                intake: r.intake,
                weightG: r.weightG,
                memo: r.memo,
                method: r.method,
                photoCount: card.scope.photos ? r.photoIds.length : 0,
              }))
          : null,
    };
    return HttpResponse.json(preview);
  }),

  http.post(
    url("/handover-cards/:code/accept"),
    authed(async ({ request, params, user }) => {
      const card = db.cards.find((c) => c.code === params.code);
      if (!card) return notFound();
      if (cardStatus(card) !== "unused") {
        return fail(410, "CARD_UNAVAILABLE", "이 인계 카드는 열 수 없어요.");
      }
      const source = db.pets.find((p) => p.id === card.petId)!;
      const input = (await request.json()) as HandoverAcceptInput;
      const pet = {
        ...source,
        id: nextId("p"),
        userId: user.id,
        name: input.name.trim(),
        hatchedOn: input.hatchedOn,
        acquiredOn: input.acquiredOn,
        status: "active" as const,
        endReason: null,
        endedOn: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };
      db.pets.push(pet);
      const override = input.importRoutines
        ? Object.fromEntries(
            db.routines
              .filter((r) => r.petId === source.id)
              .map((r) => [r.careItem, r.intervalDays]),
          )
        : undefined;
      // 다음 예정일은 등록일 기준으로 다시 계산
      addRoutines(db, pet.id, pet.speciesId, stageCodeOf(pet), new Date(), override);
      card.status = "accepted";
      return HttpResponse.json(serializePet(pet), { status: 201 });
    }),
  ),

  http.delete(
    url("/handover-cards/:code"),
    authed(({ params, user }) => {
      const card = db.cards.find((c) => c.code === params.code && c.userId === user.id);
      if (!card) return notFound();
      if (cardStatus(card) !== "unused") {
        return fail(409, "CARD_NOT_CANCELABLE", "사용 전 카드만 취소할 수 있어요.");
      }
      card.status = "canceled";
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  http.get(url("/health"), () => HttpResponse.json({ status: "ok" })),
];

export const handlers = [...authHandlers, ...userHandlers, ...appHandlers];
