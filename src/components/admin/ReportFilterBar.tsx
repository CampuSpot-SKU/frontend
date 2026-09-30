// 접수 목록 필터·정렬 막대 — 값이 바뀌면 바로 onChange (목록은 서버가 필터·정렬해서 돌려줌, 명세 5-1).
import type {
  NamedRef,
  Priority,
  ReportFilters,
  ReportStatus,
  SlaStatus,
  SortKey,
} from "../../types/admin";

const STATUSES: ReportStatus[] = ["접수", "배정", "처리중", "해결", "종료"];
const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];
const SLA_STATUSES: SlaStatus[] = ["초과", "임박", "온타임"];
const SORTS: { value: SortKey; label: string }[] = [
  { value: "-created_at", label: "최신순" },
  { value: "created_at", label: "오래된 순" },
  { value: "sla_deadline", label: "마감 급한 순" },
  { value: "priority", label: "우선순위 높은 순" },
];

export const DEFAULT_FILTERS: ReportFilters = {
  status: "",
  priority: "",
  sla_status: "",
  category_id: "",
  sort: "-created_at",
};

const selectClass =
  "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700";

interface Props {
  filters: ReportFilters;
  categories: NamedRef[];
  onChange: (next: ReportFilters) => void;
}

export default function ReportFilterBar({ filters, categories, onChange }: Props) {
  const set = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const filtered =
    filters.status || filters.priority || filters.sla_status || filters.category_id;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <select
        aria-label="상태"
        className={selectClass}
        value={filters.status}
        onChange={(e) => set("status", e.target.value as ReportStatus | "")}
      >
        <option value="">상태 전체</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        aria-label="우선순위"
        className={selectClass}
        value={filters.priority}
        onChange={(e) => set("priority", e.target.value as Priority | "")}
      >
        <option value="">우선순위 전체</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select
        aria-label="카테고리"
        className={selectClass}
        value={filters.category_id}
        onChange={(e) => set("category_id", e.target.value)}
      >
        <option value="">카테고리 전체</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        aria-label="SLA"
        className={selectClass}
        value={filters.sla_status}
        onChange={(e) => set("sla_status", e.target.value as SlaStatus | "")}
      >
        <option value="">SLA 전체</option>
        {SLA_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        aria-label="정렬"
        className={selectClass}
        value={filters.sort}
        onChange={(e) => set("sort", e.target.value as SortKey)}
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {filtered && (
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
          className="rounded-lg px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
        >
          필터 초기화
        </button>
      )}
    </div>
  );
}
