// 탐지 기준 편집 — "몇 시간 안에 같은 곳 신고가 몇 건 이상이면 문제 후보" (명세 5-1 `/admin/config/detection`, 3-3).
// 탐지 배치가 다음 실행 때 이 값을 읽는다.
import { fetchDetection, saveDetection } from "../../../api/adminConfig";
import {
  DETECTION_COUNT_RANGE,
  DETECTION_HOURS_RANGE,
  type DetectionSettings,
} from "../../../types/config";
import SectionShell from "./SectionShell";
import { useConfigSection } from "./useConfigSection";

interface Draft {
  count: string;
  hours: string;
}

const toDraft = (s: DetectionSettings): Draft => ({
  count: String(s.threshold_count),
  hours: String(s.threshold_hours),
});

function inRange(text: string, range: { min: number; max: number }): boolean {
  if (!/^\d+$/.test(text.trim())) return false;
  const n = Number(text);
  return n >= range.min && n <= range.max;
}

const INPUT =
  "w-24 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900";

interface Props {
  token: string;
  reloadKey: number;
  onUnauthorized: () => void;
}

export default function DetectionEditor({
  token,
  reloadKey,
  onUnauthorized,
}: Props) {
  const state = useConfigSection<DetectionSettings, Draft>({
    token,
    reloadKey,
    onUnauthorized,
    load: fetchDetection,
    save: (t, d) =>
      saveDetection(t, {
        threshold_count: Number(d.count),
        threshold_hours: Number(d.hours),
      }),
    toDraft,
  });
  const d = state.draft ?? { count: "", hours: "" };

  const countOk = inRange(d.count, DETECTION_COUNT_RANGE);
  const hoursOk = inRange(d.hours, DETECTION_HOURS_RANGE);
  const problem = !countOk
    ? `건수는 ${DETECTION_COUNT_RANGE.min}~${DETECTION_COUNT_RANGE.max} 사이의 정수여야 해요.`
    : !hoursOk
      ? `시간은 ${DETECTION_HOURS_RANGE.min}~${DETECTION_HOURS_RANGE.max} 사이의 정수여야 해요.`
      : null;

  return (
    <SectionShell
      title="탐지 기준"
      description="같은 장소·같은 종류의 신고가 짧은 시간에 몰리면 개별 건이 아니라 '문제 후보'로 알려 줘요. 그 기준 값이에요. 탐지 배치가 다음 실행 때 이 값을 읽어요."
      state={state}
      problem={problem}
      confirmMessage={null}
    >
      <p className="flex flex-wrap items-center gap-2 text-sm text-gray-800">
        <input
          aria-label="탐지 시간(시간)"
          inputMode="numeric"
          className={`${INPUT} ${hoursOk ? "" : "border-red-400"}`}
          value={d.hours}
          onChange={(e) => state.setDraft({ ...d, hours: e.target.value })}
        />
        시간 안에 같은 곳 신고가
        <input
          aria-label="탐지 건수"
          inputMode="numeric"
          className={`${INPUT} ${countOk ? "" : "border-red-400"}`}
          value={d.count}
          onChange={(e) => state.setDraft({ ...d, count: e.target.value })}
        />
        건 이상이면 문제 후보로 표시
      </p>
    </SectionShell>
  );
}
