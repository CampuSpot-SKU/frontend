// SLA 상태 배지 — 초과는 빨강, 임박은 주황, 온타임은 초록 (해결·종료는 null → "-").
import type { SlaStatus } from "../../types/admin";

const STYLE: Record<SlaStatus, string> = {
  초과: "bg-red-100 text-red-700",
  임박: "bg-orange-100 text-orange-700",
  온타임: "bg-green-100 text-green-700",
};

export default function SlaBadge({ status }: { status: SlaStatus | null }) {
  if (!status) return <span className="text-gray-400">-</span>;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[status]}`}
    >
      {status}
    </span>
  );
}
