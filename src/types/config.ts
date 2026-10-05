// 설정 관리 화면에서 쓰는 타입 — backend `app/schemas/config.py`(명세서 5-1 "설정 API 형식")와 필드명을 맞춤.
// backend 응답 형식이 바뀌면 이 파일만 같이 고치면 됨.

import type { Priority } from "./admin";

export type Level = "고" | "저";

// ── 서버가 주고받는 모양 ──

export interface CategoryItem {
  id: string;
  name: string;
  is_active: boolean;
}
export interface CategoryList {
  items: CategoryItem[];
}
/** PUT 요청의 한 줄 — id가 없으면 새로 추가 */
export interface CategoryIn {
  id?: string;
  name: string;
  is_active: boolean;
}

export interface BuildingItem {
  id: string;
  name: string;
  aliases: string[];
}
export interface BuildingList {
  items: BuildingItem[];
}
export interface BuildingIn {
  id?: string;
  name: string;
  aliases: string[];
}

export interface PriorityRule {
  impact: Level;
  urgency: Level;
  resulting_priority: Priority;
}
export interface PriorityMatrix {
  items: PriorityRule[];
}

export interface SlaItem {
  priority: Priority;
  sla_hours: number;
  escalation_50pct_action: string | null;
  escalation_100pct_action: string | null;
  escalation_150pct_action: string | null;
}
export interface SlaList {
  items: SlaItem[];
}

export interface DetectionSettings {
  threshold_count: number;
  threshold_hours: number;
}

/** 기본 카테고리 — 분류가 안 될 때 쓰는 값이라 끄거나 이름을 바꿀 수 없음 (명세 5-1) */
export const DEFAULT_CATEGORY_NAME = "기타";

/** 설정 값 범위 — backend 검사와 같은 숫자 (넘으면 422) */
export const SLA_HOURS_RANGE = { min: 1, max: 8760 } as const;
export const DETECTION_COUNT_RANGE = { min: 2, max: 100 } as const;
export const DETECTION_HOURS_RANGE = { min: 1, max: 8760 } as const;
