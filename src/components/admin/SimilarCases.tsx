// 상세보기 "비슷한 과거 사례" (1-8c, 명세 3-3) — 같은 카테고리의 해결·종료된 신고 중 설명이 비슷한 것과 그때 남긴 처리 메모.
// 펼칠 때만 마운트되어 GET /admin/reports/{id}/similar(조회만)를 부른다.
import { useEffect, useState } from "react";
import { fetchSimilarReports } from "../../api/admin";
import { ApiError } from "../../api/client";
import type { SimilarReportList } from "../../types/admin";
import { formatDateTime, locationText } from "./format";

interface Props {
  token: string;
  reportId: string;
  onUnauthorized: () => void;
}

export default function SimilarCases({ token, reportId, onUnauthorized }: Props) {
  const [data, setData] = useState<SimilarReportList | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setFailed(false);
    fetchSimilarReports(token, reportId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, reportId, onUnauthorized]);

  if (failed) return <p className="text-gray-500">불러오지 못했어요.</p>;
  if (!data) return <p className="text-gray-400">찾는 중…</p>;
  if (!data.embedding_ready) return <p className="text-gray-500">아직 분석 전이에요.</p>;
  if (data.items.length === 0) return <p className="text-gray-500">비슷한 사례가 없어요.</p>;
  return (
    <ul className="space-y-2">
      {data.items.map((s) => (
        <li key={s.id} className="rounded-lg border border-gray-200 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-gray-500">
            <span>
              #{s.display_no} · {locationText(s)}
            </span>
            <span>{s.resolved_at ? `${formatDateTime(s.resolved_at)} 해결` : s.status}</span>
          </div>
          <p className="mt-1 text-gray-800">{s.description}</p>
          {s.resolution_memo && (
            <p className="mt-1 rounded bg-green-50 px-2 py-1 text-green-800">
              처리 메모: {s.resolution_memo}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
