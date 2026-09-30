// 본인 신고 상태 조회(작업 1-12)에서 쓰는 타입.
// backend 응답 형식은 명세서 5-1 "GET /reports/{display_no}" 기준.
// 필드명이 바뀌면 명세서 → backend → 이 파일 순서로 같이 바꿔야 함.

/** 신고 처리 상태 (명세 3-1 ESM 워크플로우 순서) */
export type ReportStatus = "접수" | "배정" | "처리중" | "해결" | "종료";

export const REPORT_STATUS_ORDER: ReportStatus[] = [
  "접수",
  "배정",
  "처리중",
  "해결",
  "종료",
];

export type Priority = "P1" | "P2" | "P3" | "P4";

/** 상태 변경 이력 한 줄. 학생 화면이라 담당자 이름·메모는 backend가 안 줄 수도 있어서 선택 필드 */
export interface StatusHistoryItem {
  from_status?: ReportStatus | null; // 최초 접수는 null
  to_status: ReportStatus;
  changed_at: string; // ISO 8601
  memo?: string | null;
}

/** GET /reports/{display_no}?session_id=... 응답 */
export interface MyReport {
  display_no: number;
  /** 명세 5-1 원칙대로 {id, name} 객체. 글자로 오는 경우도 처리 */
  category: { id: string; name: string } | string;
  priority: Priority;
  status: ReportStatus;
  created_at: string; // ISO 8601
  status_history: StatusHistoryItem[];
}
