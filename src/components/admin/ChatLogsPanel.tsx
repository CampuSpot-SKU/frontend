// 문의 로그 탭 — 학생이 한 행정 문의와 챗봇 답변을 한 쌍씩 최신순으로 보여준다 (작업 1-18 화면, 명세 4-2 행정 문의 로그 뷰어).
// 목적은 RAG 답변 품질 확인: 근거(출처)가 달렸는지, 의도 신뢰도가 낮은 질문이 무엇인지 찾는다.
// 기간(7일·30일·전체)과 "신뢰도 낮은 질문만" 필터, 50건씩 [더 보기]. 조회만 하는 화면이라 운영 데이터를 바꾸지 않는다.
// 학생 식별값(세션 등)은 backend가 내려주지 않으므로 화면에도 없다 (익명 원칙).
import { useEffect, useState } from "react";
import { CHAT_LOG_PERIODS, fetchChatLogs } from "../../api/adminChatLogs";
import { ApiError } from "../../api/client";
import type { ChatLogFilters, ChatLogItem } from "../../types/chatLogs";
import { formatDateTime } from "./format";

interface Props {
  token: string;
  /** 페이지의 새로고침 버튼이 올리는 값 — 바뀌면 처음부터 다시 불러옴 */
  reloadKey: number;
  onUnauthorized: () => void;
}

function loadErrorText(err: unknown): string {
  if (err instanceof ApiError && (err.status === 404 || err.status === 503))
    return "이 기능은 아직 준비 중이에요.";
  return "문의 로그를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

/** "문의 95%" — 의도 점수에 inquiry_score가 있을 때만 */
function inquiryScoreText(scores: Record<string, number> | null): string | null {
  const v = scores?.inquiry_score;
  return typeof v === "number" ? `문의 ${Math.round(v)}%` : null;
}

function LogCard({ item }: { item: ChatLogItem }) {
  const score = inquiryScoreText(item.intent_scores);
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{formatDateTime(item.asked_at)}</span>
        {score && <span className="tabular-nums">{score}</span>}
        {item.low_confidence && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
            신뢰도 낮음
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-gray-900">
        <span className="mr-1 text-gray-500">질문</span>
        <span className="whitespace-pre-wrap break-words">{item.question}</span>
      </p>
      <p className="mt-2 text-sm text-gray-800">
        <span className="mr-1 text-gray-500">답변</span>
        {item.answer ? (
          <span className="whitespace-pre-wrap break-words">{item.answer}</span>
        ) : (
          <span className="text-gray-400">답변이 기록되지 않았어요</span>
        )}
      </p>
      <div className="mt-2 text-xs text-gray-600">
        {item.sources === null ? (
          <span className="text-gray-400">근거 정보 없음</span>
        ) : item.sources.length === 0 ? (
          <span className="text-red-600">근거 없이 답변했어요</span>
        ) : (
          <ul className="space-y-0.5">
            {item.sources.map((s, i) => (
              <li key={`${s.title}-${i}`}>
                <span className="text-gray-500">근거</span>{" "}
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline"
                  >
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
                {s.article_no && ` ${s.article_no}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export default function ChatLogsPanel({
  token,
  reloadKey,
  onUnauthorized,
}: Props) {
  const [filters, setFilters] = useState<ChatLogFilters>({
    days: 30,
    lowConfidenceOnly: false,
  });
  const [items, setItems] = useState<ChatLogItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  // 조건이 바뀌거나 새로고침하면 처음부터 다시
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setMoreError(null);
    setItems(null);
    fetchChatLogs(token, filters)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
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
  }, [token, filters, reloadKey, onUnauthorized]);

  function loadMore() {
    if (!items) return;
    setLoadingMore(true);
    setMoreError(null);
    fetchChatLogs(token, filters, items.length)
      .then((res) => {
        setItems((prev) => [...(prev ?? []), ...res.items]);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setMoreError("더 불러오지 못했어요. 다시 눌러 주세요.");
      })
      .finally(() => setLoadingMore(false));
  }

  return (
    <section aria-label="행정 문의 로그">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="기간" className="flex gap-2">
          {CHAT_LOG_PERIODS.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={filters.days === p.days}
              onClick={() => setFilters((f) => ({ ...f, days: p.days }))}
              className={`rounded-full border px-3 py-1 text-sm ${
                filters.days === p.days
                  ? "border-blue-600 bg-blue-50 font-medium text-blue-700"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={filters.lowConfidenceOnly}
            onChange={(e) =>
              setFilters((f) => ({ ...f, lowConfidenceOnly: e.target.checked }))
            }
          />
          신뢰도 낮은 질문만
        </label>
        {items && (
          <span className="text-xs text-gray-500">
            질문 시각 기준 · 최신순
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && items === null && (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      )}

      {items && items.length === 0 && (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          {filters.lowConfidenceOnly
            ? "이 조건에 맞는 문의가 없어요."
            : "이 기간에 들어온 행정 문의가 없어요."}
        </p>
      )}

      {items && items.length > 0 && (
        <>
          <p className="mb-2 text-sm text-gray-600">
            전체 {total}건 중 {items.length}건 표시
          </p>
          <ul className="space-y-3">
            {items.map((item) => (
              <LogCard key={item.id} item={item} />
            ))}
          </ul>
          {moreError && <p className="mt-3 text-sm text-red-600">{moreError}</p>}
          {items.length < total && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={loadMore}
              className="mt-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {loadingMore ? "불러오는 중…" : "더 보기"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
