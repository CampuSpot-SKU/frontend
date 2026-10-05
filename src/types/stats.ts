// 통계 화면에서 쓰는 타입 — backend `app/schemas/stats.py`(status.md 4장 10/5 규민 제안, 작업 1-16)와 필드명을 맞춤.
// backend 응답 형식이 바뀌면 이 파일만 같이 고치면 됨.
import type { NamedRef, Priority, ReportStatus } from "./admin";

/** SLA 준수 — 결과가 정해진 건만 셈(마감 전 처리 중·마감 없는 건은 제외) */
export interface SlaSummary {
  /** 마감 안에 해결 */
  met: number;
  /** 마감 넘겨 해결 + 처리 중인데 이미 마감이 지난 건 */
  breached: number;
  /** met ÷ (met + breached) × 100, 소수 1자리. 셀 건이 없으면 null */
  compliance_pct: number | null;
}

/** 한 묶음(전체·카테고리·우선순위)의 지표 */
export interface StatsGroup {
  /** 기간 안에 접수된 신고 수 */
  count: number;
  /** 그중 해결·종료된 수 */
  resolved_count: number;
  /** 접수 → 마지막 해결 평균 시간(소수 1자리). 해결 건이 없으면 null */
  avg_resolution_hours: number | null;
  sla: SlaSummary;
}

export interface CategoryStats extends StatsGroup {
  category: NamedRef;
  /** 꺼진 카테고리도 기간 안 신고가 있으면 나옴 */
  is_active: boolean;
}

export interface PriorityStats extends StatsGroup {
  priority: Priority;
}

export interface StatusCount {
  status: ReportStatus;
  count: number;
}

export interface StatsPeriod {
  /** 요청한 기간(일). null = 전체 */
  days: number | null;
  since: string | null;
  /** 계산 시각 (SLA 초과 판정 기준) */
  until: string;
}

/** GET /admin/stats */
export interface AdminStats {
  period: StatsPeriod;
  total: StatsGroup;
  /** 접수→종료 순서, 0건도 포함 */
  by_status: StatusCount[];
  /** 건수 많은 순 */
  by_category: CategoryStats[];
  /** P1→P4, 0건도 포함 */
  by_priority: PriorityStats[];
}
