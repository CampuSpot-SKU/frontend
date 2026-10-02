// 예방 점검 탭 — 같은 장소·분류의 재발 주기로 다음 신고 예상 시점을 보여준다 (작업 1-11 화면, 명세 3-3).
// 예상 시점이 빠른 순. 오늘 기준 지남(빨강) · 7일 이내(주황) · 그 외(회색) 라벨.
import { useEffect, useState } from "react";
import { fetchPredictions } from "../../api/adminDetection";
import { ApiError } from "../../api/client";
import type { PredictionItem } from "../../types/admin";
import {
  clusterLocationText,
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

function loadErrorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 404)
    return "이 기능은 준비 중이에요.";
  return "목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

interface Props {
  token: string;
  /** 페이지의 새로고침 버튼이 올리는 값 — 바뀌면 목록을 다시 불러옴 */
  reloadKey: number;
  onUnauthorized: () => void;
}

export default function PredictionPanel({
  token,
  reloadKey,
  onUnauthorized,
}: Props) {
  const [items, setItems] = useState<PredictionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setItems(null);
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

  // 예상 시점 빠른 순
  const sorted = items
    ? [...items].sort(
        (a, b) =>
          new Date(a.predicted_next_at).getTime() -
          new Date(b.predicted_next_at).getTime(),
      )
    : null;
  const now = Date.now();

  return (
    <section aria-label="예방 점검">
      <p className="mb-3 text-xs text-gray-500">
        같은 장소·분류에서 신고가 반복된 주기로 다음 발생 시점을 예상해요. 미리
        점검하면 신고가 들어오기 전에 막을 수 있어요.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
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
                <th className="px-3 py-2">평균 재발 간격</th>
                <th className="px-3 py-2">다음 예상 시점</th>
                <th className="px-3 py-2">상태</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-gray-400"
                  >
                    아직 예측할 만큼 신고가 쌓이지 않았어요. (같은 건물·분류의
                    신고가 3건 이상 필요해요)
                  </td>
                </tr>
              )}
              {sorted.map((p, i) => {
                const label =
                  LABEL_VIEW[predictionLabel(p.predicted_next_at, now)];
                return (
                  <tr
                    key={`${p.building?.id ?? "-"}-${p.detail ?? "-"}-${p.category.id}-${i}`}
                    className="border-t border-gray-100"
                  >
                    <td className="px-3 py-2">
                      {clusterLocationText(p.building, p.detail)}
                    </td>
                    <td className="px-3 py-2">{p.category.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {recurrenceText(p.avg_recurrence_days)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(p.predicted_next_at)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${label.style}`}
                      >
                        {label.text}
                      </span>
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
