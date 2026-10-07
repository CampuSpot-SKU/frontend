// 행정 문의 로그 화면에서 쓰는 타입 — status.md 4장 10/7 한비 제안(`GET /admin/chat-logs`, 작업 1-18)과 필드명을 맞춤.
// backend 응답 형식이 확정·변경되면 이 파일만 같이 고치면 됨.

/** RAG 답변의 근거 한 건 — 1-4c에서 backend가 근거를 저장하기 전에는 `sources`가 null */
export interface ChatLogSource {
  title: string;
  /** 학칙 조항 번호 ("제12조" 등) — 조항이 아닌 안내·공지는 없음 */
  article_no: string | null;
  url: string | null;
}

/** 학생 질문 1개 + 바로 뒤 답변 1개 (세션·사용자 식별값은 익명 원칙으로 내려주지 않음) */
export interface ChatLogItem {
  id: string;
  /** 질문한 시각 */
  asked_at: string;
  question: string;
  /** 답변이 아직 없거나 저장되지 않았으면 null */
  answer: string | null;
  /** 의도 분류 결과 (신고·문의·애매함 등). 없으면 null */
  intent: string | null;
  /** 예: {"report_score": 5, "inquiry_score": 95} — 의도별 신뢰도 점수 */
  intent_scores: Record<string, number> | null;
  /** 의도 신뢰도가 낮거나 예외가 있었던 질문 (원본 debug_payload는 내려주지 않음) */
  low_confidence: boolean;
  /** 답변 근거. null = 근거 정보 없음(1-4c 전) */
  sources: ChatLogSource[] | null;
}

/** GET /admin/chat-logs */
export interface ChatLogList {
  total: number;
  items: ChatLogItem[];
}

/** 화면에서 고르는 조건 */
export interface ChatLogFilters {
  /** 최근 N일. null = 전체 기간 */
  days: number | null;
  /** true면 신뢰도 낮은 질문만 */
  lowConfidenceOnly: boolean;
}
