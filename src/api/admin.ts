// 관리자 API 호출 — 관리자 화면은 이 파일의 함수만 사용한다 (명세서 5-1 관리자용).
//
// 로그인 토큰(JWT)은 sessionStorage에 보관: 브라우저 탭을 닫으면 자동 로그아웃돼서
// 공용 PC에서 로그인 상태가 남는 것을 막는다. (챗봇 session_id는 localStorage — 성격이 다름)
import { apiFetch } from "./client";
import type { AdminReportList, TokenOut } from "../types/admin";

const TOKEN_KEY = "campuspot_admin_token";

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

/** GET /admin/reports — 접수 목록. 필터·정렬은 다음 단계에서 추가. */
export async function fetchReports(token: string): Promise<AdminReportList> {
  return apiFetch<AdminReportList>("/admin/reports", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
