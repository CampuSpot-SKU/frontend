// 조건-액션 규칙 편집기의 순수 함수 (작업 1-21) — 입력 검사·삭제 확인 문구·한 줄 설명.
// 화면 컴포넌트 밖에 둬서 경계값을 따로 확인할 수 있게 한다.
import type { Priority } from "../../../types/admin";

/** 화면에서 고치는 규칙 한 줄 */
export interface RuleRow {
  /** 화면에서 줄을 구분하는 값 (저장된 줄은 서버 id, 새 줄은 임시값) */
  key: string;
  id: string | null;
  name: string;
  category_id: string;
  /** "" = 모든 건물 */
  building_id: string;
  resulting_priority: Priority;
  is_active: boolean;
}

export const ALL_BUILDINGS_LABEL = "모든 건물";

/** 입력이 잘못된 이유(저장을 막음). 문제 없으면 null */
export function rulesProblem(
  rows: RuleRow[],
  categoryName: (id: string) => string,
  buildingName: (id: string) => string,
): string | null {
  const names = rows.map((r) => r.name.trim());
  if (names.some((n) => n === "")) return "이름이 비어 있는 규칙이 있어요.";
  const dupName = names.find((n, i) => names.indexOf(n) !== i);
  if (dupName) return `'${dupName}' 이름이 두 번 들어 있어요.`;
  if (rows.some((r) => r.category_id === ""))
    return "카테고리를 고르지 않은 규칙이 있어요.";
  const combos = rows.map((r) => `${r.category_id}|${r.building_id}`);
  const dupIdx = combos.findIndex((c, i) => combos.indexOf(c) !== i);
  if (dupIdx >= 0) {
    const r = rows[dupIdx];
    return `'${categoryName(r.category_id)}' · ${
      r.building_id === "" ? ALL_BUILDINGS_LABEL : buildingName(r.building_id)
    } 조합 규칙이 둘 이상이에요. 같은 조건은 하나만 둘 수 있어요.`;
  }
  return null;
}

/** 저장하면 지워지는 규칙(서버에 있었는데 지금 목록에서 빠진 것)의 이름 */
export function deletedRuleNames(saved: RuleRow[], draft: RuleRow[]): string[] {
  const kept = new Set(draft.map((r) => r.id).filter((id) => id !== null));
  return saved.filter((r) => r.id !== null && !kept.has(r.id)).map((r) => r.name);
}

/** 규칙을 사람이 읽는 한 줄로 — 예: "안전 · 모든 건물 신고 → P1" */
export function ruleSentence(
  categoryName: string,
  buildingName: string | null,
  priority: Priority,
): string {
  return `${categoryName} · ${buildingName ?? ALL_BUILDINGS_LABEL} 신고 → ${priority}`;
}
