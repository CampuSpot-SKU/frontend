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
