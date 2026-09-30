// 챗봇 화면과 챗봇 API(src/api/chat.ts)에서 쓰는 타입.

/** 화면에 표시되는 말풍선 하나 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ── backend 요청·응답 형식 (명세서 5-1 "사용자용 — 챗봇", backend app/schemas/chat.py와 같음) ──
// 필드명이 바뀌면 명세서 → backend → 이 파일 순서로 같이 바꿔야 함.

/** POST /chat/sessions 응답 */
export interface SessionCreated {
  session_id: string;
}

/** 버튼을 눌렀을 때 메시지와 같이 보내는 값 (명세 4-1 신고 흐름 개편) */
export type ChatAction =
  "switch_to_inquiry" | "confirm_report" | "cancel_report";

/** 접수 폼 값 — [접수] 누를 때 최종 값으로 보냄 (B단계 1-3d부터는 채팅마다 보냄) */
export interface ReportDraft {
  building: string;
  floor: string;
  detail: string;
  description: string;
}

/** 메시지 전송 요청 본문 */
export interface MessageIn {
  content: string;
  action?: ChatAction;
  draft?: ReportDraft;
}

/**
 * 지금까지 대화로 알아낸 신고 내용 (모르면 null).
 * building·floor·detail은 backend 1-3c에서 추가됨 — 그 전 backend는 이 세 필드를 보내지 않음
 */
export interface SlotsFilled {
  location: string | null;
  category: string | null;
  description: string | null;
  building?: string | null;
  floor?: string | null;
  detail?: string | null;
}

/** 신고 접수 중 — 빠진 정보(위치·상황)를 되묻는 중 */
export interface ReportFollowUp {
  intent: "report";
  follow_up_question: string;
  slots_filled: SlotsFilled;
  /** 눌러서 고를 수 있는 추천 답변 (접수 제안·되묻기 등). 누르면 그 글자를 일반 메시지로 보냄 (직접 입력도 항상 가능). 없으면 null */
  choices?: string[] | null;
}

/** 요약 확인 단계 — [접수] [수정] [취소] 버튼을 보여줌 (1-3c) */
export interface ReportConfirm {
  intent: "report";
  confirm_required: true;
  summary: string;
  follow_up_question: string; // summary와 같은 문구 (1-5b 전 화면을 위한 하위 호환)
  slots_filled: SlotsFilled;
  /** 눌러서 고를 수 있는 추천 답변 ("네, 접수해 주세요" 등). 직접 입력도 가능 */
  choices?: string[] | null;
}

/** 신고 취소됨 (1-3c) */
export interface ReportCancelled {
  intent: "report";
  report_cancelled: true;
  message: string;
  follow_up_question: string; // message와 같은 문구 (하위 호환)
  slots_filled: SlotsFilled;
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
  /** backend가 만든 완성 안내 문구(접수번호·위치·AI 판정 이유). 1-3c에서 추가 — 있으면 그대로 표시 */
  message?: string;
}

/** 신고인지 문의인지 애매 — 되묻기 */
export interface Unclear {
  intent: "unclear";
  clarifying_question: string;
}

/** 메시지 전송의 JSON 응답 (행정문의는 JSON이 아니라 SSE 스트림으로 옴) */
export type ChatJsonReply =
  ReportFollowUp | ReportConfirm | ReportCancelled | ReportCreated | Unclear;

/** 행정문의 SSE 마지막 이벤트의 근거 목록 항목 */
export interface InquirySource {
  article_no: string;
  title: string;
}

// ── 화면용 ──

/**
 * 신고 흐름의 현재 단계 — 화면이 접수 폼·버튼을 보여줄지 정하는 데 씀
 * - collecting: 대화로 위치·상황을 채우는 중 → 폼 표시 + [안내만 받을래요]
 * - confirming: 요약 확인 중 → 폼 표시 + [접수] [수정] [취소]
 * - ended: 접수 완료·취소 → 폼 숨김
 * - none: 신고 흐름이 아님(행정문의·애매함), 또는 1-3c 전 backend라 새 화면을 쓰지 않음
 */
export type ReportPhase = "collecting" | "confirming" | "ended" | "none";

/** sendChatMessage()의 결과 — 말풍선 문구 + 신고 흐름 단계 */
export interface ChatResult {
  text: string;
  phase: ReportPhase;
  /** 대화로 알아낸 폼 값 (collecting·confirming일 때만) */
  draft?: ReportDraft;
  /** 추천 답변 칩 (없으면 undefined) */
  choices?: string[];
}

// ── GET /locations 응답 (명세 5-1, 접수 폼 위치 선택 목록 — 건물 → 층 → 세부장소) ──
// 각 목록의 맨 끝 항목은 {label: "목록에 없음 (직접 입력)", custom: true}

/** "목록에 없음 (직접 입력)" 항목 */
export interface LocationCustomItem {
  label: string;
  custom: true;
}

export interface LocationPlace {
  label: string;
  room_no?: string | null;
  use?: string | null;
  custom?: false;
}

export interface LocationFloor {
  /** "B1"·"3" 등. 층 구분이 없는 묶음(입구 등)은 null */
  floor: string | null;
  label: string;
  places: (LocationPlace | LocationCustomItem)[];
  custom?: false;
}

export interface LocationBuilding {
  /** 건물 이름. 건물 DB에 없는 "실외·기타" 묶음도 이 형식 (고르면 건물은 비우고 세부장소만 보냄) */
  name: string;
  floors: (LocationFloor | LocationCustomItem)[];
  custom?: false;
}

export interface LocationOptions {
  buildings: (LocationBuilding | LocationCustomItem)[];
}
