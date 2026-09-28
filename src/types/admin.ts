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
