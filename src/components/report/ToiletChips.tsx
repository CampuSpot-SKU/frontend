/** 화장실 남/여 선택 값. null = 아직 안 고름 (선택 사항 — 안 눌러도 접수됨) */
export type ToiletGender = "남" | "여" | "모름" | null;

/** 세부장소가 화장실인데 남/여가 안 적혀 있을 때만 칩을 보여줌 (명세 4-1 위치 처리 규칙) */
export function needsToiletChoice(detail: string): boolean {
  return detail.includes("화장실") && !/남|여/.test(detail);
}

/** [접수] 때 보낼 세부장소 — [남]/[여]를 골랐으면 "화장실 (남)"처럼 붙임. [모름]·안 고름은 그대로 */
export function applyToiletGender(detail: string, g: ToiletGender): string {
  if (!needsToiletChoice(detail) || (g !== "남" && g !== "여")) return detail;
  return `${detail} (${g})`;
}

interface Props {
  value: ToiletGender;
  onChange: (g: ToiletGender) => void;
  disabled?: boolean;
}

const OPTIONS: Exclude<ToiletGender, null>[] = ["남", "여", "모름"];

/**
 * 화장실 [남][여][모름] 칩 (작업 1-5b, 명세 4-1).
 * 어느 화장실이 남자용인지 추측하지 않고 학생이 고르게 함. 다시 누르면 선택 해제.
 */
function ToiletChips({ value, onChange, disabled }: Props) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="화장실 구분"
    >
      <span className="text-xs text-gray-500">화장실 구분(선택)</span>
      {OPTIONS.map((g) => {
        const selected = value === g;
        return (
          <button
            key={g}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : g)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              selected
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {g}
          </button>
        );
      })}
    </div>
  );
}

export default ToiletChips;
