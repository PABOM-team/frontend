import { z } from "zod";
import {
  backendFileSchema,
  backendFileUrlSchema,
  backendMorphSchema,
  backendPetListItemSchema,
  backendPetSchema,
  backendRecordDetailSchema,
  backendRecordListSchema,
  backendRecordMutationSchema,
  backendSpeciesSchema,
  FILE_PURPOSE,
  type BackendPet,
  type FilePurpose,
} from "@/shared/domain/backend";
import { successEnvelope } from "@/shared/domain/envelope";
import {
  handoverCardSchema,
  handoverPreviewSchema,
  type HandoverAcceptInput,
  type HandoverScope,
} from "@/shared/domain/handover";
import {
  petSchema,
  type Pet,
  type PetCreateInput,
  type PetStatus,
  type PetStatusChangeInput,
  type PetUpdateInput,
} from "@/shared/domain/pet";
import {
  careRecordSchema,
  type CareRecord,
  type CompleteInput,
  type Photo,
  type RecordCreateInput,
  type RecordPage,
  type RecordQuery,
  type RecordUpdateInput,
} from "@/shared/domain/record";
import { routineSchema, type Routine, type RoutineUpdateInput } from "@/shared/domain/routine";
import { careStandardTableSchema, type SpeciesId } from "@/shared/domain/species";
import { todaySchema } from "@/shared/domain/today";
import {
  AGREEMENT_VERSION,
  AGREEMENTS,
  agreementCompletionSchema,
  loginUrlSchema,
  meSchema,
  oauthLoginSchema,
  type AgreementType,
  type AuthProvider,
} from "@/shared/domain/user";
import {
  speciesIdOfCode,
  toCareRecord,
  toCareRecordFromListItem,
  toPet,
  toPetCreate,
  toPetUpdate,
  toRecordCreate,
  toRecordSearch,
  toRecordUpdate,
  toSpeciesIndex,
  type SpeciesIndex,
} from "./adapters";
import { api } from "./client";

/**
 * 서버 API 목록 (IA 8_개발 참고 API-01~84). 화면은 이 함수만 부르고 경로는 여기에만 둔다.
 * 응답은 zod 스키마로 검증해서 백엔드와 모양이 어긋나면 바로 드러나게 한다.
 * 종·개체·기록·파일은 백엔드 모양(src/shared/domain/backend.ts)으로 받아 adapters.ts가 화면용으로 바꾼다.
 */

const noContent = () => undefined;

function searchParams(query: Record<string, string | number | undefined | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return params;
}

export const authApi = {
  /** API-01 카카오·구글 로그인 화면 주소. CSRF를 막는 state 쿠키도 함께 받는다 */
  loginUrl: (provider: AuthProvider) => api.get(`auth/${provider}/login-url`).json(loginUrlSchema),
  /**
   * API-01 인가 코드로 로그인·가입. 기존 회원은 refresh 쿠키도 받는다.
   * 인가 코드는 한 번만 쓸 수 있어서 다시 시도하지 않는다
   */
  callback: (provider: AuthProvider, query: { code: string; state: string }) =>
    api.get(`auth/${provider}/callback`, { searchParams: query, retry: 0 }).json(oauthLoginSchema),
  /** API-03 refresh 쿠키를 지운다. 쿠키가 없어도 204 */
  logout: () => api.post("auth/logout").then(noContent),
};

export const meApi = {
  /** API-04 */
  get: () => api.get("users/me").json(meSchema),
  /** API-05 약관 동의 → 가입 완료. 가입 토큰으로 부르고 access 토큰을 받는다 */
  agree: (agreed: AgreementType[], signupToken: string) =>
    api
      .post("me/agreements", {
        headers: { Authorization: `Bearer ${signupToken}` },
        json: {
          agreements: AGREEMENTS.map(({ type }) => ({
            type,
            version: AGREEMENT_VERSION,
            agreed: agreed.includes(type),
          })),
        },
        retry: 0,
      })
      .json(agreementCompletionSchema),
  /** API-07 회원 탈퇴. 파봄 회원 정보만 지우고 카카오·구글 연결은 끊지 않는다 (MVP) */
  withdraw: () => api.delete("users/me", { json: { confirm: true } }).then(noContent),
};

let speciesIndex: Promise<SpeciesIndex> | undefined;

/** 종 목록 + MVP 종별 모프. 거의 안 바뀌어서 한 번만 받아 둔다 (실패하면 다음에 다시) */
function loadSpecies() {
  speciesIndex ??= (async () => {
    const all = await api.get("species").json(successEnvelope(z.array(backendSpeciesSchema)));
    const supported = all.flatMap((backend) => {
      const id = speciesIdOfCode(backend.code);
      return id ? [{ id, backend }] : [];
    });
    const morphs = await Promise.all(
      supported.map(({ backend }) =>
        api.get(`species/${backend.id}/morphs`).json(successEnvelope(z.array(backendMorphSchema))),
      ),
    );
    return toSpeciesIndex(supported.map((s, i) => ({ ...s, morphs: morphs[i]! })));
  })().catch((error: unknown) => {
    speciesIndex = undefined;
    throw error;
  });
  return speciesIndex;
}

export const speciesApi = {
  /** API-10 (+ 종별 모프). MVP 종만 */
  list: async () => (await loadSpecies()).list,
  /** API-11 (백엔드 미구현이라 목업) */
  careStandards: (speciesId: SpeciesId) =>
    api.get(`species/${speciesId}/care-standards`).json(careStandardTableSchema),
};

export const filesApi = {
  /** API-60 사진 업로드 (JPEG·PNG, 10MB까지) */
  upload: async (file: Blob, purpose: FilePurpose): Promise<Photo> => {
    const body = new FormData();
    body.set("file", file);
    const saved = await api
      .post("files", { body, searchParams: { purpose: FILE_PURPOSE[purpose] }, timeout: 30_000 })
      .json(successEnvelope(backendFileSchema));
    return { id: String(saved.id), url: saved.url };
  },
  /** 파일 조회 주소. 10분 동안만 쓸 수 있다 */
  url: (fileId: number | string) =>
    api
      .get(`files/${fileId}`)
      .json(successEnvelope(backendFileUrlSchema))
      .then((file) => file.url),
};

/** 사진 주소를 못 받아도 개체는 보여 준다 */
const photoUrlOf = (fileId: number | null) =>
  fileId === null ? Promise.resolve(null) : filesApi.url(fileId).catch(() => null);

async function toPetWithPhoto(raw: BackendPet) {
  const [index, photoUrl] = await Promise.all([loadSpecies(), photoUrlOf(raw.photoFileId)]);
  return toPet(raw, index, photoUrl);
}

const getPet = (petId: string) =>
  api.get(`pets/${petId}`).json(successEnvelope(backendPetSchema)).then(toPetWithPhoto);

export type PetDetail = { pet: Pet; routines: Routine[]; recentRecords: CareRecord[] };

export const petsApi = {
  /**
   * API-20. 백엔드 목록은 요약형이라 개체마다 상세를 다시 부른다.
   * [백엔드 요청] 목록에 상세와 같은 칸과 status 필터가 생기면 한 번에 받는다
   */
  list: async (status: PetStatus = "active") => {
    const items = await api.get("pets").json(successEnvelope(z.array(backendPetListItemSchema)));
    const pets = await Promise.all(items.map((item) => getPet(String(item.id))));
    return pets.filter((pet) => pet.status === status);
  },
  /** API-21 개체 등록 + 기본 관리 일정 생성 */
  create: async (input: PetCreateInput) => {
    const body = toPetCreate(input, await loadSpecies());
    const raw = await api.post("pets", { json: body }).json(successEnvelope(backendPetSchema));
    return toPetWithPhoto(raw);
  },
  /** API-22 개체 상세. 일정·최근 기록은 따로 불러 합친다 */
  get: async (petId: string): Promise<PetDetail> => {
    const [pet, routines, recent] = await Promise.all([
      getPet(petId),
      // 일정 API는 아직 목업이라, 진짜 백엔드 개체면 일정이 없을 수 있다
      routinesApi.list(petId).catch(() => []),
      recordsApi.list({ petId, limit: 5 }),
    ]);
    return { pet, routines, recentRecords: recent.items };
  },
  /** API-23. 생애 단계는 종·부화일을 같이 봐야 해서 원래 개체를 받는다 */
  update: async (pet: Pet, input: PetUpdateInput) => {
    const body = toPetUpdate(pet, input, await loadSpecies());
    const raw = await api
      .patch(`pets/${pet.id}`, { json: body })
      .json(successEnvelope(backendPetSchema));
    return toPetWithPhoto(raw);
  },
  /** API-24 소프트 삭제 (개체의 기록도 함께) */
  remove: (petId: string) => api.delete(`pets/${petId}`).then(noContent),
  /** API-26 함께했던 개체로 바꾸기·되돌리기 (백엔드 미구현이라 목업) */
  changeStatus: (petId: string, input: PetStatusChangeInput) =>
    api.post(`pets/${petId}/status-changes`, { json: input }).json(petSchema),
};

export const routinesApi = {
  /** API-30 */
  list: (petId: string) => api.get(`pets/${petId}/routines`).json(z.array(routineSchema)),
  /** API-31 주기·켜고 끄기·먹이 이름 수정 */
  update: (routineId: string, input: RoutineUpdateInput) =>
    api.patch(`routines/${routineId}`, { json: input }).json(routineSchema),
  /** API-32 기준표 값으로 되돌리기 */
  reset: (routineId: string) => api.post(`routines/${routineId}/reset`).json(routineSchema),
  /** API-41 완료 체크 → 기록 생성 */
  complete: (routineId: string, input: CompleteInput = {}) =>
    api.post(`routines/${routineId}/complete`, { json: input }).json(careRecordSchema),
  /** API-42 이번 회차 건너뜀 */
  skip: (routineId: string, reason: string | null) =>
    api.post(`routines/${routineId}/skip`, { json: { reason } }).json(careRecordSchema),
  /** API-43 다른 날로 미루기. date가 null이면 미루기 취소 */
  postpone: (routineId: string, date: string | null) =>
    api.post(`routines/${routineId}/postpone`, { json: { date } }).json(routineSchema),
};

export const todayApi = {
  /** API-40 오늘(또는 앞 날짜) 할 일 */
  get: (date?: string, petId?: string) =>
    api.get("today", { searchParams: searchParams({ date, petId }) }).json(todaySchema),
};

/** 백엔드 기록 목록은 한 번에 50개까지 */
const RECORD_PAGE_MAX = 50;

async function recordPage(query: RecordQuery, size: number): Promise<RecordPage> {
  const page = await api
    .get("records", { searchParams: searchParams({ ...toRecordSearch(query), size }) })
    .json(successEnvelope(backendRecordListSchema));
  // 목록 아이템에는 사진 주소가 없어서, 사진이 있는 기록만 상세를 불러 채운다
  const items = await Promise.all(
    page.items.map((item) =>
      item.hasPhoto ? recordsApi.get(String(item.id)) : toCareRecordFromListItem(item),
    ),
  );
  return { items, nextCursor: page.nextCursor };
}

export const recordsApi = {
  /** API-50 기록 이력(커서 페이지). limit이 50을 넘으면 여러 페이지를 이어 받는다 */
  list: async (query: RecordQuery): Promise<RecordPage> => {
    const limit = query.limit ?? 20;
    const items: CareRecord[] = [];
    let cursor = query.cursor;
    let nextCursor: string | null = null;
    do {
      const page = await recordPage(
        { ...query, cursor },
        Math.min(RECORD_PAGE_MAX, limit - items.length),
      );
      items.push(...page.items);
      nextCursor = page.nextCursor;
      cursor = nextCursor ?? undefined;
    } while (nextCursor && items.length < limit);
    return { items, nextCursor };
  },
  /** API-51 직접 기록 */
  create: (input: RecordCreateInput) =>
    api
      .post("records", { json: toRecordCreate(input) })
      .json(successEnvelope(backendRecordMutationSchema))
      .then(({ record }) => toCareRecord(record)),
  /** API-52 기록 상세 + 정정 이력 */
  get: (recordId: string) =>
    api
      .get(`records/${recordId}`)
      .json(successEnvelope(backendRecordDetailSchema))
      .then(({ record, revisions }) => toCareRecord(record, revisions)),
  /** API-53 정정(이전 값 보존). revisionNo가 없으면(목록에서 온 기록) 상세를 먼저 부른다 */
  update: async (record: Pick<CareRecord, "id" | "revisionNo">, input: RecordUpdateInput) => {
    const revisionNo = record.revisionNo ?? (await recordsApi.get(record.id)).revisionNo ?? 0;
    return api
      .patch(`records/${record.id}`, { json: toRecordUpdate(revisionNo, input) })
      .json(successEnvelope(backendRecordMutationSchema))
      .then(({ record: saved }) => toCareRecord(saved));
  },
  /** API-54 삭제(30일 안에 복구 가능) */
  remove: (recordId: string) => api.delete(`records/${recordId}`).then(noContent),
  /** API-55 */
  restore: (recordId: string) =>
    api
      .post(`records/${recordId}/restore`)
      .json(successEnvelope(backendRecordMutationSchema))
      .then(({ record }) => toCareRecord(record)),
};

export const handoverApi = {
  /** API-80 */
  create: (petId: string, scope: HandoverScope) =>
    api.post("handover-cards", { json: { petId, scope, agreed: true } }).json(handoverCardSchema),
  /** API-81 로그인 없이 미리보기 */
  preview: (code: string) => api.get(`handover-cards/${code}`).json(handoverPreviewSchema),
  /** API-82 수락 → 개체 생성 */
  accept: (code: string, input: HandoverAcceptInput) =>
    api.post(`handover-cards/${code}/accept`, { json: input }).json(petSchema),
  /** API-83 */
  list: () => api.get("handover-cards").json(z.array(handoverCardSchema)),
  /** API-84 */
  cancel: (code: string) => api.delete(`handover-cards/${code}`).then(noContent),
};
