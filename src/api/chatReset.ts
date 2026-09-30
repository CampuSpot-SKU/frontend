// 페이지를 새로 열 때(새로고침 포함) 진행 중이던 신고 흐름을 서버에서 끝낸다 (backend 1-3c, 명세 5-1).
//
// 왜 필요한가: 화면은 새로고침하면 대화 기록 없이 인사말만 보이는데, 서버는 localStorage에 남은 같은
// session_id의 이전 대화를 기억한다. 그대로 두면 끝나지 않은 신고에 새로 입력한 말이 "정정"으로 이어붙는다.
// session_id는 지우지 않는다 — 본인 신고 조회(1-12)가 session_id로 본인 확인을 하기 때문.
// 실패해도(오프라인·세션 없음 등) 채팅에는 영향이 없어 조용히 무시한다.
import { API_BASE_URL, API_PREFIX, getSessionId } from "./client";

export function resetChatFlowOnLoad(): void {
  const sessionId = getSessionId();
  if (!sessionId) return;
  void fetch(`${API_BASE_URL}${API_PREFIX}/chat/sessions/${sessionId}/reset`, {
    method: "POST",
    keepalive: true,
  }).catch(() => undefined);
}
