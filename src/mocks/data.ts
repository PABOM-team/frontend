import type { BackendMorph, BackendSpecies } from "@/shared/domain/backend";
import type { RoutineCareItem } from "@/shared/domain/care";
import type { CareStandardTable, SpeciesId } from "@/shared/domain/species";
import { LIFE_STAGES, SPECIES_PROFILE } from "@/shared/domain/species-catalog";

/** 백엔드 종 목록과 같은 값 (GET /species). 볼파이톤은 백엔드에 있지만 MVP 밖이라 프론트가 거른다 */
export const BACKEND_SPECIES: BackendSpecies[] = [
  { id: 1, code: "CRESTED", commonName: "크레스티드 게코", category: "LIZARD", displayOrder: 1 },
  { id: 2, code: "LEOPARD", commonName: "레오파드 게코", category: "LIZARD", displayOrder: 2 },
  { id: 3, code: "BALL_PYTHON", commonName: "볼파이톤", category: "SNAKE", displayOrder: 1 },
];

const morphs = (startId: number, names: [string, string][]): BackendMorph[] =>
  names.map(([code, name], i) => ({ id: startId + i, code, name }));

/** 백엔드 종별 모프와 같은 값 (GET /species/{id}/morphs) */
export const BACKEND_MORPHS: Record<number, BackendMorph[]> = {
  1: morphs(1, [
    ["NORMAL", "노멀"],
    ["HARLEQUIN", "할리퀸"],
    ["FLAME", "플레임"],
    ["DALMATIAN", "달마시안"],
    ["PINSTRIPE", "핀스트라이프"],
    ["LILLY_WHITE", "릴리 화이트"],
  ]),
  2: morphs(8, [
    ["NORMAL", "노멀"],
    ["HIGH_YELLOW", "하이옐로"],
    ["TANGERINE", "탠저린"],
    ["MACK_SNOW", "맥스노우"],
    ["BLIZZARD", "블리자드"],
    ["RAPTOR", "랩터"],
  ]),
  3: [],
};

export const backendSpeciesOf = (speciesId: SpeciesId) =>
  BACKEND_SPECIES.find((s) => s.code === SPECIES_PROFILE[speciesId].code)!;

type Interval = Partial<Record<RoutineCareItem, number>>;

/** 관리 기준표 v0.1 시안. 항목·주기는 예시(가이드라인 확정 전) */
const INTERVALS: Record<SpeciesId, Record<string, Interval>> = {
  crested_gecko: {
    hatchling: { feeding: 1, misting: 1, weight: 14, cleaning: 7, shed: 7 },
    juvenile: { feeding: 2, misting: 1, weight: 14, cleaning: 7, shed: 7 },
    adult: { feeding: 3, misting: 1, weight: 30, cleaning: 7, shed: 7 },
  },
  leopard_gecko: {
    hatchling: { feeding: 1, weight: 14, cleaning: 7, shed: 7 },
    juvenile: { feeding: 2, weight: 14, cleaning: 7, shed: 7 },
    adult: { feeding: 3, weight: 30, cleaning: 7, shed: 7 },
  },
};

export function standardIntervals(speciesId: SpeciesId, stageCode: string): Interval {
  return INTERVALS[speciesId][stageCode] ?? INTERVALS[speciesId].adult;
}

export const CARE_STANDARD_VERSION = "v0.1";

export function careStandardTable(speciesId: SpeciesId): CareStandardTable {
  return {
    speciesId,
    version: CARE_STANDARD_VERSION,
    effectiveFrom: "2026-10-14",
    isDraft: true,
    standards: LIFE_STAGES.flatMap((stage) =>
      Object.entries(standardIntervals(speciesId, stage.code)).map(([careItem, intervalDays]) => ({
        lifeStageCode: stage.code,
        careItem: careItem as RoutineCareItem,
        intervalDays,
        label: "reference" as const,
      })),
    ),
    references: [{ title: "〔참고 자료 · 발행처 · 연도〕", url: null }],
    reviewNote: "〔수의사 자문 표현 미정 · 11월 자문 때 확인〕",
  };
}
