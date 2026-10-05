// 우선순위 매트릭스 편집 — 영향도(고/저) × 긴급도(고/저) 4칸의 결과 P1~P4 (명세 5-1 `/admin/config/priority-matrix`).
// 바꿀 수 있는 건 칸의 결과뿐이고, 새 신고부터 적용된다.
import {
  fetchPriorityMatrix,
  savePriorityMatrix,
} from "../../../api/adminConfig";
import type { Priority } from "../../../types/admin";
import type { Level, PriorityMatrix } from "../../../types/config";
import SectionShell from "./SectionShell";
import { useConfigSection } from "./useConfigSection";

/** 칸 이름: 영향도+긴급도 (예: "고저" = 영향도 고, 긴급도 저) */
type Cells = Record<string, Priority>;

const LEVELS: Level[] = ["고", "저"];
const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];
const ORDER: [Level, Level][] = [
  ["고", "고"],
  ["고", "저"],
  ["저", "고"],
  ["저", "저"],
];

const toDraft = (res: PriorityMatrix): Cells =>
  Object.fromEntries(
    res.items.map((r) => [`${r.impact}${r.urgency}`, r.resulting_priority]),
  );

interface Props {
  token: string;
  reloadKey: number;
  onUnauthorized: () => void;
}

export default function PriorityMatrixEditor({
  token,
  reloadKey,
  onUnauthorized,
}: Props) {
  const state = useConfigSection<PriorityMatrix, Cells>({
    token,
    reloadKey,
    onUnauthorized,
    load: fetchPriorityMatrix,
    save: (t, cells) =>
      savePriorityMatrix(t, {
        items: ORDER.map(([impact, urgency]) => ({
          impact,
          urgency,
          resulting_priority: cells[`${impact}${urgency}`],
        })),
      }),
    toDraft,
  });
  const cells = state.draft ?? {};

  return (
    <SectionShell
      title="우선순위 매트릭스"
      description="신고의 영향도와 긴급도로 우선순위(P1이 가장 급함)를 정하는 표예요. 새 신고부터 적용돼요."
      state={state}
      problem={null}
      confirmMessage={null}
    >
      <table className="border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">
              영향도 ＼ 긴급도
            </th>
            {LEVELS.map((u) => (
              <th
                key={u}
                className="px-2 py-1 text-center font-medium text-gray-700"
              >
                긴급도 {u}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LEVELS.map((impact) => (
            <tr key={impact}>
              <th className="px-2 py-1 text-left font-medium text-gray-700">
                영향도 {impact}
              </th>
              {LEVELS.map((urgency) => {
                const k = `${impact}${urgency}`;
                return (
                  <td key={k}>
                    <select
                      aria-label={`영향도 ${impact}, 긴급도 ${urgency}의 우선순위`}
                      className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
                      value={cells[k] ?? ""}
                      onChange={(e) =>
                        state.setDraft({
                          ...cells,
                          [k]: e.target.value as Priority,
                        })
                      }
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </SectionShell>
  );
}
