// 이전 대화 조회 API (작업 1-28 — 챗봇 화면 왼쪽 사이드바, 명세 5-1 "GET /chat/my-sessions").
// 로그인한 학생 토큰이 필요하다. 읽기 전용 — 이어 쓰는 API는 없다.
import { ApiError, apiFetch } from "./client";
import { getUserToken } from "./userAuth";
import type { MySessionDetail, MySessionList } from "../types/history";

export const PAGE_SIZE = 30;

function authHeaders(): HeadersInit {
  const token = getUserToken();
  if (!token) throw new ApiError(401, null); // 로그인하지 않았으면 부르지 않음
  return { Authorization: `Bearer ${token}` };
}

export function fetchMySessions(offset = 0): Promise<MySessionList> {
  return apiFetch<MySessionList>(
    `/chat/my-sessions?limit=${PAGE_SIZE}&offset=${offset}`,
    {
      headers: authHeaders(),
    },
  );
}

export function fetchMySession(sessionId: string): Promise<MySessionDetail> {
  return apiFetch<MySessionDetail>(
    `/chat/my-sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: authHeaders(),
    },
  );
}

/** 실패 원인별 안내 문구 */
export function historyErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401)
      return "로그인이 만료됐어요. 다시 로그인하면 이전 대화를 볼 수 있어요.";
    if (err.status === 404) return "찾을 수 없는 대화예요.";
    if (err.status === 429)
      return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  }
  return "이전 대화를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
}

/** 사이드바에 쓰는 짧은 시각: 오늘이면 "오후 3:05", 올해면 "10월 29일", 그 전이면 "2025. 10. 29." */
export function shortTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("ko-KR", {
      hour: "numeric",
      minute: "2-digit",
    });
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  return d.toLocaleDateString("ko-KR");
}
