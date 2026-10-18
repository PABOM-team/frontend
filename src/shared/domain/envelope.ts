import { z } from "zod";

/** 백엔드 공통 성공 응답 {resultType:"SUCCESS", success:{data}}에서 data만 꺼낸다 */
export const successEnvelope = <T extends z.ZodType>(data: T) =>
  z
    .object({ resultType: z.literal("SUCCESS"), success: z.object({ data }) })
    // 제네릭 안에서는 zod가 success.data의 타입을 좁히지 못해 직접 알려 준다
    .transform((body) => (body.success as { data: z.output<T> }).data);

/**
 * 인증 API(콜백·refresh·약관 동의)는 스펙상 봉투 없이 본문을 바로 준다.
 * 다른 API처럼 봉투에 싸서 줘도 로그인이 깨지지 않게 둘 다 받는다
 */
export const bareOrEnveloped = <T extends z.ZodType>(data: T) =>
  z.union([successEnvelope(data), data]);
