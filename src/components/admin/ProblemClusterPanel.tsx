// 문제 후보 탭 — 같은 장소에서 반복된 신고 묶음(후보)을 보고 [승격]/[기각]한다 (작업 1-8 화면, 명세 3-3).
// 상태 필터(기본 "후보") → 표 → 후보 줄에서만 [승격][기각] → 줄 안에서 한 번 더 확인 → PATCH → 목록 갱신.
import { useEffect, useState } from "react";
import {
  fetchProblemClusters,
  patchProblemCluster,
} from "../../api/adminDetection";
import { ApiError } from "../../api/client";
import type { ClusterStatus, ProblemCluster } from "../../types/admin";
import { clusterLocationText } from "./detectionFormat";
import { formatDateTime } from "./format";

const STATUSES: ClusterStatus[] = ["후보", "승격", "기각"];

const BADGE_STYLE: Record<ClusterStatus, string> = {
  후보: "bg-yellow-100 text-yellow-800",
  승격: "bg-blue-100 text-blue-700",
  기각: "bg-gray-100 text-gray-600",
};

function loadErrorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 404)
    return "이 기능은 준비 중이에요.";
  return "목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

function patchErrorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 404)
    return "이 기능은 준비 중이에요.";
  return "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

interface Props {
  token: string;
  /** 페이지의 새로고침 버튼이 올리는 값 — 바뀌면 목록을 다시 불러옴 */
  reloadKey: number;
  /** 승격·기각이 성공했을 때 (탭 배지 건수 다시 세기용) */
  onChanged: () => void;
  onUnauthorized: () => void;
}

export default function ProblemClusterPanel({
  token,
  reloadKey,
  onChanged,
  onUnauthorized,
}: Props) {
  const [status, setStatus] = useState<ClusterStatus>("후보");
  const [items, setItems] = useState<ProblemCluster[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [localKey, setLocalKey] = useState(0);
  // 확인 단계에 들어간 줄과 처리 중인 줄
  const [confirming, setConfirming] = useState<{
    id: string;
    action: "승격" | "기각";
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setItems(null);
    fetchProblemClusters(token, status)
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(loadErrorText(err));
      });
    return () => {
      cancelled = true;
    };
  }, [token, status, reloadKey, localKey, onUnauthorized]);

  async function apply(id: string, action: "승격" | "기각") {
    setBusyId(id);
    setActionError(null);
    try {
      await patchProblemCluster(token, id, action);
      setConfirming(null);
      setLocalKey((k) => k + 1); // 목록 다시 불러오기 — 그 줄은 현재 필터에서 사라짐
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setConfirming(null);
      setActionError(patchErrorText(err));
    } finally {
      setBusyId(null);
    }
  }

  // 감지 시각 최신순
  const sorted = items
    ? [...items].sort(
        (a, b) =>
          new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime(),
      )
    : null;

  return (
    <section aria-label="문제 후보">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          aria-label="후보 상태"
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ClusterStatus);
            setConfirming(null);
            setActionError(null);
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          같은 장소에서 반복된 신고를 묶어 보여줘요. 승격하면 정식 문제로
          다루고, 기각하면 목록에서 빠져요.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {actionError && (
        <p className="mb-2 text-sm text-red-600">{actionError}</p>
      )}
      {!error && sorted === null && (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      )}

      {!error && sorted !== null && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2">위치</th>
                <th className="px-3 py-2">분류</th>
                <th className="px-3 py-2">묶인 신고</th>
                <th className="px-3 py-2">감지 시각</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">처리</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-gray-400"
                  >
                    {status === "후보"
                      ? "지금 확인할 문제 후보가 없어요."
                      : `${status} 처리된 문제 후보가 없어요.`}
                  </td>
                </tr>
              )}
              {sorted.map((c) => {
                const busy = busyId === c.id;
                const asking =
                  confirming?.id === c.id ? confirming.action : null;
                return (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      {clusterLocationText(c.building, c.detail)}
                    </td>
                    <td className="px-3 py-2">{c.category.name}</td>
                    <td className="px-3 py-2">{c.report_count}건</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDateTime(c.detected_at)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_STYLE[c.status]}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {c.status !== "후보" ? (
                        <span className="text-gray-400">-</span>
                      ) : asking ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-gray-700">{asking}할까요?</span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void apply(c.id, asking)}
                            className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            확인
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirming(null)}
                            className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                          >
                            취소
                          </button>
                        </span>
                      ) : (
                        <span className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setConfirming({ id: c.id, action: "승격" })
                            }
                            className="rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                          >
                            승격
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setConfirming({ id: c.id, action: "기각" })
                            }
                            className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                          >
                            기각
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
