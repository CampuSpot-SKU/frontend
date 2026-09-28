// 챗봇 화면에서 쓰는 타입.

/** 화면에 표시되는 말풍선 하나 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
