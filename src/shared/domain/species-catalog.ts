import type { LifeStage, Species, SpeciesId } from "./species";

/** 생애 단계 경계는 [미확정] 10/10 공동 기획 값이 나오면 바꾼다 */
export const LIFE_STAGES: LifeStage[] = [
  { code: "hatchling", name: "해츨링", minAgeDays: 0, criteria: "부화 후 3개월 미만" },
  { code: "juvenile", name: "준성체", minAgeDays: 90, criteria: "부화 후 3개월~1년" },
  { code: "adult", name: "성체", minAgeDays: 365, criteria: "부화 후 1년 이상" },
];

export type SpeciesProfile = Omit<Species, "id" | "group" | "commonName" | "morphs"> & {
  /** 백엔드 종 코드 (GET /species의 code) */
  code: string;
  /**
   * 백엔드 성장 단계 ID. 스웨거 예시(크레 준성체 = 2)로만 추정했다.
   * [백엔드 확인 필요] 성장 단계 목록 API가 생기면 그걸로 바꾼다
   */
  lifeStageIds: Record<string, number>;
};

/**
 * 백엔드 종 목록에 없는 프론트 전용 정보(정식 이름·별칭·생애 단계·기본 먹이).
 * 종 이름·분류·모프는 백엔드(GET /species, /species/{id}/morphs)에서 받는다.
 */
export const SPECIES_PROFILE: Record<SpeciesId, SpeciesProfile> = {
  crested_gecko: {
    code: "CRESTED",
    officialName: "속눈썹도마뱀부치",
    scientificName: "Correlophus ciliatus",
    aliases: ["크레", "크레스티드", "볏도마뱀붙이"],
    lifeStages: LIFE_STAGES,
    defaultFoodName: "인공 사료",
    lifeStageIds: { hatchling: 1, juvenile: 2, adult: 3 },
  },
  leopard_gecko: {
    code: "LEOPARD",
    officialName: "표범도마뱀부치",
    scientificName: "Eublepharis macularius",
    aliases: ["레오", "레오파드", "표범게코"],
    lifeStages: LIFE_STAGES,
    defaultFoodName: "귀뚜라미",
    lifeStageIds: { hatchling: 4, juvenile: 5, adult: 6 },
  },
};
