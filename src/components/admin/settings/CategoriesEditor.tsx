// 카테고리 편집 — 이름 바꾸기·켜고 끄기·새로 추가 (명세 5-1 `/admin/config/categories`).
// 삭제는 없음: 신고가 참조하므로 "사용 안 함"으로 끈다(꺼도 예전 신고는 그대로 보임).
// 기본 카테고리 "기타"는 분류가 안 될 때 쓰는 값이라 끄거나 이름을 바꿀 수 없다.
import { useState } from "react";
import { fetchCategories, saveCategories } from "../../../api/adminConfig";
import {
  DEFAULT_CATEGORY_NAME,
  type CategoryList,
} from "../../../types/config";
import SectionShell from "./SectionShell";
import { useConfigSection } from "./useConfigSection";

interface Row {
  /** 화면에서 줄을 구분하는 값 (저장된 줄은 서버 id, 새 줄은 임시값) */
  key: string;
  id: string | null;
  name: string;
  is_active: boolean;
}

interface Props {
  token: string;
  reloadKey: number;
  onUnauthorized: () => void;
}

const toDraft = (res: CategoryList): Row[] =>
  res.items.map((c) => ({
    key: c.id,
    id: c.id,
    name: c.name,
    is_active: c.is_active,
  }));

const INPUT =
  "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500";

export default function CategoriesEditor({
  token,
  reloadKey,
  onUnauthorized,
}: Props) {
  const state = useConfigSection<CategoryList, Row[]>({
    token,
    reloadKey,
    onUnauthorized,
    load: fetchCategories,
    save: (t, rows) =>
      saveCategories(
        t,
        rows.map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          name: r.name.trim(),
          is_active: r.is_active,
        })),
      ),
    toDraft,
  });
  const [newCount, setNewCount] = useState(0);
  const rows = state.draft ?? [];

  const names = rows.map((r) => r.name.trim());
  const problem = (() => {
    if (names.some((n) => n === ""))
      return "이름이 비어 있는 카테고리가 있어요.";
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) return `'${dup}' 이름이 두 번 들어 있어요.`;
    if (!rows.some((r) => r.is_active))
      return "사용 중인 카테고리가 하나 이상 있어야 해요.";
    return null;
  })();

  function update(key: string, patch: Partial<Row>) {
    state.setDraft(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const key = `new-${newCount}`;
    setNewCount((n) => n + 1);
    state.setDraft([...rows, { key, id: null, name: "", is_active: true }]);
  }

  return (
    <SectionShell
      title="카테고리"
      description="신고를 분류하는 이름이에요. 새 신고부터 반영돼요. 삭제는 없고, 쓰지 않을 카테고리는 '사용 안 함'으로 꺼 주세요(꺼도 이전 신고는 그대로 보여요)."
      state={state}
      problem={problem}
      confirmMessage={null}
    >
      <ul className="space-y-2">
        {rows.map((r) => {
          const isDefault = r.id !== null && r.name === DEFAULT_CATEGORY_NAME;
          return (
            <li key={r.key} className="flex flex-wrap items-center gap-3">
              <input
                aria-label="카테고리 이름"
                className={`${INPUT} w-56`}
                value={r.name}
                maxLength={50}
                disabled={isDefault}
                onChange={(e) => update(r.key, { name: e.target.value })}
              />
              <label className="flex items-center gap-1.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={r.is_active}
                  disabled={isDefault}
                  onChange={(e) =>
                    update(r.key, { is_active: e.target.checked })
                  }
                />
                사용 중
              </label>
              {isDefault && (
                <span className="text-xs text-gray-500">
                  기본 카테고리라 바꿀 수 없어요
                </span>
              )}
              {r.id === null && (
                <>
                  <span className="text-xs text-blue-700">새로 추가</span>
                  <button
                    type="button"
                    onClick={() =>
                      state.setDraft(rows.filter((x) => x.key !== r.key))
                    }
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    빼기
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={addRow}
        className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
      >
        + 카테고리 추가
      </button>
    </SectionShell>
  );
}
