// 상세보기 "비슷한 과거 사례" 구역 (1-8c, 명세 3-3) — 같은 카테고리의 해결·종료된 신고 중 설명이 비슷한 것과
// 그때 남긴 처리 메모를 보여준다. 데이터는 GET /admin/reports/{id}/similar (조회만).
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

  let body;
  if (failed) {
    body = <p className="text-gray-500">비슷한 사례를 불러오지 못했어요.</p>;
  } else if (!data) {
    body = <p className="text-gray-400">찾는 중…</p>;
  } else if (!data.embedding_ready) {
    body = (
      <p className="text-gray-500">
        아직 분석 전인 신고예요. 매일 새벽 배치가 돌고 나면 비슷한 사례를 찾아 드려요.
      </p>
    );
  } else if (data.items.length === 0) {
    body = <p className="text-gray-500">같은 종류로 해결된 비슷한 사례가 아직 없어요.</p>;
  } else {
    body = (
      <ul className="space-y-2">
        {data.items.map((s) => (
          <li key={s.id} className="rounded-lg border border-gray-200 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-gray-500">
              <span>
                #{s.display_no} · {locationText(s)}
              </span>
              <span>
                {s.resolved_at ? `${formatDateTime(s.resolved_at)} 해결` : s.status}
              </span>
            </div>
            <p className="mt-1 text-gray-800">{s.description}</p>
            {s.resolution_memo ? (
              <p className="mt-1 rounded bg-green-50 px-2 py-1 text-green-800">
                처리 메모: {s.resolution_memo}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">처리 메모 없음</p>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section>
      <h3 className="mb-2 font-semibold text-gray-800">비슷한 과거 사례</h3>
      {body}
    </section>
  );
}
