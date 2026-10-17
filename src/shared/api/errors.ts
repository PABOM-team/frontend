import { isHTTPError, isNetworkError, isTimeoutError } from "ky";
import { z } from "zod";

/**
 * 서버 오류 형식: {resultType:"FAIL", error:{code,message,details}}. message는 그대로 화면에 보여 준다.
 * fields(칸별 오류)는 아직 목업만 준다
 */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
    details: z.unknown().optional(),
    traceId: z.string().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>["error"];

export function getApiError(error: unknown): ApiErrorBody | null {
  if (!isHTTPError(error)) return null;
  const parsed = apiErrorSchema.safeParse(error.data);
  return parsed.success ? parsed.data.error : null;
}

export function getHttpStatus(error: unknown) {
  return isHTTPError(error) ? error.response.status : null;
}

export function isOfflineError(error: unknown) {
  return (
    isNetworkError(error) ||
    isTimeoutError(error) ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  );
}

export function getErrorMessage(error: unknown, fallback = "잠시 뒤 다시 시도해 주세요.") {
  if (isOfflineError(error)) return "연결을 확인해 주세요.";
  return getApiError(error)?.message ?? fallback;
}
