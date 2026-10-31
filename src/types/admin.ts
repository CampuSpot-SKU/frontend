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

/** 신고가 묶인 반복 신고(기각된 묶음은 없음) — 목록에서 같은 건끼리 모아 보여줄 때 씀 */
export interface ReportClusterRef {
  id: string;
  report_count: number; // 그 묶음에 묶인 신고 전체 수
  status: ClusterStatus;
  whole_building?: boolean; // 호실이 달라도 건물 전체 원인으로 묶인 건
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
  description: string;
  cluster: ReportClusterRef | null;
}

/** GET /admin/reports/summary — 목록 위 숫자 띠 (전체 신고 기준) */
export interface ReportSummary {
  total: number;
  by_status: Record<ReportStatus, number>;
  open: number; // 접수+배정+처리중
  sla_over: number;
  sla_soon: number;
  urgent_open: number; // 처리 중인 P1
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
  /** true = 접수·배정·처리중만 (status가 비어 있을 때 "처리 필요" 보기) */
  open_only: boolean;
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
  /** 같은 묶음의 신고 전체(자기 자신 포함), 접수 순. 묶음이 없으면 빈 목록 */
  cluster_reports: AdminReportItem[];
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

// ── 탐지·예측 (작업 1-8 반복 신고 화면, 1-11 예방 점검 화면 — 명세서 3-3, 5-1 관리자용) ──

export type ClusterStatus = "후보" | "승격" | "기각";

/** GET /admin/problem-clusters 한 줄 (PATCH 응답도 같은 모양) — 반복 신고 묶음 */
export interface ProblemCluster {
  id: string;
  building: NamedRef | null;
  detail: string | null;
  category: NamedRef;
  report_count: number; // 묶인 신고 수
  open_count: number; // 그중 해결 전(접수·배정·처리중)인 신고 수
  first_reported_at: string | null;
  last_reported_at: string | null;
  detected_at: string; // ISO 날짜 문자열
  status: ClusterStatus;
}

/** GET /admin/problem-clusters/{id} — 묶음 + 묶인 신고 전체(접수 순) */
export interface ProblemClusterDetail extends ProblemCluster {
  reports: AdminReportItem[];
}

export type AdvanceTarget = "배정" | "처리중" | "해결";

/** POST /admin/problem-clusters/{id}/advance 응답 */
export interface ClusterAdvanceResult extends ProblemClusterDetail {
  changed_count: number;
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
  last_occurred_at: string | null;
}

export interface PredictionList {
  items: PredictionItem[];
}
