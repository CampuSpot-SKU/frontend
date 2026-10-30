// 관리자 화면에서 쓰는 타입 — backend `app/schemas/admin.py`(명세서 5-1 관리자용)와 필드명을 맞춤.
// backend 응답 형식이 바뀌면 이 파일만 같이 고치면 됨.

export type ReportStatus = "접수" | "배정" | "처리중" | "해결" | "종료";
export type Priority = "P1" | "P2" | "P3" | "P4";
/** 처리 중인 건만 계산됨. 해결·종료는 null */
export type SlaStatus = "온타임" | "임박" | "초과";

export interface NamedRef {
  id: string;
  name: string;
}

export interface TokenOut {
  access_token: string;
  token_type: "bearer";
}

/** GET /admin/reports 목록 한 줄 */
export interface AdminReportItem {
  id: string;
  display_no: number;
  category: NamedRef;
  priority: Priority;
  status: ReportStatus;
  building: NamedRef | null; // 건물 목록에서 못 찾으면 null → location_raw 사용
  floor: string | null;
  detail: string | null;
  location_raw: string | null;
  sla_deadline: string | null; // ISO 날짜 문자열
  sla_status: SlaStatus | null;
  created_at: string;
}

export interface AdminReportList {
  items: AdminReportItem[];
  total: number;
}

export type SortKey = "-created_at" | "created_at" | "sla_deadline" | "priority";

/** 목록 필터·정렬 — 빈 문자열은 "전체" */
export interface ReportFilters {
  status: ReportStatus | "";
  priority: Priority | "";
  sla_status: SlaStatus | "";
  category_id: string;
  sort: SortKey;
}

/** 상태 이력 한 줄 (GET /admin/reports/{id}의 status_history) */
export interface StatusHistoryItem {
  from_status: ReportStatus | null; // 최초 접수는 null
  to_status: ReportStatus;
  memo: string | null;
  changed_by: NamedRef | null; // null = 시스템(챗봇 접수 등)
  changed_at: string;
}

/** GET /admin/reports/{id} 상세 — 목록 필드 + 전체 필드 + 상태 이력 */
export interface AdminReportDetail extends AdminReportItem {
  category_id: string;
  building_id: string | null;
  description: string;
  photo_url: string | null;
  assigned_dept: string | null;
  updated_at: string;
  status_history: StatusHistoryItem[];
}

/** 유사 사례 한 건 — 같은 카테고리의 해결·종료된 과거 신고 (1-8c, GET /admin/reports/{id}/similar) */
export interface SimilarReport {
  id: string;
  display_no: number;
  category: NamedRef;
  building: NamedRef | null;
  floor: string | null;
  detail: string | null;
  location_raw: string | null;
  description: string;
  status: ReportStatus;
  created_at: string;
  /** 마지막으로 '해결'된 시각 */
  resolved_at: string | null;
  /** 그때 남긴 처리 메모 */
  resolution_memo: string | null;
  /** 설명 임베딩 코사인 거리 — 0에 가까울수록 비슷 */
  distance: number;
}

export interface SimilarReportList {
  /** false = 이 신고의 임베딩이 아직 없음(접수 다음 날 탐지 배치가 채움) */
  embedding_ready: boolean;
  items: SimilarReport[];
}

/** 신고 대화의 한 줄 (1-25) — 글과 시각만 */
export interface ConversationMessage {
  /** user = 학생, assistant = 챗봇 */
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

/** GET /admin/reports/{id}/conversation — 신고가 접수되기까지 학생·챗봇이 나눈 대화, 오래된 순 (1-25) */
export interface ReportConversation {
  report_id: string;
  display_no: number;
  /** 대화가 없으면(데모 데이터 신고 등) 빈 목록 */
  messages: ConversationMessage[];
  /** true = 80개를 넘어 최근 쪽만 남김 */
  truncated: boolean;
}

// ── 탐지·예측 (작업 1-8 문제 후보 화면, 1-11 예방 점검 화면 — 명세서 3-3, 5-1 관리자용) ──

export type ClusterStatus = "후보" | "승격" | "기각";

/** GET /admin/problem-clusters 한 줄 (PATCH 응답도 같은 모양) */
export interface ProblemCluster {
  id: string;
  building: NamedRef | null;
  detail: string | null;
  category: NamedRef;
  report_count: number; // 묶인 신고 수
  detected_at: string; // ISO 날짜 문자열
  status: ClusterStatus;
}

export interface ProblemClusterList {
  items: ProblemCluster[];
}

/** GET /admin/predictions 한 줄 — 같은 건물+카테고리 과거 신고 3건 이상일 때만 나옴 */
export interface PredictionItem {
  building: NamedRef | null;
  detail: string | null;
  category: NamedRef;
  avg_recurrence_days: number; // 소수 가능
  predicted_next_at: string; // ISO 날짜 문자열
}

export interface PredictionList {
  items: PredictionItem[];
}
