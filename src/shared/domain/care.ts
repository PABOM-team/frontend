import { z } from "zod";

/** 관리 항목. 체크 리스트(일정)로 쓰는 항목과 직접 기록에만 쓰는 메모로 나뉜다 */
export const CARE_ITEMS = ["feeding", "misting", "weight", "cleaning", "shed", "memo"] as const;
export const careItemSchema = z.enum(CARE_ITEMS);
export type CareItem = z.infer<typeof careItemSchema>;

export const ROUTINE_CARE_ITEMS = ["feeding", "misting", "weight", "cleaning", "shed"] as const;
export const routineCareItemSchema = z.enum(ROUTINE_CARE_ITEMS);
export type RoutineCareItem = z.infer<typeof routineCareItemSchema>;

export const CARE_ITEM_LABEL: Record<CareItem, string> = {
  feeding: "급여",
  misting: "분무",
  weight: "체중",
  cleaning: "청소",
  shed: "탈피",
  memo: "메모",
};

/** 체크 리스트에서 쓰는 이름. 탈피는 일정일 때 '탈피 확인'으로 부른다 */
export const ROUTINE_LABEL: Record<RoutineCareItem, string> = {
  ...CARE_ITEM_LABEL,
  shed: "탈피 확인",
};

/**
 * 기록 방식
 * - intake: 먹은 정도 칩(급여)
 * - weight: 숫자 g(체중)
 * - check: O/X, 체크하면 시트 없이 바로 완료
 * - memo: 메모·사진만
 */
export type RecordKind = "intake" | "weight" | "check" | "memo";

export const RECORD_KIND: Record<CareItem, RecordKind> = {
  feeding: "intake",
  weight: "weight",
  misting: "check",
  cleaning: "check",
  shed: "check",
  memo: "memo",
};

export const RECORD_KIND_LABEL: Record<RecordKind, string> = {
  intake: "먹은 정도",
  weight: "숫자(g)",
  check: "O/X",
  memo: "메모",
};

export const RECORD_KIND_HINT: Record<RecordKind, string> = {
  intake: "먹은 정도(일부·전부·안 먹음·관찰 못함)",
  weight: "숫자(g) · 체크하면 몸무게를 입력해요",
  check: "O/X · 체크하면 바로 완료돼요",
  memo: "메모·사진",
};

/** 급여 결과. 미리 선택하지 않고 비워도 저장된다 (SCR-H02) */
export const INTAKES = ["partial", "all", "none", "unobserved"] as const;
export const intakeSchema = z.enum(INTAKES);
export type Intake = z.infer<typeof intakeSchema>;

export const INTAKE_LABEL: Record<Intake, string> = {
  partial: "일부 먹음",
  all: "전부 먹음",
  none: "안 먹음",
  unobserved: "관찰 못함",
};

export const SKIP_REASONS = ["개체 상태를 보고 쉬기로 함", "일정이 맞지 않음", "기타"] as const;

export function formatInterval(days: number) {
  return days === 1 ? "매일" : `${days}일마다`;
}

/** 할 일·기록 제목. 급여는 먹이 이름을 붙인다 (예: 급여 · 인공 사료) */
export function careTitle(item: CareItem, foodName?: string | null) {
  if (item === "feeding" && foodName) return `${CARE_ITEM_LABEL.feeding} · ${foodName}`;
  return item === "memo" ? CARE_ITEM_LABEL.memo : ROUTINE_LABEL[item];
}

/** 진단·치료 면책 문구. 체크 리스트·할 일 설명·가이드라인에 그대로 쓴다 */
export const CARE_DISCLAIMER =
  "파봄은 진단이나 치료를 대신하지 않아요. 개체 상태가 걱정되면 파충류를 진료하는 동물병원에 문의해 주세요.";
