import type { RoutineCareItem } from "@/shared/domain/care";
import type { CareStandardTable, Species, SpeciesId } from "@/shared/domain/species";

/** 생애 단계 경계는 [미확정] 10/10 공동 기획 값이 나오면 바꾼다 */
const STAGES = [
  { code: "hatchling", name: "해츨링", minAgeDays: 0, criteria: "부화 후 3개월 미만" },
  { code: "juvenile", name: "준성체", minAgeDays: 90, criteria: "부화 후 3개월~1년" },
  { code: "adult", name: "성체", minAgeDays: 365, criteria: "부화 후 1년 이상" },
];

export const SPECIES_DATA: Species[] = [
  {
    id: "crested_gecko",
    group: "lizard",
    commonName: "크레스티드 게코",
    officialName: "속눈썹도마뱀부치",
    scientificName: "Correlophus ciliatus",
    aliases: ["크레", "크레스티드", "볏도마뱀붙이"],
    lifeStages: STAGES,
    morphs: ["노멀", "할리퀸", "플레임", "달마시안", "핀스트라이프", "릴리 화이트"],
    defaultFoodName: "인공 사료",
  },
  {
    id: "leopard_gecko",
    group: "lizard",
    commonName: "레오파드 게코",
    officialName: "표범도마뱀부치",
    scientificName: "Eublepharis macularius",
    aliases: ["레오", "레오파드", "표범게코"],
    lifeStages: STAGES,
    morphs: ["노멀", "하이옐로", "탠저린", "맥스노우", "블리자드", "랩터"],
    defaultFoodName: "귀뚜라미",
  },
];

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
    standards: STAGES.flatMap((stage) =>
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
