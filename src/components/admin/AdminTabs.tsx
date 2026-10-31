// 관리자 화면 탭 6개 — 접수 목록(SLA 초과 건수 배지) · 반복 신고(확인 필요 건수 배지) · 예방 점검 · 통계 · 문의 로그 · 설정.
// 라우터 없이 React 상태로만 전환한다.

export type AdminTab =
  "reports" | "clusters" | "predictions" | "stats" | "logs" | "settings";

const TABS: { value: AdminTab; label: string }[] = [
  { value: "reports", label: "접수 목록" },
  { value: "clusters", label: "반복 신고" },
  { value: "predictions", label: "예방 점검" },
  { value: "stats", label: "통계" },
  { value: "logs", label: "문의 로그" },
  { value: "settings", label: "설정" },
];

interface Props {
  tab: AdminTab;
  onChange: (tab: AdminTab) => void;
  /** 확인 필요 상태인 반복 신고 건수. null이면(불러오기 실패·미배포) 배지를 숨김 */
  repeatCount: number | null;
  /** SLA 초과 신고 건수. null이면 배지를 숨김 */
  overdueCount: number | null;
}

export default function AdminTabs({ tab, onChange, repeatCount, overdueCount }: Props) {
  const badge = (value: AdminTab): { n: number; tone: string; label: string } | null => {
    if (value === "reports" && overdueCount)
      return { n: overdueCount, tone: "bg-red-500", label: `SLA 초과 ${overdueCount}건` };
    if (value === "clusters" && repeatCount)
      return { n: repeatCount, tone: "bg-amber-500", label: `확인 필요 ${repeatCount}건` };
    return null;
  };
  return (
    <div
      role="tablist"
      aria-label="관리자 메뉴"
      className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4"
    >
      {TABS.map((t) => {
        const selected = t.value === tab;
        const b = badge(t.value);
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.value)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              selected
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
            {b && (
              <span
                aria-label={b.label}
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none text-white ${b.tone}`}
              >
                {b.n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
