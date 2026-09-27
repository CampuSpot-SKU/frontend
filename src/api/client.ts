// 백엔드 API 클라이언트 — 모든 백엔드 호출은 이 파일의 함수를 거친다.
//
// - 백엔드 주소: 빌드 시 VITE_API_BASE_URL이 있으면 그 값, 없으면 배포된 backend 주소(기본값).
//   Cloud Run 주소는 "서비스이름-프로젝트번호.리전.run.app" 규칙이라 바뀌지 않음 → 복사할 필요 없음.
// - 세션: 쿠키 대신 session_id를 브라우저 저장소(localStorage)에 보관 (명세서 D1 결정).
//   frontend와 backend 주소가 달라서 쿠키는 브라우저가 막을 수 있기 때문.

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ??
  "https://campuspot-backend-890230516680.asia-northeast3.run.app";

const API_PREFIX = "/api/v1";
const SESSION_KEY = "campuspot_session_id";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: unknown,
  ) {
    super(`API ${status}`);
  }
}

/** JSON 요청 공통 함수. path는 "/chat/sessions"처럼 /api/v1 뒤 부분만. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const body: unknown = res.headers.get("content-type")?.includes("application/json")
    ? await res.json()
    : await res.text();
  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body as T;
}

export function getSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null; // 사생활 보호 모드 등 저장소를 못 쓰는 경우
  }
}

export function saveSessionId(sessionId: string): void {
  try {
    localStorage.setItem(SESSION_KEY, sessionId);
  } catch {
    // 저장 실패해도 이번 대화는 메모리의 값으로 계속 진행 가능
  }
}
