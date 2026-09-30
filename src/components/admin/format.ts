// 관리자 화면 공통 표시 함수 (위치·날짜·SLA 남은 시간).
import type { AdminReportItem, SlaStatus } from "../../types/admin";

/** 건물 이름이 있으면 "건물 층 세부", 없으면 사용자가 입력한 원문 위치 */
export function locationText(r: AdminReportItem): string {
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
