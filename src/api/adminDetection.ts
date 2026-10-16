// 탐지·예측 관리자 API 호출 (작업 1-8 문제 후보, 1-11 예방 점검 — 명세서 5-1 관리자용).
// 401/404 등은 apiFetch가 던지는 ApiError를 그대로 던진다 (호출한 화면이 처리).
import { apiFetch } from "./client";
import type {
  ClusterStatus,
  PredictionList,
  ProblemCluster,
  ProblemClusterList,
} from "../types/admin";

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** GET /admin/problem-clusters — status를 생략하면 전체. */
export async function fetchProblemClusters(
  token: string,
  status?: ClusterStatus,
): Promise<ProblemClusterList> {
  const query = status ? `?${new URLSearchParams({ status }).toString()}` : "";
  return apiFetch<ProblemClusterList>(`/admin/problem-clusters${query}`, {
    headers: authHeaders(token),
  });
}

/** PATCH /admin/problem-clusters/{id} — 후보를 승격 또는 기각. */
export async function patchProblemCluster(
  token: string,
  id: string,
  status: "승격" | "기각",
): Promise<ProblemCluster> {
  return apiFetch<ProblemCluster>(`/admin/problem-clusters/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
}

/** GET /admin/predictions — 재발 예측 목록. 비어 있으면 "예측 불가(신고 3건 미만)". */
export async function fetchPredictions(token: string): Promise<PredictionList> {
  return apiFetch<PredictionList>("/admin/predictions", {
    headers: authHeaders(token),
  });
}
