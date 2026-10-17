import { z } from "zod";
import {
  handoverCardSchema,
  handoverPreviewSchema,
  type HandoverAcceptInput,
  type HandoverScope,
} from "@/shared/domain/handover";
import {
  petSchema,
  type PetCreateInput,
  type PetStatus,
  type PetStatusChangeInput,
  type PetUpdateInput,
} from "@/shared/domain/pet";
import {
  careRecordSchema,
  photoSchema,
  recordPageSchema,
  type CompleteInput,
  type RecordCreateInput,
  type RecordQuery,
  type RecordUpdateInput,
} from "@/shared/domain/record";
import { routineSchema, type RoutineUpdateInput } from "@/shared/domain/routine";
import { careStandardTableSchema, speciesSchema, type SpeciesId } from "@/shared/domain/species";
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
import { api } from "./client";

/**
 * 서버 API 목록 (IA 8_개발 참고 API-01~84). 화면은 이 함수만 부르고 경로는 여기에만 둔다.
 * 응답은 zod 스키마로 검증해서 백엔드와 모양이 어긋나면 바로 드러나게 한다.
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
  /** API-04 (백엔드 미구현이라 목업) */
  get: () => api.get("me").json(meSchema),
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
  /** API-07 회원 탈퇴 */
  withdraw: () => api.delete("me").then(noContent),
};

export const speciesApi = {
  /** API-10 */
  list: () => api.get("species").json(z.array(speciesSchema)),
  /** API-11 */
  careStandards: (speciesId: SpeciesId) =>
    api.get(`species/${speciesId}/care-standards`).json(careStandardTableSchema),
};

export const petDetailSchema = z.object({
  pet: petSchema,
  routines: z.array(routineSchema),
  recentRecords: z.array(careRecordSchema),
});
export type PetDetail = z.infer<typeof petDetailSchema>;

export const petsApi = {
  /** API-20 */
  list: (status: PetStatus = "active") =>
    api.get("pets", { searchParams: { status } }).json(z.array(petSchema)),
  /** API-21 개체 등록 + 기본 관리 일정 생성 */
  create: (input: PetCreateInput) => api.post("pets", { json: input }).json(petSchema),
  /** API-22 개체 상세(요약·일정·최근 기록) */
  get: (petId: string) => api.get(`pets/${petId}`).json(petDetailSchema),
  /** API-23 */
  update: (petId: string, input: PetUpdateInput) =>
    api.patch(`pets/${petId}`, { json: input }).json(petSchema),
  /** API-24 소프트 삭제 */
  remove: (petId: string) => api.delete(`pets/${petId}`).then(noContent),
  /** API-26 함께했던 개체로 바꾸기·되돌리기 */
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

export const recordsApi = {
  /** API-50 기록 이력(커서 페이지) */
  list: (query: RecordQuery) =>
    api.get("records", { searchParams: searchParams(query) }).json(recordPageSchema),
  /** API-51 직접 기록 */
  create: (input: RecordCreateInput) => api.post("records", { json: input }).json(careRecordSchema),
  /** API-52 */
  get: (recordId: string) => api.get(`records/${recordId}`).json(careRecordSchema),
  /** API-53 정정(이전 값 보존) */
  update: (recordId: string, input: RecordUpdateInput) =>
    api.patch(`records/${recordId}`, { json: input }).json(careRecordSchema),
  /** API-54 삭제(복구 가능) */
  remove: (recordId: string) => api.delete(`records/${recordId}`).then(noContent),
  /** API-55 */
  restore: (recordId: string) => api.post(`records/${recordId}/restore`).json(careRecordSchema),
};

export const filesApi = {
  /** API-60 사진 업로드 */
  upload: (file: Blob, purpose: "pet" | "record") => {
    const body = new FormData();
    body.set("file", file);
    body.set("purpose", purpose);
    return api.post("files", { body, timeout: 30_000 }).json(photoSchema);
  },
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
