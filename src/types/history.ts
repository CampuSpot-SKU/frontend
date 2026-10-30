// 이전 대화 조회 API 응답 형식 (명세 5-1 "GET /chat/my-sessions", backend app/schemas/chat_history.py와 같음, 작업 1-27·1-28).
import type { InquirySource } from "./chat";

export interface MySessionItem {
  session_id: string;
  /** 첫 학생 메시지 앞 30자 (사진만이면 "사진 대화") */
  title: string;
  started_at: string;
  last_message_at: string;
  message_count: number;
}

export interface MySessionList {
  total: number;
  items: MySessionItem[];
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
  /** 문의 답변에만 있음 — 없으면 필드 자체가 없음 */
  sources?: InquirySource[];
}

export interface MySessionDetail {
  session_id: string;
  started_at: string;
  messages: HistoryMessage[];
  /** 메시지가 200개를 넘어 가장 최근 것만 왔음 */
  truncated: boolean;
}
