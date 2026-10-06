import { z } from "zod";

/** MVP에서 지원하는 종. 볼파이톤은 신고 요건이 달라 초기 출시에서 제외 (10/6 IA 피드백 1번) */
export const SPECIES = ["crested_gecko", "leopard_gecko"] as const;
export const speciesSchema = z.enum(SPECIES);
export type Species = z.infer<typeof speciesSchema>;

export const SPECIES_LABEL: Record<Species, string> = {
  crested_gecko: "크레스티드 게코",
  leopard_gecko: "레오파드 게코",
};

export const sexSchema = z.enum(["male", "female", "unknown"]);

export const petSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "이름을 입력해 주세요").max(20),
  species: speciesSchema,
  /** 선택 입력. 단계를 늘리지 않고 필드로만 받는다 */
  morph: z.string().max(40).optional(),
  sex: sexSchema.default("unknown"),
  hatchedAt: z.iso.date().optional(),
  adoptedAt: z.iso.date().optional(),
  photoUrl: z.url().optional(),
});
export type Pet = z.infer<typeof petSchema>;

export const petCreateSchema = petSchema.omit({ id: true, photoUrl: true });
export type PetCreateInput = z.input<typeof petCreateSchema>;
