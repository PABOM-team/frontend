import { addDays, format, setHours, setMinutes, subDays } from "date-fns";
import type { CareItem, Intake, RoutineCareItem } from "@/shared/domain/care";
import type { HandoverScope } from "@/shared/domain/handover";
import type { EndReason, Sex } from "@/shared/domain/pet";
import type { SpeciesId } from "@/shared/domain/species";
import type { AuthProvider } from "@/shared/domain/user";
import { SPECIES_DATA, standardIntervals } from "./data";

/**
 * 목업 서버의 저장소. 브라우저에서는 localStorage에 저장해 새로고침해도 이어진다.
 * 실제 백엔드 테이블(IA 12_데이터)과 비슷한 모양으로 두고, 응답 모양은 handlers에서 만든다.
 */

export type DbUser = {
  id: string;
  nickname: string;
  provider: AuthProvider;
  status: "pending_agreement" | "active";
  joinedAt: string;
  agreements: string[];
};

export type DbPet = {
  id: string;
  userId: string;
  name: string;
  speciesId: SpeciesId;
  morph: string | null;
  sex: Sex;
  hatchedOn: string | null;
  manualStageCode: string | null;
  stageUncertain?: boolean;
  acquiredOn: string | null;
  photoUrl: string | null;
  status: "active" | "ended";
  endReason: EndReason | null;
  endedOn: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type DbRoutine = {
  id: string;
  petId: string;
  careItem: RoutineCareItem;
  intervalDays: number;
  standardIntervalDays: number;
  enabled: boolean;
  startDate: string;
  foodName: string | null;
  postponedTo: string | null;
  reason: string | null;
};

export type DbRecord = {
  id: string;
  petId: string;
  routineId: string | null;
  careItem: CareItem;
  type: "done" | "skipped";
  method: "routine" | "manual";
  occurredAt: string;
  createdAt: string;
  intake: Intake | null;
  weightG: number | null;
  memo: string | null;
  foodName: string | null;
  skipReason: string | null;
  photoIds: string[];
  deletedAt: string | null;
  revisions: { at: string; summary: string }[];
};

export type DbFile = { id: string; url: string; ownerId: string };

export type DbCard = {
  code: string;
  userId: string;
  petId: string;
  scope: HandoverScope;
  status: "unused" | "accepted" | "canceled";
  createdAt: string;
  expiresAt: string;
};

export type DbState = {
  version: number;
  users: DbUser[];
  session: { userId: string | null; token: string | null };
  pets: DbPet[];
  routines: DbRoutine[];
  records: DbRecord[];
  files: DbFile[];
  cards: DbCard[];
  seq: number;
};

const STORAGE_KEY = "pabom-mock-db";
// 시드가 바뀌면 올린다. 저장된 목업 데이터가 이 버전과 다르면 새 시드로 시작한다
const VERSION = 2;

export const ymd = (date: Date) => format(date, "yyyy-MM-dd");
const at = (date: Date, hour: number, minute = 0) =>
  setMinutes(setHours(date, hour), minute).toISOString();

/** 처음 상태: 카카오로 로그인하면 쓰는 '유나' 계정과 개체 4마리. 날짜는 오늘 기준으로 만든다 */
export function createSeed(today = new Date()): DbState {
  const d = (days: number) => subDays(today, days);
  const userId = "u-kakao";
  const state: DbState = {
    version: VERSION,
    users: [
      {
        id: userId,
        nickname: "유나",
        provider: "kakao",
        status: "active",
        joinedAt: d(60).toISOString(),
        agreements: ["TERMS", "PRIVACY", "AGE_14"],
      },
    ],
    session: { userId: null, token: null },
    pets: [],
    routines: [],
    records: [],
    files: [],
    cards: [],
    seq: 1000,
  };

  const pet = (
    p: Omit<DbPet, "userId" | "deletedAt" | "photoUrl" | "manualStageCode"> & Partial<DbPet>,
  ) => state.pets.push({ userId, deletedAt: null, photoUrl: null, manualStageCode: null, ...p });

  pet({
    id: "p-kong",
    name: "콩이",
    speciesId: "crested_gecko",
    morph: "할리퀸",
    sex: "male",
    hatchedOn: ymd(d(225)),
    acquiredOn: ymd(d(27)),
    status: "active",
    endReason: null,
    endedOn: null,
    createdAt: d(60).toISOString(),
  });
  pet({
    id: "p-dal",
    name: "달이",
    speciesId: "leopard_gecko",
    morph: "노멀",
    sex: "unknown",
    hatchedOn: ymd(d(500)),
    acquiredOn: null,
    status: "active",
    endReason: null,
    endedOn: null,
    createdAt: d(58).toISOString(),
  });
  pet({
    id: "p-byeol",
    name: "별이",
    speciesId: "leopard_gecko",
    morph: "노멀",
    sex: "female",
    hatchedOn: ymd(d(870)),
    acquiredOn: null,
    status: "ended",
    endReason: "deceased",
    endedOn: ymd(d(75)),
    createdAt: d(520).toISOString(),
  });
  pet({
    id: "p-choco",
    name: "초코",
    speciesId: "crested_gecko",
    morph: "플레임",
    sex: "female",
    hatchedOn: ymd(d(400)),
    acquiredOn: null,
    status: "ended",
    endReason: "rehomed",
    endedOn: ymd(d(80)),
    createdAt: d(250).toISOString(),
  });

  // 콩이(준성체 크레): 분무는 1일 지남, 급여는 오늘, 나머지는 앞으로
  const kong = addRoutines(state, "p-kong", "crested_gecko", "juvenile", d(60));
  // 달이(성체 레오): 급여 오늘
  const dal = addRoutines(state, "p-dal", "leopard_gecko", "adult", d(58));
  // 분양 보낸 초코: 인계 카드 예시(DEMO2026)에 넘길 체크 리스트
  addRoutines(state, "p-choco", "crested_gecko", "adult", d(250));
  const lastDone: Record<string, number> = {
    [kong.misting!]: 2,
    [kong.feeding!]: 2,
    [kong.weight!]: 5,
    [kong.cleaning!]: 3,
    [kong.shed!]: 4,
    [dal.feeding!]: 3,
    [dal.weight!]: 10,
    [dal.cleaning!]: 2,
    [dal.shed!]: 6,
  };

  const intakes: Intake[] = ["all", "partial", "all", "all", "none", "partial", "all"];
  let n = 0;
  for (const routine of state.routines) {
    const first = lastDone[routine.id];
    if (first === undefined) continue;
    for (let ago = first; ago <= 56; ago += routine.intervalDays) {
      n += 1;
      const day = d(ago);
      const weightBase = routine.petId === "p-kong" ? 45 : 62;
      state.records.push({
        id: `r-${state.seq++}`,
        petId: routine.petId,
        routineId: routine.id,
        careItem: routine.careItem,
        type: "done",
        method: "routine",
        occurredAt: at(day, routine.careItem === "misting" ? 8 : 20, (n * 7) % 60),
        createdAt: at(day, routine.careItem === "misting" ? 8 : 20, ((n * 7) % 60) + 1),
        intake: routine.careItem === "feeding" ? intakes[n % intakes.length] : null,
        weightG:
          routine.careItem === "weight" ? Math.round((weightBase - ago * 0.08) * 10) / 10 : null,
        memo: null,
        foodName: routine.foodName,
        skipReason: null,
        photoIds: [],
        deletedAt: null,
        revisions: [],
      });
    }
  }

  // 직접 기록 몇 건
  const manual = (petId: string, careItem: CareItem, ago: number, memo: string | null) =>
    state.records.push({
      id: `r-${state.seq++}`,
      petId,
      routineId: null,
      careItem,
      type: "done",
      method: "manual",
      occurredAt: at(d(ago), 21, 10),
      createdAt: at(d(ago), 21, 12),
      intake: null,
      weightG: null,
      memo,
      foodName: null,
      skipReason: null,
      photoIds: [],
      deletedAt: null,
      revisions: [],
    });
  manual("p-kong", "shed", 4, "탈피를 시작했어요. 꼬리 쪽이 하얘요.");
  manual("p-dal", "memo", 9, "은신처를 새로 바꿔 줬어요.");

  // 함께했던 개체의 지난 기록
  for (const [petId, endAgo, count] of [
    ["p-byeol", 75, 24],
    ["p-choco", 80, 12],
  ] as const) {
    for (let i = 0; i < count; i += 1) {
      state.records.push({
        id: `r-${state.seq++}`,
        petId,
        routineId: null,
        careItem: i % 3 === 0 ? "memo" : "feeding",
        type: "done",
        method: i % 3 === 0 ? "manual" : "routine",
        occurredAt: at(d(endAgo + 1 + i * 3), 20),
        createdAt: at(d(endAgo + 1 + i * 3), 20, 2),
        intake: i % 3 === 0 ? null : intakes[i % intakes.length],
        weightG: null,
        memo: i % 3 === 0 ? "사진을 남겨요." : null,
        foodName: null,
        skipReason: null,
        photoIds: [],
        deletedAt: null,
        revisions: [],
      });
    }
  }

  state.cards.push({
    code: "DEMO2026",
    userId,
    petId: "p-choco",
    scope: { routines: true, recordWeeks: 4, photos: false, nickname: true },
    status: "unused",
    createdAt: d(1).toISOString(),
    expiresAt: addDays(d(1), 7).toISOString(),
  });

  return state;
}

export function addRoutines(
  state: DbState,
  petId: string,
  speciesId: SpeciesId,
  stageCode: string,
  start: Date,
  override?: Partial<Record<RoutineCareItem, number>>,
) {
  const species = SPECIES_DATA.find((s) => s.id === speciesId)!;
  const ids: Partial<Record<RoutineCareItem, string>> = {};
  for (const [careItem, standard] of Object.entries(standardIntervals(speciesId, stageCode))) {
    const item = careItem as RoutineCareItem;
    const id = `rt-${state.seq++}`;
    ids[item] = id;
    state.routines.push({
      id,
      petId,
      careItem: item,
      intervalDays: override?.[item] ?? standard,
      standardIntervalDays: standard,
      enabled: true,
      startDate: ymd(start),
      foodName: item === "feeding" ? species.defaultFoodName : null,
      postponedTo: null,
      reason: null,
    });
  }
  return ids;
}

function load(): DbState {
  if (typeof window === "undefined") return createSeed();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DbState;
      if (parsed.version === VERSION) return parsed;
    }
  } catch {
    // 저장소를 못 쓰면 메모리로만 동작
  }
  return createSeed();
}

export let db: DbState = load();

export function save() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // 용량 초과 등은 무시하고 메모리로만 이어 간다
  }
}

/** 목업 데이터를 처음 상태로 되돌린다 (설정 화면의 목업 도구, 테스트) */
export function resetDb() {
  db = createSeed();
  save();
}

export function nextId(prefix: string) {
  db.seq += 1;
  return `${prefix}-${db.seq}`;
}
