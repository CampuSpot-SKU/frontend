// 챗봇 화면과 챗봇 API(src/api/chat.ts)에서 쓰는 타입.

/** 화면에 표시되는 말풍선 하나 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ── backend 응답 형식 (명세서 5-1 "사용자용 — 챗봇", backend app/schemas/chat.py와 같음) ──
// 필드명이 바뀌면 명세서 → backend → 이 파일 순서로 같이 바꿔야 함.

/** POST /chat/sessions 응답 */
export interface SessionCreated {
  session_id: string;
}

/** 신고 접수 중 — 빠진 정보(위치·상황)를 되묻는 중. '취소' 응답도 이 형식 */
export interface ReportFollowUp {
  intent: "report";
  follow_up_question: string;
  slots_filled: {
    location: string | null;
    category: string | null;
    description: string | null;
  };
}

/** 신고 접수 완료 */
export interface ReportCreated {
  intent: "report";
  report_created: true;
  report: {
    id: string;
    display_no: number;
    category: { id: string; name: string };
    priority: "P1" | "P2" | "P3" | "P4";
    status: "접수" | "배정" | "처리중" | "해결" | "종료";
  };
}

/** 신고인지 문의인지 애매 — 되묻기 */
export interface Unclear {
  intent: "unclear";
  clarifying_question: string;
}

/** 메시지 전송의 JSON 응답 (행정문의는 JSON이 아니라 SSE 스트림으로 옴) */
export type ChatJsonReply = ReportFollowUp | ReportCreated | Unclear;

/** 행정문의 SSE 마지막 이벤트의 근거 목록 항목 */
export interface InquirySource {
  article_no: string;
  title: string;
}
