// 예방 점검 탭 — 같은 장소·분류의 재발 주기로 다음 신고 예상 시점을 보여준다 (작업 1-11 화면, 명세 3-3).
// 예상 시점이 빠른 순. 오늘 기준 지남(빨강) · 7일 이내(주황) · 그 외(회색).
import { useEffect, useState } from "react";
import { fetchPredictions } from "../../api/adminDetection";
import { ApiError } from "../../api/client";
import type { PredictionItem } from "../../types/admin";
import {
  clusterLocationText,
  dayDistanceText,
  formatDate,
  predictionLabel,
  recurrenceText,
  type PredictionLabel,
} from "./detectionFormat";

const LABEL_VIEW: Record<PredictionLabel, { text: string; style: string }> = {
  지남: { text: "점검 시점 지남", style: "bg-red-100 text-red-700" },
  곧: { text: "곧 점검", style: "bg-orange-100 text-orange-700" },
  여유: { text: "여유", style: "bg-gray-100 text-gray-600" },
};
const FILTERS: (PredictionLabel | "전체")[] = ["전체", "지남", "곧", "여유"];

function loadErrorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 404) return "이 기능은 준비 중이에요.";
  return "목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

interface Props {
  token: string;
  /** 페이지의 새로고침이 올리는 값 — 바뀌면 목록을 다시 불러옴 */
  reloadKey: number;
  /** [신고 보기] — 접수 목록에서 그 장소의 신고를 찾아 본다 */
  onFindReports: (text: string) => void;
  onUnauthorized: () => void;
}

export default function PredictionPanel({ token, reloadKey, onFindReports, onUnauthorized }: Props) {
  const [items, setItems] = useState<PredictionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PredictionLabel | "전체">("전체");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchPredictions(token)
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
  }, [token, reloadKey, onUnauthorized]);

  const now = Date.now();
  const sorted = items
    ? [...items].sort(
        (a, b) => new Date(a.predicted_next_at).getTime() - new Date(b.predicted_next_at).getTime(),
      )
    : null;
  const labelOf = (p: PredictionItem) => predictionLabel(p.predicted_next_at, now);
  const countOf = (f: PredictionLabel | "전체") =>
    sorted ? (f === "전체" ? sorted.length : sorted.filter((p) => labelOf(p) === f).length) : 0;
  const shown = sorted ? sorted.filter((p) => filter === "전체" || labelOf(p) === filter) : null;

  return (
    <section aria-label="예방 점검">
      <div role="group" aria-label="점검 시점" className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === f
                ? "border-blue-600 bg-blue-600 font-medium text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {f === "전체" ? "전체" : LABEL_VIEW[f].text}
            <span className={`ml-1.5 tabular-nums ${filter === f ? "text-blue-100" : "text-gray-400"}`}>
              {countOf(f)}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && shown === null && <p className="text-sm text-gray-400">불러오는 중…</p>}

      {!error && shown !== null && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">위치</th>
                <th className="px-3 py-2 font-medium">분류</th>
                <th className="px-3 py-2 font-medium">평균 간격</th>
                <th className="px-3 py-2 font-medium">마지막 신고</th>
                <th className="px-3 py-2 font-medium">다음 예상</th>
                <th className="px-3 py-2 font-medium">점검</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                    {items && items.length === 0
                      ? "같은 건물·분류 신고가 3건 이상 쌓이면 나타나요."
                      : "해당하는 곳이 없어요."}
                  </td>
                </tr>
              )}
              {shown.map((p, i) => {
                const label = LABEL_VIEW[labelOf(p)];
                const where = clusterLocationText(p.building, p.detail);
                return (
                  <tr
                    key={`${p.building?.id ?? "-"}-${p.detail ?? "-"}-${p.category.id}-${i}`}
                    className="border-t border-gray-100"
                  >
                    <td className="px-3 py-2 font-medium text-gray-900">{where}</td>
                    <td className="px-3 py-2">{p.category.name}</td>
                    <td className="whitespace-nowrap px-3 py-2">{recurrenceText(p.avg_recurrence_days)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {p.last_occurred_at ? formatDate(p.last_occurred_at) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatDate(p.predicted_next_at)}
                      <div className="text-xs text-gray-500">{dayDistanceText(p.predicted_next_at, now)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${label.style}`}
                      >
                        {label.text}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onFindReports(where)}
                        className="whitespace-nowrap rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        신고 보기
                      </button>
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
