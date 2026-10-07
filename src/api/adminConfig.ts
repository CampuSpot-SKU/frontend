// 설정 관리 API 호출 (작업 1-17 화면 — 명세서 5-1 "관리자용 — 설정 관리").
// GET은 현재 값, PUT은 전체를 통째로 보내 저장 — 응답은 저장 후 GET과 같은 모양.
// 오류: 401 로그인 만료, 409 규칙 위반(아무것도 저장 안 됨), 422 형식·범위 오류.
import { apiFetch, ApiError } from "./client";
import type {
  AutomationRuleIn,
  AutomationRuleList,
  BuildingIn,
  BuildingList,
  CategoryIn,
  CategoryList,
  DetectionSettings,
  PriorityMatrix,
  SlaList,
} from "../types/config";

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function get<T>(token: string, path: string): Promise<T> {
  return apiFetch<T>(`/admin/config/${path}`, { headers: authHeaders(token) });
}

function put<T>(token: string, path: string, body: unknown): Promise<T> {
  return apiFetch<T>(`/admin/config/${path}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

export const fetchCategories = (token: string) =>
  get<CategoryList>(token, "categories");
export const saveCategories = (token: string, items: CategoryIn[]) =>
  put<CategoryList>(token, "categories", { items });

export const fetchBuildings = (token: string) =>
  get<BuildingList>(token, "buildings");
export const saveBuildings = (token: string, items: BuildingIn[]) =>
  put<BuildingList>(token, "buildings", { items });

export const fetchPriorityMatrix = (token: string) =>
  get<PriorityMatrix>(token, "priority-matrix");
export const savePriorityMatrix = (token: string, body: PriorityMatrix) =>
  put<PriorityMatrix>(token, "priority-matrix", body);

export const fetchSla = (token: string) => get<SlaList>(token, "sla");
export const saveSla = (token: string, body: SlaList) =>
  put<SlaList>(token, "sla", body);

export const fetchDetection = (token: string) =>
  get<DetectionSettings>(token, "detection");
export const saveDetection = (token: string, body: DetectionSettings) =>
  put<DetectionSettings>(token, "detection", body);

export const fetchAutomationRules = (token: string) =>
  get<AutomationRuleList>(token, "automation-rules");
export const saveAutomationRules = (token: string, items: AutomationRuleIn[]) =>
  put<AutomationRuleList>(token, "automation-rules", { items });

/** 불러오기·저장 실패를 사용자에게 보여줄 문장으로 (backend는 409에 {detail: "..."}를 줌) */
export function configErrorText(err: unknown, action: "load" | "save"): string {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      const d = err.detail;
      if (d && typeof d === "object" && "detail" in d) {
        const v = (d as { detail: unknown }).detail;
        if (typeof v === "string") return `${v} (아무것도 저장되지 않았어요)`;
      }
      return "설정 규칙에 맞지 않아 저장하지 못했어요. (아무것도 저장되지 않았어요)";
    }
    if (err.status === 422)
      return "입력한 값의 형식이나 범위가 맞지 않아요. 값을 확인해 주세요.";
    if (err.status === 404 || err.status === 503)
      return "이 기능은 아직 준비 중이에요.";
  }
  return action === "load"
    ? "설정을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요."
    : "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}
