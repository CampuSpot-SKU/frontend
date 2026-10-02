// 관리자 화면 탭 3개 — 접수 목록 · 문제 후보(후보 건수 배지) · 예방 점검 (작업 1-8·1-11).
// 라우터 없이 React 상태로만 전환한다.

export type AdminTab = "reports" | "clusters" | "predictions";

const TABS: { value: AdminTab; label: string }[] = [
  { value: "reports", label: "접수 목록" },
  { value: "clusters", label: "문제 후보" },
  { value: "predictions", label: "예방 점검" },
];

interface Props {
  tab: AdminTab;
  onChange: (tab: AdminTab) => void;
  /** 후보 상태인 문제 후보 건수. null이면(불러오기 실패·미배포) 배지를 숨김 */
  candidateCount: number | null;
}

export default function AdminTabs({ tab, onChange, candidateCount }: Props) {
  return (
    <div
      role="tablist"
      aria-label="관리자 메뉴"
      className="mx-auto flex max-w-6xl gap-1 px-4"
    >
      {TABS.map((t) => {
        const selected = t.value === tab;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.value)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
              selected
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
            {t.value === "clusters" &&
              candidateCount !== null &&
              candidateCount > 0 && (
                <span
                  aria-label={`확인할 후보 ${candidateCount}건`}
                  className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-semibold leading-none text-white"
                >
                  {candidateCount}
                </span>
              )}
          </button>
        );
      })}
    </div>
  );
}
