// 관리자 통계 API 호출 (작업 1-16 화면 — status.md 4장 10/5 규민 제안, 명세서 4-2 통계).
// 조회만 한다(데이터를 바꾸지 않음). 오류는 apiFetch가 던지는 ApiError를 그대로 던져 화면이 처리.
import { apiFetch } from "./client";
import type { AdminStats } from "../types/stats";

/** 선택할 수 있는 기간 — null은 전체 기간 (backend `days`는 1~365) */
export const STATS_PERIODS: { label: string; days: number | null }[] = [
  { label: "최근 7일", days: 7 },
  { label: "최근 30일", days: 30 },
  { label: "전체", days: null },
];

/** GET /admin/stats?days=N — days를 생략하면 전체 기간 */
export async function fetchStats(
  token: string,
  days: number | null,
): Promise<AdminStats> {
  const query = days === null ? "" : `?days=${days}`;
  return apiFetch<AdminStats>(`/admin/stats${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
