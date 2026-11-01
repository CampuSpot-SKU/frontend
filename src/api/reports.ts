// 본인 신고 상태 조회 API (작업 1-12, 명세 5-1 GET /reports/{display_no}).
//
// - 본인 확인: 쿼리파라미터 session_id (챗봇이 쓰는 것과 같은 브라우저 세션). 다른 브라우저에서
//   접수한 신고는 조회되지 않음 (익명 원칙 — 로그인 없음)
// - "내 신고" 목록: 이 브라우저에서 접수한 접수번호를 localStorage에 기억해 두고 조회 창에 보여줌
//   (저장이 막힌 브라우저여도 조회 자체는 번호 입력으로 가능)
// - [새 대화](1-27)로 session_id가 바뀌어도 예전 신고를 조회할 수 있게, 접수할 때의 session_id를
//   접수번호와 함께 기억해 두고 조회 때 그 값을 쓴다 (기억이 없으면 지금 session_id)
// - 로그인한 학생은 계정에 연결된 대화에서 접수한 신고를 다른 기기에서도 조회 (학생 토큰, 11/1)
import { ApiError, apiFetch, getSessionId } from "./client";
import { getUserToken } from "./userAuth";
import type { MyReport, MyReportSummary } from "../types/report";

const MY_REPORTS_KEY = "campuspot_my_reports";
const MAX_MY_REPORTS = 10;
const REPORT_SESSIONS_KEY = "campuspot_report_sessions"; // { "접수번호": "접수한 session_id" }

function getReportSessions(): Record<string, string> {
  try {
    const raw = localStorage.getItem(REPORT_SESSIONS_KEY);
    const map: unknown = raw ? JSON.parse(raw) : {};
    return map && typeof map === "object" && !Array.isArray(map)
      ? (map as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

export async function fetchMyReport(displayNo: number): Promise<MyReport> {
  const saved = getReportSessions()[String(displayNo)];
  const sessionId = typeof saved === "string" ? saved : getSessionId();
  const token = getUserToken();
  if (!sessionId && !token) {
    // 이 브라우저로 챗봇을 한 번도 안 썼고 로그인도 안 했으면 본인 확인을 할 수 없음 → 찾을 수 없음과 같게 처리
    throw new ApiError(404, null);
  }
  // 세션 또는 로그인 계정 중 하나라도 맞으면 backend가 돌려줌
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
  return apiFetch<MyReport>(`/reports/${displayNo}${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/** 로그인한 학생 계정으로 접수한 신고 목록 (로그인 안 했으면 빈 목록) */
export async function fetchMyReportList(): Promise<MyReportSummary[]> {
  const token = getUserToken();
  if (!token) return [];
  const res = await apiFetch<{ reports: MyReportSummary[] }>("/reports/mine", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.reports;
}

/** 조회 실패 원인별 안내 문구 */
export function reportErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404 || err.status === 403)
      return "해당 접수번호를 찾을 수 없어요. 이 브라우저에서 접수했거나 로그인한 계정으로 접수한 신고만 조회할 수 있어요.";
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
    const kept = next.slice(0, MAX_MY_REPORTS);
    localStorage.setItem(MY_REPORTS_KEY, JSON.stringify(kept));
    // 이 신고를 접수한 세션 기억 — 목록에서 밀려난 번호는 함께 지움
    const sessionId = getSessionId();
    const prev = getReportSessions();
    const sessions: Record<string, string> = {};
    for (const n of kept) {
      const sid = n === displayNo ? sessionId : prev[String(n)];
      if (sid) sessions[String(n)] = sid;
    }
    localStorage.setItem(REPORT_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // 저장이 막힌 브라우저 — 목록만 안 보일 뿐 조회는 번호 입력으로 가능
  }
}

/** [새 대화]로 session_id를 바꾸기 직전에 호출 — 세션 기억이 없는 예전 접수번호(1-27 배포 전 접수)를
 *  지금 세션으로 기억해 둔다. 그 전엔 브라우저당 세션이 하나였으므로 지금 세션이 곧 접수한 세션. */
export function pinReportSessions(): void {
  const sessionId = getSessionId();
  if (!sessionId) return;
  try {
    const sessions = getReportSessions();
    for (const n of getMyReportNos()) {
      if (!sessions[String(n)]) sessions[String(n)] = sessionId;
    }
    localStorage.setItem(REPORT_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // 저장이 막힌 브라우저 — 예전 신고는 번호 조회가 안 될 수 있음
  }
}
