// 접수 목록 필터 — 상태는 건수가 붙은 칩, 나머지는 한 줄에 모음. 값이 바뀌면 바로 onChange (서버가 필터·정렬, 명세 5-1).
import type {
  NamedRef,
  Priority,
  ReportFilters,
  ReportStatus,
  ReportSummary,
  SlaStatus,
  SortKey,
} from "../../types/admin";

const STATUSES: ReportStatus[] = ["접수", "배정", "처리중", "해결", "종료"];
const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];
const SLA_STATUSES: SlaStatus[] = ["초과", "임박", "온타임"];
const SORTS: { value: SortKey; label: string }[] = [
  { value: "sla_deadline", label: "마감 급한 순" },
  { value: "priority", label: "우선순위 높은 순" },
  { value: "-created_at", label: "최신순" },
  { value: "created_at", label: "오래된 순" },
];

/** 처음 열었을 때: 처리해야 할 건을 마감 급한 순으로 */
export const DEFAULT_FILTERS: ReportFilters = {
  status: "",
  priority: "",
  sla_status: "",
  category_id: "",
  open_only: true,
  sort: "sla_deadline",
};

const selectClass =
  "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700";

interface Props {
  filters: ReportFilters;
  categories: NamedRef[];
  summary: ReportSummary | null;
  search: string;
  grouped: boolean;
  onChange: (next: ReportFilters) => void;
  onSearch: (text: string) => void;
  onGrouped: (on: boolean) => void;
}

export default function ReportFilterBar({
  filters,
  categories,
  summary,
  search,
  grouped,
  onChange,
  onSearch,
  onGrouped,
}: Props) {
  const set = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const view = filters.status || (filters.open_only ? "open" : "all");
  const pickView = (v: string) => {
    const base = { ...filters, status: "" as const, open_only: false };
    let next: ReportFilters;
    if (v === "open") next = { ...base, open_only: true };
    else if (v === "all") next = base;
    else next = { ...base, status: v as ReportStatus };
    // 해결·종료·전체에는 마감 시각이 없는 건이 섞여서 마감순이 의미 없음
    if ((v === "all" || v === "해결" || v === "종료") && next.sort === "sla_deadline") {
      next.sort = "-created_at";
    }
    onChange(next);
  };

  const chips: { value: string; label: string; count: number | null }[] = [
    { value: "open", label: "처리 필요", count: summary?.open ?? null },
    ...STATUSES.map((s) => ({ value: s, label: s, count: summary?.by_status[s] ?? null })),
    { value: "all", label: "전체", count: summary?.total ?? null },
  ];

  const narrowed =
    filters.priority ||
    filters.sla_status ||
    filters.category_id ||
    search.trim() ||
    view !== "open" ||
    filters.sort !== DEFAULT_FILTERS.sort;

  return (
    <div className="mb-3 space-y-2">
      <div role="group" aria-label="상태" className="flex gap-1.5 overflow-x-auto pb-0.5">
        {chips.map((c) => {
          const on = view === c.value;
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={on}
              onClick={() => pickView(c.value)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
                on
                  ? "border-blue-600 bg-blue-600 font-medium text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {c.label}
              {c.count !== null && (
                <span className={`ml-1.5 tabular-nums ${on ? "text-blue-100" : "text-gray-400"}`}>
                  {c.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="번호·위치·내용 검색"
          aria-label="검색"
          className="min-w-[10rem] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm sm:max-w-xs"
        />
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
              SLA {s}
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
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={grouped}
            onChange={(e) => onGrouped(e.target.checked)}
            className="h-4 w-4"
          />
          같은 건 묶어 보기
        </label>
        {narrowed && (
          <button
            type="button"
            onClick={() => {
              onChange(DEFAULT_FILTERS);
              onSearch("");
            }}
            className="rounded-lg px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
}
