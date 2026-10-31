// 탐지·예측 화면의 표시 규칙 (작업 1-8·1-11) — 순수 함수로 분리해 테스트하기 쉽게 둠.
import type { NamedRef } from "../../types/admin";

/** 건물 + 세부위치. 건물이 없으면 세부위치만, 둘 다 없으면 "-" */
export function clusterLocationText(
  building: NamedRef | null,
  detail: string | null,
): string {
  const text = [building?.name, detail].filter(Boolean).join(" ");
  return text || "-";
}

import type { ClusterStatus } from "../../types/admin";

/** 반복 신고 묶음 상태의 화면 표시 (API 값은 후보·승격·기각 그대로) */
export const CLUSTER_STATUS_LABEL: Record<ClusterStatus, string> = {
  후보: "확인 필요",
  승격: "문제로 등록",
  기각: "문제 아님",
};

export const CLUSTER_STATUS_STYLE: Record<ClusterStatus, string> = {
  후보: "bg-amber-100 text-amber-800",
  승격: "bg-indigo-100 text-indigo-700",
  기각: "bg-gray-100 text-gray-600",
};

export type PredictionLabel = "지남" | "곧" | "여유";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * 다음 예상 시점이 오늘 기준으로
 * 이전 날짜 → "지남", 7일 이내(오늘 포함) → "곧", 그 외 → "여유".
 */
export function predictionLabel(
  predictedNextAt: string,
  now: number = Date.now(),
): PredictionLabel {
  const diffDays = Math.round(
    (startOfDay(new Date(predictedNextAt).getTime()) - startOfDay(now)) /
      DAY_MS,
  );
  if (diffDays < 0) return "지남";
  if (diffDays <= 7) return "곧";
  return "여유";
}

/** 평균 재발 간격 — 소수 첫째 자리까지 반올림해 "약 12.4일" (정수면 "약 21일") */
export function recurrenceText(days: number): string {
  return `약 ${Math.round(days * 10) / 10}일`;
}

/** 날짜만 "2026. 10. 5." 형태 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

/** 예상 시점이 오늘 기준 며칠 뒤인지: "오늘 · 3일 뒤 · 2일 지남" */
export function dayDistanceText(iso: string, now: number = Date.now()): string {
  const diff = Math.round(
    (startOfDay(new Date(iso).getTime()) - startOfDay(now)) / DAY_MS,
  );
  if (diff === 0) return "오늘";
  return diff > 0 ? `${diff}일 뒤` : `${-diff}일 지남`;
}
