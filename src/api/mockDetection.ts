// 탐지·예측 가짜 데이터 — `/admin?mock=1`일 때만 쓴다 (작업 1-8·1-11 화면 확인용).
// 승격·기각은 메모리에서만 바뀌고 새로고침하면 원상복구된다.
// 실제 API 확인(레벨 3)이 끝나면 이 파일과 adminDetection.ts의 mock 분기를 삭제한다.
// 실제 사람 이름·연락처는 넣지 않는다.
import type {
  ClusterStatus,
  PredictionItem,
  ProblemCluster,
} from "../types/admin";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const later = (ms: number) => new Date(Date.now() + ms).toISOString();

const FACILITY = { id: "mock-cat-facility", name: "시설·설비" };
const CLEAN = { id: "mock-cat-clean", name: "청소·위생" };
const SAFETY = { id: "mock-cat-safety", name: "안전" };

const clusters: ProblemCluster[] = [
  {
    id: "mock-cluster-1",
    building: { id: "mock-b-1", name: "청운관" },
    detail: "1층 정수기",
    category: FACILITY,
    report_count: 4,
    detected_at: ago(3 * HOUR),
    status: "후보",
  },
  {
    id: "mock-cluster-2",
    building: { id: "mock-b-2", name: "북악관" },
    detail: "화장실",
    category: CLEAN,
    report_count: 6,
    detected_at: ago(1 * DAY),
    status: "후보",
  },
  {
    id: "mock-cluster-3",
    building: null, // 건물 목록에서 못 찾은 위치 → "-"
    detail: null,
    category: SAFETY,
    report_count: 3,
    detected_at: ago(2 * DAY),
    status: "후보",
  },
  {
    id: "mock-cluster-4",
    building: { id: "mock-b-3", name: "혜인관" },
    detail: "엘리베이터",
    category: FACILITY,
    report_count: 5,
    detected_at: ago(4 * DAY),
    status: "승격",
  },
  {
    id: "mock-cluster-5",
    building: { id: "mock-b-1", name: "청운관" },
    detail: "복도 조명",
    category: FACILITY,
    report_count: 3,
    detected_at: ago(5 * DAY),
    status: "기각",
  },
];

const predictions: PredictionItem[] = [
  {
    building: { id: "mock-b-1", name: "청운관" },
    detail: "1층 정수기",
    category: FACILITY,
    avg_recurrence_days: 12.4,
    predicted_next_at: ago(1 * DAY), // 어제 → 점검 시점 지남
  },
  {
    building: { id: "mock-b-3", name: "혜인관" },
    detail: "엘리베이터",
    category: FACILITY,
    avg_recurrence_days: 21,
    predicted_next_at: later(3 * DAY), // 3일 뒤 → 곧 점검
  },
  {
    building: { id: "mock-b-2", name: "북악관" },
    detail: "화장실",
    category: CLEAN,
    avg_recurrence_days: 30.6,
    predicted_next_at: later(30 * DAY), // 30일 뒤 → 여유
  },
];

export async function mockFetchClusters(
  status?: ClusterStatus,
): Promise<ProblemCluster[]> {
  return clusters
    .filter((c) => !status || c.status === status)
    .map((c) => ({ ...c }));
}

export async function mockPatchCluster(
  id: string,
  status: "승격" | "기각",
): Promise<ProblemCluster> {
  const found = clusters.find((c) => c.id === id);
  if (!found) throw new Error("mock cluster not found");
  found.status = status;
  return { ...found };
}

export async function mockFetchPredictions(): Promise<PredictionItem[]> {
  return predictions.map((p) => ({ ...p }));
}
