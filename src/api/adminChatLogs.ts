// 관리자 행정 문의 로그 API 호출 (작업 1-18 화면 — status.md 4장 10/7 한비 제안).
// 조회만 한다(데이터를 바꾸지 않음). 오류는 apiFetch가 던지는 ApiError를 그대로 던져 화면이 처리.
import { apiFetch } from "./client";
import type { ChatLogFilters, ChatLogList } from "../types/chatLogs";

/** 선택할 수 있는 기간 — null은 전체 기간 */
export const CHAT_LOG_PERIODS: { label: string; days: number | null }[] = [
  { label: "최근 7일", days: 7 },
  { label: "최근 30일", days: 30 },
  { label: "전체", days: null },
];

/** 한 번에 불러오는 개수 (backend 기본 50·최대 200) */
export const CHAT_LOG_PAGE_SIZE = 50;

/** 조회 주소의 쿼리 문자열 — 문의(RAG) 로그만 본다 */
export function buildChatLogQuery(
  filters: ChatLogFilters,
  offset: number,
): string {
  const params = new URLSearchParams({ intent: "문의" });
  if (filters.days !== null) params.set("days", String(filters.days));
  if (filters.lowConfidenceOnly) params.set("low_confidence", "true");
  params.set("limit", String(CHAT_LOG_PAGE_SIZE));
  params.set("offset", String(offset));
  return params.toString();
}

/** GET /admin/chat-logs — 최신순, offset으로 더 불러오기 */
export async function fetchChatLogs(
  token: string,
  filters: ChatLogFilters,
  offset = 0,
): Promise<ChatLogList> {
  return apiFetch<ChatLogList>(
    `/admin/chat-logs?${buildChatLogQuery(filters, offset)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}
