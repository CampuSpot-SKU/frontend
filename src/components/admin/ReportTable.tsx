// 접수 목록 표 — 같은 건(반복 신고 묶음)은 한 덩어리로 묶어서 보여준다. 행을 누르면 상세보기.
// SLA 초과·임박 건은 행 색으로 강조 (명세 3-1, 4-2).
import { useState } from "react";
import { PriorityBadge, StatusBadge } from "../report/StatusBadge";
import type { AdminReportItem } from "../../types/admin";
import { CLUSTER_STATUS_LABEL, CLUSTER_STATUS_STYLE } from "./detectionFormat";
import { formatDay, formatDateTime, locationText, relativeTime, slaRemaining } from "./format";
import { highestPriority, openCount, worstSla, type ListRow } from "./groupReports";
import SlaBadge from "./SlaBadge";

const ROW_TINT = {
  초과: "bg-red-50 hover:bg-red-100",
  임박: "bg-orange-50 hover:bg-orange-100",
} as const;

const COLS = 6;

interface Props {
  rows: ListRow[];
  selectedId: string | null;
  now: number;
  onSelect: (id: string) => void;
  onOpenCluster: (clusterId: string) => void;
}

function ReportRow({
  r,
  selected,
  now,
  inGroup,
  onSelect,
}: {
  r: AdminReportItem;
  selected: boolean;
  now: number;
  inGroup: boolean;
  onSelect: (id: string) => void;
}) {
  const tint =
    r.sla_status && r.sla_status !== "온타임" ? ROW_TINT[r.sla_status] : "hover:bg-gray-50";
  const remaining = slaRemaining(r.sla_deadline, r.sla_status, now);
  const done = r.status === "해결" || r.status === "종료";
  return (
    <tr
      tabIndex={0}
      aria-selected={selected}
      onClick={() => onSelect(r.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(r.id);
        }
      }}
      className={`cursor-pointer border-t border-gray-100 ${tint} ${
        selected ? "bg-blue-50 outline outline-2 -outline-offset-2 outline-blue-400" : ""
      } ${done ? "text-gray-500" : ""}`}
    >
      <td className={`whitespace-nowrap py-2 pr-2 font-medium tabular-nums ${inGroup ? "border-l-4 border-l-indigo-300 pl-5" : "pl-3"}`}>
        #{r.display_no}
      </td>
      <td className="whitespace-nowrap px-2 py-2">
        <PriorityBadge priority={r.priority} />
      </td>
      <td className="whitespace-nowrap px-2 py-2">
        <StatusBadge status={r.status} />
      </td>
      <td className="w-full min-w-[12rem] max-w-0 px-2 py-2">
        <div className="truncate font-medium text-gray-900">{locationText(r)}</div>
        <div className="truncate text-xs text-gray-500">
          {r.category.name} · {r.description}
        </div>
      </td>
      <td className="whitespace-nowrap px-2 py-2">
        <SlaBadge status={r.sla_status} />
        {remaining && <div className="mt-0.5 text-xs text-gray-500">{remaining}</div>}
      </td>
      <td
        className="whitespace-nowrap py-2 pl-2 pr-3 text-xs text-gray-500"
        title={formatDateTime(r.created_at)}
      >
        {relativeTime(r.created_at, now)}
      </td>
    </tr>
  );
}

export default function ReportTable({ rows, selectedId, now, onSelect, onOpenCluster }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[42rem] text-left text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="py-2 pl-3 pr-2 font-medium">번호</th>
            <th className="px-2 py-2 font-medium">우선순위</th>
            <th className="px-2 py-2 font-medium">상태</th>
            <th className="px-2 py-2 font-medium">위치 · 내용</th>
            <th className="px-2 py-2 font-medium">SLA</th>
            <th className="py-2 pl-2 pr-3 font-medium">접수</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLS} className="px-3 py-10 text-center text-gray-400">
                조건에 맞는 신고가 없어요
              </td>
            </tr>
          )}
          {rows.map((row) => {
            if (row.kind === "single") {
              const r = row.report;
              return (
                <ReportRow
                  key={r.id}
                  r={r}
                  selected={r.id === selectedId}
                  now={now}
                  inGroup={false}
                  onSelect={onSelect}
                />
              );
            }
            const { members, cluster, clusterId } = row;
            const isCollapsed = collapsed.has(clusterId);
            const first = members[0];
            const open = openCount(members);
            const sla = worstSla(members);
            const times = members.map((m) => new Date(m.created_at).getTime());
            const from = new Date(Math.min(...times)).toISOString();
            const to = new Date(Math.max(...times)).toISOString();
            return [
              <tr key={`g-${clusterId}`} className="border-t border-indigo-200 bg-indigo-50">
                <td colSpan={COLS} className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button
                      type="button"
                      onClick={() => toggle(clusterId)}
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? "펼치기" : "접기"}
                      className="flex h-6 w-6 items-center justify-center rounded text-xs text-indigo-700 hover:bg-indigo-100"
                    >
                      {isCollapsed ? "▶" : "▼"}
                    </button>
                    <span className="font-semibold text-indigo-900">같은 건 {members.length}건</span>
                    <span className="font-medium text-gray-900">
                      {cluster.whole_building
                        ? `${first.building?.name ?? ""} 건물 전체`.trim()
                        : locationText(first)}
                    </span>
                    <span className="text-gray-600">{first.category.name}</span>
                    <PriorityBadge priority={highestPriority(members)} />
                    {sla && sla !== "온타임" && <SlaBadge status={sla} />}
                    <span className="text-xs text-gray-600">
                      {formatDay(from)}
                      {formatDay(from) !== formatDay(to) && ` ~ ${formatDay(to)}`} · 처리 필요 {open}건
                      {cluster.report_count > members.length && ` · 묶음 전체 ${cluster.report_count}건`}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLUSTER_STATUS_STYLE[cluster.status]}`}
                    >
                      {CLUSTER_STATUS_LABEL[cluster.status]}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenCluster(clusterId)}
                      className="ml-auto rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      묶음 보기·한 번에 처리
                    </button>
                  </div>
                </td>
              </tr>,
              ...(isCollapsed
                ? []
                : members.map((m) => (
                    <ReportRow
                      key={m.id}
                      r={m}
                      selected={m.id === selectedId}
                      now={now}
                      inGroup
                      onSelect={onSelect}
                    />
                  ))),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
