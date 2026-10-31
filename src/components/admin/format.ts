// 관리자 화면 공통 표시 함수 (위치·날짜·SLA 남은 시간).
import type { AdminReportItem, SlaStatus } from "../../types/admin";

/** 건물 이름이 있으면 "건물 층 세부", 없으면 사용자가 입력한 원문 위치 */
export function locationText(
  r: Pick<AdminReportItem, "building" | "floor" | "detail" | "location_raw">,
): string {
  if (r.building) {
    const floor = r.floor
      ? r.floor.startsWith("B")
        ? `지하 ${r.floor.slice(1)}층`
        : `${r.floor}층`
      : null;
    return [r.building.name, floor, r.detail].filter(Boolean).join(" ");
  }
  return r.location_raw ?? "-";
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** SLA 마감까지 남은 시간 / 초과한 시간을 사람이 읽는 말로. 처리가 끝난 건(sla_status 없음)은 null */
export function slaRemaining(
  deadline: string | null,
  status: SlaStatus | null,
  now: number = Date.now(),
): string | null {
  if (!deadline || !status) return null;
  const diffMin = Math.round((new Date(deadline).getTime() - now) / 60000);
  const abs = Math.abs(diffMin);
  const text =
    abs >= 60 * 24
      ? `${Math.floor(abs / (60 * 24))}일 ${Math.floor((abs % (60 * 24)) / 60)}시간`
      : abs >= 60
        ? `${Math.floor(abs / 60)}시간 ${abs % 60}분`
        : `${abs}분`;
  return diffMin >= 0 ? `마감까지 ${text}` : `${text} 초과`;
}

/** "방금 · 12분 전 · 3시간 전 · 2일 전", 일주일이 넘으면 날짜 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const min = Math.round((now - new Date(iso).getTime()) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return formatDateTime(iso);
}

/** "10/28" */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** "14:05" */
export function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "해결" → "해결로", "배정" → "배정으로" (받침 ㄹ·없음은 '로', 그 외 '으로') */
export function withRo(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}(으)로`;
  const batchim = code % 28;
  return `${word}${batchim === 0 || batchim === 8 ? "로" : "으로"}`;
}
