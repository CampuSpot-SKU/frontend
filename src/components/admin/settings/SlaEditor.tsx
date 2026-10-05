// SLA 편집 — 우선순위(P1~P4)별 처리 목표 시간과 에스컬레이션 단계별 조치 문구 (명세 5-1 `/admin/config/sla`).
// 이미 접수된 신고의 마감은 다시 계산하지 않는다 — 바꾼 값은 새 신고부터 적용된다.
import { fetchSla, saveSla } from "../../../api/adminConfig";
import type { Priority } from "../../../types/admin";
import {
  SLA_HOURS_RANGE,
  type SlaItem,
  type SlaList,
} from "../../../types/config";
import SectionShell from "./SectionShell";
import { useConfigSection } from "./useConfigSection";

interface Row {
  priority: Priority;
  /** 입력 중인 글자 그대로 (저장할 때 숫자로 바꿈) */
  hours: string;
  a50: string;
  a100: string;
  a150: string;
}

const toDraft = (res: SlaList): Row[] =>
  res.items.map((s) => ({
    priority: s.priority,
    hours: String(s.sla_hours),
    a50: s.escalation_50pct_action ?? "",
    a100: s.escalation_100pct_action ?? "",
    a150: s.escalation_150pct_action ?? "",
  }));

const orNull = (s: string): string | null => s.trim() || null;

function toItems(rows: Row[]): SlaItem[] {
  return rows.map((r) => ({
    priority: r.priority,
    sla_hours: Number(r.hours),
    escalation_50pct_action: orNull(r.a50),
    escalation_100pct_action: orNull(r.a100),
    escalation_150pct_action: orNull(r.a150),
  }));
}

function validHours(text: string): boolean {
  if (!/^\d+$/.test(text.trim())) return false;
  const n = Number(text);
  return n >= SLA_HOURS_RANGE.min && n <= SLA_HOURS_RANGE.max;
}

const INPUT =
  "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900";

interface Props {
  token: string;
  reloadKey: number;
  onUnauthorized: () => void;
}

export default function SlaEditor({ token, reloadKey, onUnauthorized }: Props) {
  const state = useConfigSection<SlaList, Row[]>({
    token,
    reloadKey,
    onUnauthorized,
    load: fetchSla,
    save: (t, rows) => saveSla(t, { items: toItems(rows) }),
    toDraft,
  });
  const rows = state.draft ?? [];

  const badRow = rows.find((r) => !validHours(r.hours));
  const problem = badRow
    ? `${badRow.priority}의 처리 시간은 ${SLA_HOURS_RANGE.min}~${SLA_HOURS_RANGE.max} 사이의 정수(시간)여야 해요.`
    : null;

  function update(priority: Priority, patch: Partial<Row>) {
    state.setDraft(
      rows.map((r) => (r.priority === priority ? { ...r, ...patch } : r)),
    );
  }

  return (
    <SectionShell
      title="SLA (처리 목표 시간)"
      description="우선순위별로 접수 후 몇 시간 안에 해결해야 하는지와, 목표 시간의 50%·100%·150%가 지났을 때의 조치 문구예요. 이미 접수된 신고의 마감은 바뀌지 않고, 새 신고부터 적용돼요."
      state={state}
      problem={problem}
      confirmMessage={null}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500">
              <th className="px-1">우선순위</th>
              <th className="px-1">목표 시간(시간)</th>
              <th className="px-1">50% 경과 시 조치</th>
              <th className="px-1">100% 경과 시 조치</th>
              <th className="px-1">150% 경과 시 조치</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.priority}>
                <th
                  scope="row"
                  className="px-1 text-left font-semibold text-gray-800"
                >
                  {r.priority}
                </th>
                <td className="px-1">
                  <input
                    aria-label={`${r.priority} 목표 시간(시간)`}
                    inputMode="numeric"
                    className={`${INPUT} w-24 ${validHours(r.hours) ? "" : "border-red-400"}`}
                    value={r.hours}
                    onChange={(e) =>
                      update(r.priority, { hours: e.target.value })
                    }
                  />
                </td>
                {(
                  [
                    ["a50", "50%"],
                    ["a100", "100%"],
                    ["a150", "150%"],
                  ] as const
                ).map(([field, label]) => (
                  <td key={field} className="px-1">
                    <input
                      aria-label={`${r.priority} ${label} 경과 시 조치`}
                      className={`${INPUT} w-full`}
                      maxLength={500}
                      value={r[field]}
                      onChange={(e) =>
                        update(r.priority, { [field]: e.target.value })
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}
