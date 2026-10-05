// 통계 화면의 숫자 표시 규칙 — 화면 파일에서 분리한 순수 함수(값만 받아 글자를 돌려줌)라 따로 확인하기 쉽다.

/** 평균 처리시간 → "17.0시간" / 48시간 이상이면 "2.1일". 해결된 신고가 없으면 "–" */
export function formatHours(hours: number | null): string {
  if (hours === null) return "–";
  if (hours >= 48) return `${(hours / 24).toFixed(1)}일`;
  return `${hours.toFixed(1)}시간`;
}

/** SLA 준수율 → "33.3%". 셀 건이 없으면(null) "–" */
export function formatPct(pct: number | null): string {
  return pct === null ? "–" : `${pct.toFixed(1)}%`;
}

/** 막대 길이(%) — 가장 큰 값을 100으로. 0건이거나 최댓값이 0이면 0 */
export function barWidthPct(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(2, Math.round((value / max) * 100)); // 1건이어도 보이게 최소 2%
}
