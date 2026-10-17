import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameYear,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { ko } from "date-fns/locale";

/**
 * 날짜 표시 모음. 시간대는 기기와 무관하게 Asia/Seoul 기준이 원칙이지만
 * MVP는 사용자 대부분이 한국이라 기기 시간으로 계산한다 [제안].
 */

/** YYYY-MM-DD */
export const toYmd = (date: Date) => format(date, "yyyy-MM-dd");
export const fromYmd = (ymd: string) => parseISO(`${ymd}T00:00:00`);
export const todayYmd = () => toYmd(new Date());

/** 10월 7일 (수) */
export const formatDayLabel = (date: Date | string) =>
  format(typeof date === "string" ? fromYmd(date) : date, "M월 d일 (EEE)", { locale: ko });

/** 10/10(토) */
export const formatShortDay = (date: Date | string) =>
  format(typeof date === "string" ? fromYmd(date) : date, "M/d(EEE)", { locale: ko });

/** 2026년 3월 2일 */
export const formatFullDate = (date: Date | string) =>
  format(typeof date === "string" ? fromYmd(date) : date, "yyyy년 M월 d일", { locale: ko });

/** 10/8 */
export const formatMonthDay = (date: Date | string) =>
  format(typeof date === "string" ? fromYmd(date) : date, "M/d");

/** 오후 8:02 */
export const formatTime = (iso: string) => format(parseISO(iso), "a h:mm", { locale: ko });

/** 10월 7일 (수) 오후 8:02 */
export const formatDateTime = (iso: string) =>
  format(parseISO(iso), "M월 d일 (EEE) a h:mm", { locale: ko });

/** 2025년 5월 (올해면 연도 생략하지 않음: 함께했던 기간 표시용) */
export const formatYearMonth = (date: Date | string) =>
  format(typeof date === "string" ? fromYmd(date) : date, "yyyy년 M월");

export function formatRelativeDay(ymd: string, today = new Date()) {
  const diff = differenceInCalendarDays(fromYmd(ymd), startOfDay(today));
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === -1) return "어제";
  if (diff < 0) return `${-diff}일 전`;
  return `${diff}일 뒤`;
}

/** 기록 시각: 오늘 기준 '지금'·'어제'를 같은 시각으로 */
export function nowIso() {
  return new Date().toISOString();
}

export function yesterdaySameTimeIso() {
  return subDays(new Date(), 1).toISOString();
}

/** 고른 날짜에 지금 시각을 붙인다 (과거 날짜 기록용). 오늘이면 지금 */
export function ymdWithNowTime(ymd: string) {
  const now = new Date();
  const date = fromYmd(ymd);
  if (toYmd(now) === ymd) return now.toISOString();
  date.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return date.toISOString();
}

export function withTime(ymd: string, time: string) {
  const [h, m] = time.split(":").map(Number);
  const date = fromYmd(ymd);
  date.setHours(h ?? 0, m ?? 0, 0, 0);
  return date.toISOString();
}

export const timeOf = (iso: string) => format(parseISO(iso), "HH:mm");
export const ymdOf = (iso: string) => format(parseISO(iso), "yyyy-MM-dd");

export { addDays, differenceInCalendarDays, isSameYear, subDays };
