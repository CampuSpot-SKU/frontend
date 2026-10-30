// 학생 회원가입·로그인 API (작업 1-24, 명세 5-1 "/auth/signup·/auth/login·/auth/me").
// 로그인은 선택 사항 — 로그인하지 않아도 챗봇·신고는 익명으로 그대로 쓴다(계정과 신고는 연결하지 않음).
// 토큰은 관리자와 같은 이유로 sessionStorage에 둔다: 탭을 닫으면 로그아웃돼서 공용 PC에 로그인이 남지 않음.
import { ApiError, apiFetch } from "./client";

const TOKEN_KEY = "campuspot_user_token";
// 관리자 페이지(src/api/admin.ts)가 읽는 키와 같아야 함 — 관리자 계정으로 로그인하면 여기에 저장하고 /admin으로 넘김.
// (admin.ts는 1-25 작업 중이라 건드리지 않으려고 키만 맞춤)
const ADMIN_TOKEN_KEY = "campuspot_admin_token";

function saveAdminToken(token: string): void {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // 저장 실패 시 관리자 페이지에서 한 번 더 로그인하면 됨
  }
}

export interface UserSession {
  token: string;
  name: string;
}

interface TokenOut {
  access_token: string;
  token_type: "bearer";
  name: string;
  role?: "user" | "admin";
}

/** 로그인 결과 — 학생이면 세션, 관리자 계정이면 관리자 토큰을 저장해 둠(화면이 관리자 페이지로 넘김). */
export type LoginResult = { kind: "user"; session: UserSession } | { kind: "admin" };

export function getUserToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveUserToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 저장 실패 시 새로고침하면 다시 로그인해야 할 뿐, 동작에는 문제 없음
  }
}

export function clearUserToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // 무시
  }
}

function toSession(out: TokenOut): UserSession {
  saveUserToken(out.access_token);
  return { token: out.access_token, name: out.name };
}

export async function signup(loginId: string, password: string, name: string): Promise<UserSession> {
  const out = await apiFetch<TokenOut>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ login_id: loginId, password, name }),
  });
  return toSession(out);
}

/** 로그인 창은 하나 — 관리자 계정이면 backend가 관리자 토큰(role: "admin")을 준다 (10/30). */
export async function login(loginId: string, password: string): Promise<LoginResult> {
  const out = await apiFetch<TokenOut>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ login_id: loginId, password }),
  });
  if (out.role === "admin") {
    saveAdminToken(out.access_token); // 관리자 페이지(src/pages/admin)가 이 토큰으로 바로 열림
    return { kind: "admin" };
  }
  return { kind: "user", session: toSession(out) };
}

/** 새로고침 뒤 저장된 토큰으로 이름을 다시 받아온다. 토큰이 없거나 만료됐으면 null(토큰도 지움). */
export async function restoreSession(): Promise<UserSession | null> {
  const token = getUserToken();
  if (!token) return null;
  try {
    const me = await apiFetch<{ login_id: string; name: string }>("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { token, name: me.name };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) clearUserToken();
    return null;
  }
}

/** 에러를 학생에게 보여줄 한 문장으로. */
export function authErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const detail = (e.detail as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string") return detail; // 409·401·429는 backend 문구 그대로
    if (e.status === 422) return "입력 형식을 확인해 주세요. 아이디는 4~20자 영문 소문자·숫자·_, 비밀번호는 8자 이상이에요.";
    if (e.status === 503) return "지금은 로그인을 쓸 수 없어요. 잠시 후 다시 시도해 주세요.";
  }
  return "연결에 문제가 있어요. 잠시 후 다시 시도해 주세요.";
}
