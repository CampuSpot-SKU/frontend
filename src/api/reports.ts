// 본인 신고 상태 조회 API (작업 1-12, 명세 5-1 GET /reports/{display_no}).
//
// - 본인 확인: 쿼리파라미터 session_id (챗봇이 쓰는 것과 같은 브라우저 세션). 다른 브라우저에서
//   접수한 신고는 조회되지 않음 (익명 원칙 — 로그인 없음)
// - "내 신고" 목록: 이 브라우저에서 접수한 접수번호를 localStorage에 기억해 두고 조회 창에 보여줌
//   (저장이 막힌 브라우저여도 조회 자체는 번호 입력으로 가능)
import { ApiError, apiFetch, getSessionId } from "./client";
import type { MyReport } from "../types/report";

const MY_REPORTS_KEY = "campuspot_my_reports";
const MAX_MY_REPORTS = 10;

export async function fetchMyReport(displayNo: number): Promise<MyReport> {
  const sessionId = getSessionId();
  if (!sessionId) {
    // 이 브라우저로 챗봇을 한 번도 안 썼으면 본인 확인을 할 수 없음 → 찾을 수 없음과 같게 처리
    throw new ApiError(404, null);
  }
  return apiFetch<MyReport>(
    `/reports/${displayNo}?session_id=${encodeURIComponent(sessionId)}`,
  );
}

/** 조회 실패 원인별 안내 문구 */
export function reportErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404 || err.status === 403)
      return "해당 접수번호를 찾을 수 없어요. 이 브라우저에서 접수한 신고만 조회할 수 있어요.";
    if (err.status === 422) return "접수번호를 숫자로 입력해 주세요.";
    if (err.status === 429)
      return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  }
  return "지금은 조회할 수 없어요. 잠시 후 다시 시도해 주세요.";
}

/** 이 브라우저에서 접수한 접수번호 (최근 것부터) */
export function getMyReportNos(): number[] {
  try {
    const raw = localStorage.getItem(MY_REPORTS_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((n): n is number => Number.isInteger(n))
      : [];
  } catch {
    return [];
  }
}

/** 챗봇에서 접수가 완료되면 호출 — 조회 창의 "내 신고" 목록에 추가 */
export function rememberMyReport(displayNo: number): void {
  try {
    const next = [
      displayNo,
      ...getMyReportNos().filter((n) => n !== displayNo),
    ];
    localStorage.setItem(
      MY_REPORTS_KEY,
      JSON.stringify(next.slice(0, MAX_MY_REPORTS)),
    );
  } catch {
    // 저장이 막힌 브라우저 — 목록만 안 보일 뿐 조회는 번호 입력으로 가능
  }
}
