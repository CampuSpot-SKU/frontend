// 대화방 나누기·계정 연결 (작업 1-27, 명세 5-1 "POST /chat/sessions/{id}/claim").
//
// - [새 대화]: 지금 대화의 진행 중인 신고 흐름을 서버에서 끝내고(chatReset) 새 세션을 만들어
//   localStorage의 session_id를 바꾼다. 이전 세션은 지우지 않는다(이전 대화 조회·신고 조회에 씀).
// - claim: 로그인한 학생이면 지금 세션을 내 계정에 연결 → [이전 대화](1-28)에서 읽기 전용으로 다시 볼 수 있음.
//   로그인하지 않으면 아무것도 하지 않음(익명 그대로). 같은 세션·같은 토큰은 한 번만 호출.
//   실패해도 채팅에는 영향이 없어 조용히 넘어간다(다음 호출 때 다시 시도).
import { resetChatFlowOnLoad } from "./chatReset";
import { createSession } from "./chat";
import { apiFetch, getSessionId } from "./client";
import { pinReportSessions } from "./reports";
import { getUserToken } from "./userAuth";

let lastClaimed: string | null = null; // `${token}:${sessionId}` — 이미 연결한 조합

/** 로그인 상태면 지금 세션을 내 계정에 연결. 세션이 아직 없으면(첫 메시지 전) 건너뜀 — 첫 답변 뒤에 다시 불림 */
export async function claimSession(): Promise<void> {
  const token = getUserToken();
  const sessionId = getSessionId();
  if (!token || !sessionId) return;
  const key = `${token}:${sessionId}`;
  if (key === lastClaimed) return;
  try {
    await apiFetch<string>(`/chat/sessions/${sessionId}/claim`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    lastClaimed = key;
  } catch {
    // 401(토큰 만료)·404(세션 정리)·409(다른 계정의 세션)·네트워크 — 채팅은 그대로 계속
  }
}

/** [새 대화] — 진행 중이던 신고 흐름을 끝내고 새 세션으로 바꾼 뒤, 로그인 상태면 바로 연결 */
export async function startNewConversation(): Promise<void> {
  pinReportSessions(); // 예전 신고를 [새 대화] 뒤에도 조회할 수 있게 접수 세션을 기억
  resetChatFlowOnLoad(); // 이전 세션의 진행 중 신고 흐름 정리 + 대기 사진 삭제 (실패 무시)
  await createSession(); // 새 session_id를 localStorage에 저장
  await claimSession();
}
