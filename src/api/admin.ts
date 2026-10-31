// 관리자 API 호출 — 관리자 화면은 이 파일의 함수만 사용한다 (명세서 5-1 관리자용).
//
// 로그인 토큰(JWT)은 sessionStorage에 보관: 브라우저 탭을 닫으면 자동 로그아웃돼서
// 공용 PC에서 로그인 상태가 남는 것을 막는다. (챗봇 session_id는 localStorage — 성격이 다름)
import { apiFetch } from "./client";
import type {
  AdminReportDetail,
  AdminReportList,
  ReportConversation,
  ReportFilters,
  ReportStatus,
  ReportSummary,
  SimilarReportList,
  TokenOut,
} from "../types/admin";

const TOKEN_KEY = "campuspot_admin_token";
/** 한 번에 가져오는 최대 건수 (backend 허용 최대값, 명세 5-1) */
export const REPORT_LIMIT = 200;

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveAdminToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 저장 실패 시 새로고침하면 다시 로그인해야 할 뿐, 동작에는 문제 없음
  }
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // 무시
  }
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** POST /admin/auth/login — 성공하면 토큰을 저장하고 돌려준다. */
export async function login(
  loginId: string,
  password: string,
): Promise<string> {
  const res = await apiFetch<TokenOut>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ login_id: loginId, password }),
  });
  saveAdminToken(res.access_token);
  return res.access_token;
}

/** 필터·정렬을 쿼리스트링으로 (빈 값은 보내지 않음) */
export function buildReportQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.sla_status) params.set("sla_status", filters.sla_status);
  if (filters.category_id) params.set("category_id", filters.category_id);
  if (filters.open_only) params.set("open_only", "true");
  params.set("sort", filters.sort);
  params.set("limit", String(REPORT_LIMIT));
  return params.toString();
}

/** GET /admin/reports — 접수 목록(큐). */
export async function fetchReports(
  token: string,
  filters: ReportFilters,
): Promise<AdminReportList> {
  return apiFetch<AdminReportList>(
    `/admin/reports?${buildReportQuery(filters)}`,
    { headers: authHeaders(token) },
  );
}

/** GET /admin/reports/summary — 목록 위 숫자 띠. */
export async function fetchReportSummary(token: string): Promise<ReportSummary> {
  return apiFetch<ReportSummary>("/admin/reports/summary", {
    headers: authHeaders(token),
  });
}

/** GET /admin/reports/{id} — 상세보기(상태 이력 포함). */
export async function fetchReportDetail(
  token: string,
  id: string,
): Promise<AdminReportDetail> {
  return apiFetch<AdminReportDetail>(`/admin/reports/${id}`, {
    headers: authHeaders(token),
  });
}

/** PATCH /admin/reports/{id}/status — 허용되지 않는 전이는 409(ApiError). */
export async function changeReportStatus(
  token: string,
  id: string,
  toStatus: ReportStatus,
  memo: string,
): Promise<AdminReportDetail> {
  return apiFetch<AdminReportDetail>(`/admin/reports/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ to_status: toStatus, memo: memo.trim() || null }),
  });
}

/** GET /admin/reports/{id}/similar — 비슷한 과거 해결 건과 처리 메모 (1-8c). */
export async function fetchSimilarReports(
  token: string,
  id: string,
): Promise<SimilarReportList> {
  return apiFetch<SimilarReportList>(`/admin/reports/${id}/similar`, {
    headers: authHeaders(token),
  });
}

/** GET /admin/reports/{id}/conversation — 신고가 접수되기까지의 대화 (1-25, 조회만). */
export async function fetchReportConversation(
  token: string,
  id: string,
): Promise<ReportConversation> {
  return apiFetch<ReportConversation>(`/admin/reports/${id}/conversation`, {
    headers: authHeaders(token),
  });
}
