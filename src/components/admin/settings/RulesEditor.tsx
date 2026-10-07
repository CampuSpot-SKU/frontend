// 조건-액션 규칙 편집 — "이 카테고리(·건물)의 신고는 우선순위를 ○○로" (작업 1-21, 명세 4-2, status.md 4장 10/7 한비 제안).
// 예: "안전" 카테고리 → P1. 새로 접수되는 신고부터 AI·매트릭스 판정 뒤에 적용되고, 이미 접수된 신고는 그대로다.
// 규칙은 다른 데이터가 참조하지 않아 삭제할 수 있다(저장 때 한 번 더 확인).
import { useEffect, useState } from "react";
import {
  fetchAutomationRules,
  fetchBuildings,
  fetchCategories,
  saveAutomationRules,
} from "../../../api/adminConfig";
import { ApiError } from "../../../api/client";
import type { Priority } from "../../../types/admin";
import type {
  AutomationRuleList,
  BuildingItem,
  CategoryItem,
} from "../../../types/config";
import {
  ALL_BUILDINGS_LABEL,
  deletedRuleNames,
  ruleSentence,
  rulesProblem,
  type RuleRow,
} from "./rulesFormat";
import SectionShell from "./SectionShell";
import { useConfigSection } from "./useConfigSection";

interface Props {
  token: string;
  reloadKey: number;
  onUnauthorized: () => void;
}

const PRIORITIES: Priority[] = ["P1", "P2", "P3", "P4"];

const toDraft = (res: AutomationRuleList): RuleRow[] =>
  res.items.map((r) => ({
    key: r.id,
    id: r.id,
    name: r.name,
    category_id: r.category.id,
    building_id: r.building?.id ?? "",
    resulting_priority: r.resulting_priority,
    is_active: r.is_active,
  }));

const INPUT =
  "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900";

export default function RulesEditor({ token, reloadKey, onUnauthorized }: Props) {
  const state = useConfigSection<AutomationRuleList, RuleRow[]>({
    token,
    reloadKey,
    onUnauthorized,
    load: fetchAutomationRules,
    save: (t, rows) =>
      saveAutomationRules(
        t,
        rows.map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          name: r.name.trim(),
          category_id: r.category_id,
          building_id: r.building_id === "" ? null : r.building_id,
          resulting_priority: r.resulting_priority,
          is_active: r.is_active,
        })),
      ),
    toDraft,
  });

  // 카테고리·건물 선택지 — 규칙 목록과 따로 불러옴
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setOptionsError(null);
    Promise.all([fetchCategories(token), fetchBuildings(token)])
      .then(([c, b]) => {
        if (cancelled) return;
        setCategories(c.items);
        setBuildings(b.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setOptionsError(
          "카테고리·건물 목록을 불러오지 못해 규칙을 추가할 수 없어요.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, onUnauthorized]);

  const rows = state.draft ?? [];
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "(알 수 없음)";
  const buildingName = (id: string) =>
    buildings.find((b) => b.id === id)?.name ?? "(알 수 없음)";

  const problem = rulesProblem(rows, categoryName, buildingName);
  const removed = deletedRuleNames(state.saved ?? [], rows);
  const confirmMessage =
    removed.length > 0
      ? `규칙 ${removed.map((n) => `'${n}'`).join(", ")}을(를) 삭제해요. 이미 접수된 신고의 우선순위는 그대로예요.`
      : null;

  function update(key: string, patch: Partial<RuleRow>) {
    state.setDraft(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const firstActive = categories.find((c) => c.is_active) ?? categories[0];
    const key = `new-${newCount}`;
    setNewCount((n) => n + 1);
    state.setDraft([
      ...rows,
      {
        key,
        id: null,
        name: "",
        category_id: firstActive?.id ?? "",
        building_id: "",
        resulting_priority: "P1",
        is_active: true,
      },
    ]);
  }

  return (
    <SectionShell
      title="조건-액션 규칙"
      description="새로 접수되는 신고에 적용돼요. 신고가 AI와 매트릭스로 우선순위가 정해진 뒤, 아래 규칙의 카테고리(와 건물)에 맞으면 규칙의 우선순위로 바꾸고 SLA 마감도 그 기준으로 정해요. 규칙이 여러 개 맞으면 건물을 지정한 규칙이 먼저예요. 이미 접수된 신고는 바뀌지 않아요."
      state={state}
      problem={problem}
      confirmMessage={confirmMessage}
    >
      {optionsError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {optionsError}
        </p>
      )}
      {rows.length === 0 && (
        <p className="text-sm text-gray-500">
          아직 규칙이 없어요. 예: 안전 카테고리는 즉시 P1.
        </p>
      )}
      <ul className="space-y-3">
        {rows.map((r) => {
          const cat = categories.find((c) => c.id === r.category_id);
          return (
            <li
              key={r.key}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label="규칙 이름"
                  placeholder="규칙 이름 (예: 안전은 즉시 P1)"
                  className={`${INPUT} w-60`}
                  value={r.name}
                  maxLength={50}
                  onChange={(e) => update(r.key, { name: e.target.value })}
                />
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={r.is_active}
                    onChange={(e) =>
                      update(r.key, { is_active: e.target.checked })
                    }
                  />
                  사용 중
                </label>
                {r.id === null && (
                  <span className="text-xs text-blue-700">새로 추가</span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    state.setDraft(rows.filter((x) => x.key !== r.key))
                  }
                  className="ml-auto rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                >
                  {r.id === null ? "빼기" : "삭제"}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700">
                <label className="flex items-center gap-1.5">
                  카테고리
                  <select
                    aria-label="카테고리"
                    className={INPUT}
                    value={r.category_id}
                    onChange={(e) =>
                      update(r.key, { category_id: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      선택
                    </option>
                    {categories
                      .filter((c) => c.is_active || c.id === r.category_id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.is_active ? "" : " (사용 안 함)"}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  건물
                  <select
                    aria-label="건물"
                    className={INPUT}
                    value={r.building_id}
                    onChange={(e) =>
                      update(r.key, { building_id: e.target.value })
                    }
                  >
                    <option value="">{ALL_BUILDINGS_LABEL}</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  우선순위
                  <select
                    aria-label="우선순위"
                    className={INPUT}
                    value={r.resulting_priority}
                    onChange={(e) =>
                      update(r.key, {
                        resulting_priority: e.target.value as Priority,
                      })
                    }
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {cat && (
                <p className="mt-2 text-xs text-gray-500">
                  {ruleSentence(
                    cat.name,
                    r.building_id === "" ? null : buildingName(r.building_id),
                    r.resulting_priority,
                  )}
                  {!r.is_active && " (지금은 꺼져 있어요)"}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={addRow}
        disabled={categories.length === 0}
        className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + 규칙 추가
      </button>
    </SectionShell>
  );
}
