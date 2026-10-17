import { z } from "zod";

/** 백엔드 공통 성공 응답 {resultType:"SUCCESS", success:{data}}에서 data만 꺼낸다 */
export const successEnvelope = <T extends z.ZodType>(data: T) =>
  z
    .object({ resultType: z.literal("SUCCESS"), success: z.object({ data }) })
    // 제네릭 안에서는 zod가 success.data의 타입을 좁히지 못해 직접 알려 준다
    .transform((body) => (body.success as { data: z.output<T> }).data);
