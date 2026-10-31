// 접수 목록 맨 위 숫자 띠 — 눌러서 바로 그 조건으로 좁혀 본다.
import type { ReportFilters, ReportSummary } from "../../types/admin";

interface Props {
  summary: ReportSummary | null;
  repeatCount: number | null;
  filters: ReportFilters;
  onPick: (patch: Partial<ReportFilters>) => void;
  onOpenRepeat: () => void;
}

interface Tile {
  key: string;
  label: string;
  value: number | null;
  tone: string;
  active: boolean;
  onClick: () => void;
}

export default function SummaryStrip({ summary, repeatCount, filters, onPick, onOpenRepeat }: Props) {
  const none = { status: "" as const, priority: "" as const, sla_status: "" as const, open_only: false };
  const tiles: Tile[] = [
    {
      key: "open",
      label: "처리 필요",
      value: summary?.open ?? null,
      tone: "text-gray-900",
      active: filters.open_only && !filters.priority && !filters.sla_status,
      onClick: () => onPick({ ...none, open_only: true }),
    },
    {
      key: "over",
      label: "SLA 초과",
      value: summary?.sla_over ?? null,
      tone: "text-red-600",
      active: filters.sla_status === "초과",
      onClick: () => onPick({ ...none, sla_status: "초과" }),
    },
    {
      key: "soon",
      label: "SLA 임박",
      value: summary?.sla_soon ?? null,
      tone: "text-orange-600",
      active: filters.sla_status === "임박",
      onClick: () => onPick({ ...none, sla_status: "임박" }),
    },
    {
      key: "urgent",
      label: "긴급(P1) 처리 중",
      value: summary?.urgent_open ?? null,
      tone: "text-red-600",
      active: filters.priority === "P1" && filters.open_only,
      onClick: () => onPick({ ...none, priority: "P1", open_only: true }),
    },
    {
      key: "repeat",
      label: "확인할 반복 신고",
      value: repeatCount,
      tone: "text-amber-700",
      active: false,
      onClick: onOpenRepeat,
    },
  ];
  return (
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={t.onClick}
          aria-pressed={t.active}
          className={`rounded-xl border px-3 py-2 text-left transition ${
            t.active
              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <span className="block text-xs text-gray-500">{t.label}</span>
          <span className={`block text-2xl font-semibold tabular-nums ${t.value ? t.tone : "text-gray-300"}`}>
            {t.value ?? "-"}
          </span>
        </button>
      ))}
    </div>
  );
}
