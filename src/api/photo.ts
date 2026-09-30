// 사진 첨부 API 호출 (작업 1-10, 명세 5-1 "사진 업로드"·11장).
//
// 접수 "전에" 사진을 서버의 대기 자리에 올려 두고(세션당 1장, 다시 올리면 교체),
// 신고가 접수되는 순간 backend가 그 신고에 붙인다. 그래서 화면은 신고 접수 API를 바꾸지 않고
// 이 파일의 세 함수만 쓴다.
//   - POST   /chat/sessions/{session_id}/photo   multipart/form-data, 필드 이름 "file" → 201
//   - DELETE /chat/sessions/{session_id}/photo   → 204 (올린 사진이 없어도 204)
// 오류 문구·상태 코드는 briefs/1-10.md 2장 "API 계약"과 같다.
//
// 주의: apiFetch()는 모든 요청에 Content-Type: application/json을 붙여서 파일 업로드에 쓸 수 없다.
// FormData를 fetch로 직접 보내고 Content-Type은 지정하지 않는다 (브라우저가 경계값이 든 헤더를 자동으로 붙임).
import { createSession } from "./chat";
import { API_BASE_URL, API_PREFIX, ApiError, getSessionId } from "./client";

/** 서버와 같은 제한 (backend MAX_BYTES). 화면에서 미리 검사하고 서버가 최종 검사한다. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export const PHOTO_TOO_BIG_MESSAGE = "사진은 5MB 이하만 올릴 수 있어요.";
export const PHOTO_BAD_TYPE_MESSAGE = "jpg 또는 png 사진만 올릴 수 있어요.";

/** 업로드 전에 화면에서 하는 검사 — 통과면 null, 아니면 사용자에게 보여줄 문구 (서버 문구와 같음) */
export function validatePhotoFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return PHOTO_BAD_TYPE_MESSAGE;
  if (file.size > PHOTO_MAX_BYTES) return PHOTO_TOO_BIG_MESSAGE;
  return null;
}

/** 대기 사진으로 올린다. 이미 올린 사진이 있으면 서버에서 교체된다. 실패하면 ApiError(또는 네트워크 오류)를 던진다. */
export async function uploadPhoto(file: File): Promise<void> {
  let sessionId = getSessionId() ?? (await createSession());
  let res = await postPhoto(sessionId, file);
  if (res.status === 404) {
    // 서버에서 세션이 사라진 경우(DB 초기화 등) — 새 세션을 만들어 한 번만 다시 올린다
    sessionId = await createSession();
    res = await postPhoto(sessionId, file);
  }
  if (!res.ok) {
    throw new ApiError(res.status, await readBody(res));
  }
}

/** 서버의 대기 사진을 지운다. 세션이 아직 없거나 올린 사진이 없어도 성공으로 본다. */
export async function deletePhoto(): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) return;
  const res = await fetch(
    `${API_BASE_URL}${API_PREFIX}/chat/sessions/${sessionId}/photo`,
    { method: "DELETE" },
  );
  // 세션이 서버에서 사라졌으면(404) 지울 사진도 없다
  if (!res.ok && res.status !== 404) {
    throw new ApiError(res.status, await readBody(res));
  }
}

/** 실패 원인별로 사용자에게 보여줄 문구 (413·415·503·404는 서버 문구와 같음) */
export function photoErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 413) return PHOTO_TOO_BIG_MESSAGE;
    if (err.status === 415) return PHOTO_BAD_TYPE_MESSAGE;
    if (err.status === 404) return "대화 세션을 찾을 수 없어요.";
    if (err.status === 429)
      return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
    if (err.status === 503)
      return "사진을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  return "사진을 처리하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.";
}

function postPhoto(sessionId: string, file: File): Promise<Response> {
  const form = new FormData();
  form.append("file", file);
  return fetch(
    `${API_BASE_URL}${API_PREFIX}/chat/sessions/${sessionId}/photo`,
    {
      method: "POST",
      body: form, // Content-Type을 직접 지정하지 않는다 (위 주의 참고)
    },
  );
}

async function readBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
