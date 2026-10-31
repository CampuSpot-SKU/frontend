// 접수 목록을 "같은 건(반복 신고 묶음)"끼리 모아 보여주기 위한 순수 함수.
import type {
  AdminReportItem,
  Priority,
  ReportClusterRef,
  SlaStatus,
} from "../../types/admin";
import { locationText } from "./format";

export type ListRow =
  | { kind: "single"; report: AdminReportItem }
  | {
      kind: "group";
      clusterId: string;
      cluster: ReportClusterRef;
      members: AdminReportItem[];
    };

/** 같은 묶음의 신고가 목록에 2건 이상 보이면 한 덩어리로 묶는다. 덩어리는 첫 멤버 자리에 놓인다. */
export function buildRows(reports: AdminReportItem[], grouped: boolean): ListRow[] {
  if (!grouped) return reports.map((report) => ({ kind: "single", report }));
  const byCluster = new Map<string, AdminReportItem[]>();
  for (const r of reports) {
    if (!r.cluster) continue;
    const list = byCluster.get(r.cluster.id) ?? [];
    list.push(r);
    byCluster.set(r.cluster.id, list);
  }
  const rows: ListRow[] = [];
  const emitted = new Set<string>();
  for (const r of reports) {
    const members = r.cluster ? byCluster.get(r.cluster.id) : undefined;
    if (!r.cluster || !members || members.length < 2) {
      rows.push({ kind: "single", report: r });
      continue;
    }
    if (emitted.has(r.cluster.id)) continue;
    emitted.add(r.cluster.id);
    rows.push({ kind: "group", clusterId: r.cluster.id, cluster: r.cluster, members });
  }
  return rows;
}

/** 화면에 보이는 순서대로의 신고 id (상세 패널의 이전·다음 이동용) */
export function flattenIds(rows: ListRow[]): string[] {
  return rows.flatMap((row) =>
    row.kind === "single" ? [row.report.id] : row.members.map((m) => m.id),
  );
}

const PRIORITY_ORDER: Priority[] = ["P1", "P2", "P3", "P4"];
const SLA_ORDER: SlaStatus[] = ["초과", "임박", "온타임"];

export function highestPriority(members: AdminReportItem[]): Priority {
  return members.reduce<Priority>(
    (best, m) =>
      PRIORITY_ORDER.indexOf(m.priority) < PRIORITY_ORDER.indexOf(best) ? m.priority : best,
    "P4",
  );
}

export function worstSla(members: AdminReportItem[]): SlaStatus | null {
  let worst: SlaStatus | null = null;
  for (const m of members) {
    if (!m.sla_status) continue;
    if (worst === null || SLA_ORDER.indexOf(m.sla_status) < SLA_ORDER.indexOf(worst)) {
      worst = m.sla_status;
    }
  }
  return worst;
}

const OPEN = new Set(["접수", "배정", "처리중"]);
export function openCount(members: AdminReportItem[]): number {
  return members.filter((m) => OPEN.has(m.status)).length;
}

/** 번호·위치·분류·내용에 검색어가 모두 들어 있는지 (공백으로 나눈 낱말 전부) */
export function matchesSearch(r: AdminReportItem, query: string): boolean {
  const words = query.trim().toLowerCase().replace(/#/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = `${r.display_no} ${locationText(r)} ${r.category.name} ${r.description}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}
