// 신고 상태·우선순위 배지 — 학생 화면(1-12 본인 신고 조회)과 관리자 화면(1-6)에서 같이 쓸 수 있게 분리.
import type { Priority, ReportStatus } from "../../types/report";

const STATUS_STYLE: Record<ReportStatus, string> = {
  접수: "bg-gray-100 text-gray-700",
  배정: "bg-blue-100 text-blue-700",
  처리중: "bg-amber-100 text-amber-800",
  해결: "bg-green-100 text-green-700",
  종료: "bg-gray-200 text-gray-600",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  P1: "bg-red-100 text-red-700",
  P2: "bg-orange-100 text-orange-700",
  P3: "bg-blue-100 text-blue-700",
  P4: "bg-gray-100 text-gray-600",
};

/** 우선순위 뜻 (명세 3-1 우선순위 매트릭스 — 학생에게 보여줄 쉬운 말) */
const PRIORITY_LABEL: Record<Priority, string> = {
  P1: "긴급",
  P2: "높음",
  P3: "보통",
  P4: "낮음",
};

const base = "inline-block rounded-full px-2 py-0.5 text-xs font-medium";

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`${base} ${STATUS_STYLE[status] ?? STATUS_STYLE["접수"]}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`${base} ${PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.P4}`}
    >
      {priority} {PRIORITY_LABEL[priority] ?? ""}
    </span>
  );
}
