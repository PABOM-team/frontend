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

/** 칸별 오류. 목업은 fields로, 백엔드는 details {field, message} 하나로 준다 */
export function getFieldErrors(error: unknown): Record<string, string> {
  const body = getApiError(error);
  const detail = z.object({ field: z.string(), message: z.string() }).safeParse(body?.details);
  return {
    ...(detail.success ? { [detail.data.field]: detail.data.message } : {}),
    ...body?.fields,
  };
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
