// 접수 목록 표 — 행을 누르면 상세보기. SLA 초과·임박 건은 행 색으로 강조 (명세 3-1, 4-2).
import { PriorityBadge, StatusBadge } from "../report/StatusBadge";
import type { AdminReportItem } from "../../types/admin";
import { formatDateTime, locationText, slaRemaining } from "./format";
import SlaBadge from "./SlaBadge";

const ROW_TINT = {
  초과: "bg-red-50 hover:bg-red-100",
  임박: "bg-orange-50 hover:bg-orange-100",
} as const;

interface Props {
  reports: AdminReportItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ReportTable({ reports, selectedId, onSelect }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-3 py-2">번호</th>
            <th className="px-3 py-2">카테고리</th>
            <th className="px-3 py-2">우선순위</th>
            <th className="px-3 py-2">상태</th>
            <th className="px-3 py-2">위치</th>
            <th className="px-3 py-2">SLA</th>
            <th className="px-3 py-2">접수일시</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                조건에 맞는 신고가 없어요
              </td>
            </tr>
          )}
          {reports.map((r) => {
            const tint =
              r.sla_status && r.sla_status !== "온타임"
                ? ROW_TINT[r.sla_status]
                : "hover:bg-gray-50";
            const remaining = slaRemaining(r.sla_deadline, r.sla_status);
            return (
              <tr
                key={r.id}
                tabIndex={0}
                aria-selected={r.id === selectedId}
                onClick={() => onSelect(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(r.id);
                  }
                }}
                className={`cursor-pointer border-t border-gray-100 ${tint} ${
                  r.id === selectedId ? "outline outline-2 -outline-offset-2 outline-blue-400" : ""
                }`}
              >
                <td className="px-3 py-2 font-medium">{r.display_no}</td>
                <td className="px-3 py-2">{r.category.name}</td>
                <td className="px-3 py-2">
                  <PriorityBadge priority={r.priority} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2">{locationText(r)}</td>
                <td className="px-3 py-2">
                  <SlaBadge status={r.sla_status} />
                  {remaining && (
                    <div className="mt-0.5 text-xs text-gray-500">{remaining}</div>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDateTime(r.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
