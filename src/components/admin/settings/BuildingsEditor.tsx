// 건물 편집 — 이름·별칭(챗봇 대화에서 다르게 부르는 이름) 수정, 추가, 삭제 (명세 5-1 `/admin/config/buildings`).
// 신고·문제 후보·예측이 쓰는 건물은 삭제할 수 없고(저장할 때 409로 알려 줌), 이름을 바꾸면
// 층·호실 데이터는 건물 이름으로 찾기 때문에 그 건물은 층 검증을 하지 않게 된다 — 저장 전에 한 번 더 묻는다.
import { useState } from "react";
import { fetchBuildings, saveBuildings } from "../../../api/adminConfig";
import type { BuildingList } from "../../../types/config";
import SectionShell from "./SectionShell";
import { useConfigSection } from "./useConfigSection";

interface Row {
  key: string;
  id: string | null;
  name: string;
  /** 쉼표로 구분해 한 칸에 입력 */
  aliasesText: string;
}

interface Props {
  token: string;
  reloadKey: number;
  onUnauthorized: () => void;
}

const toDraft = (res: BuildingList): Row[] =>
  res.items.map((b) => ({
    key: b.id,
    id: b.id,
    name: b.name,
    aliasesText: b.aliases.join(", "),
  }));

/** "혜인관, 혜인 ,," → ["혜인관", "혜인"] (빈 값·중복 제거) */
function parseAliases(text: string): string[] {
  const out: string[] = [];
  for (const part of text.split(/[,，、]/)) {
    const a = part.trim();
    if (a && !out.includes(a)) out.push(a);
  }
  return out;
}

const INPUT =
  "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900";

export default function BuildingsEditor({
  token,
  reloadKey,
  onUnauthorized,
}: Props) {
  const state = useConfigSection<BuildingList, Row[]>({
    token,
    reloadKey,
    onUnauthorized,
    load: fetchBuildings,
    save: (t, rows) =>
      saveBuildings(
        t,
        rows.map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          name: r.name.trim(),
          aliases: parseAliases(r.aliasesText),
        })),
      ),
    toDraft,
  });
  const [newCount, setNewCount] = useState(0);
  const rows = state.draft ?? [];
  const saved = state.saved ?? [];

  const names = rows.map((r) => r.name.trim());
  const problem = (() => {
    if (names.some((n) => n === "")) return "이름이 비어 있는 건물이 있어요.";
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) return `'${dup}' 이름이 두 번 들어 있어요.`;
    return null;
  })();

  // 저장 전에 한 번 더 물어볼 변경: 삭제, 이름 바꾸기
  const removed = saved.filter((s) => !rows.some((r) => r.id === s.id));
  const renamed = rows.filter((r) => {
    const before = saved.find((s) => s.id === r.id);
    return before !== undefined && before.name !== r.name.trim();
  });
  const confirmParts: string[] = [];
  if (removed.length > 0)
    confirmParts.push(
      `건물 ${removed.length}개(${removed.map((b) => b.name).join(", ")})를 삭제해요. 신고 등이 쓰고 있는 건물은 삭제되지 않아요.`,
    );
  if (renamed.length > 0)
    confirmParts.push(
      `이름을 바꾸면 그 건물은 층·호실 확인을 하지 않게 돼요(${renamed
        .map((r) => {
          const before = saved.find((s) => s.id === r.id);
          return `${before?.name} → ${r.name.trim()}`;
        })
        .join(", ")}).`,
    );
  const confirmMessage =
    confirmParts.length > 0 ? confirmParts.join(" ") : null;

  function update(key: string, patch: Partial<Row>) {
    state.setDraft(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const key = `new-${newCount}`;
    setNewCount((n) => n + 1);
    state.setDraft([...rows, { key, id: null, name: "", aliasesText: "" }]);
  }

  return (
    <SectionShell
      title="건물"
      description="챗봇이 신고 위치를 알아볼 때 쓰는 건물 목록이에요. 별칭은 학생들이 다르게 부르는 이름이에요(쉼표로 구분). 새 신고부터 반영돼요."
      state={state}
      problem={problem}
      confirmMessage={confirmMessage}
    >
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center gap-2">
            <input
              aria-label="건물 이름"
              className={`${INPUT} w-48`}
              value={r.name}
              maxLength={100}
              placeholder="건물 이름"
              onChange={(e) => update(r.key, { name: e.target.value })}
            />
            <input
              aria-label={`${r.name || "새 건물"} 별칭`}
              className={`${INPUT} min-w-0 flex-1 basis-64`}
              value={r.aliasesText}
              placeholder="별칭 (쉼표로 구분)"
              onChange={(e) => update(r.key, { aliasesText: e.target.value })}
            />
            {r.id === null && (
              <span className="text-xs text-blue-700">새로 추가</span>
            )}
            <button
              type="button"
              onClick={() =>
                state.setDraft(rows.filter((x) => x.key !== r.key))
              }
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              {r.id === null ? "빼기" : "삭제"}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addRow}
        className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
      >
        + 건물 추가
      </button>
    </SectionShell>
  );
}
