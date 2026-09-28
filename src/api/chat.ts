// 챗봇 API 호출 — 챗봇 화면은 이 파일의 sendChatMessage만 사용한다.
//
// ⚠️ 지금은 가짜 응답(목업). backend의 챗봇 API(작업 1-3)가 아직 없어서,
// 화면을 먼저 만들 수 있도록 고정 문구를 돌려준다.
// 1-3이 배포되면 이 파일 안에서만 명세서 5-1대로 바꾸면 됨 (화면 코드는 그대로):
//   1) 세션 없으면 POST /chat/sessions → saveSessionId()  (client.ts의 getSessionId/saveSessionId)
//   2) POST /chat/sessions/{session_id}/messages {content}
//   3) 응답 종류(report 되묻기 / report_created / unclear / 행정문의 SSE)에 맞게 문구로 변환

const MOCK_DELAY_MS = 600;

/** 사용자 메시지를 보내고 챗봇의 답변 문구를 돌려준다. */
export async function sendChatMessage(content: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  return `(테스트 응답) 아직 서버와 연결되지 않은 화면이에요.\n보내신 내용: "${content}"`;
}
