import { useEffect, useState } from "react";
import {
  fetchMySessions,
  historyErrorMessage,
  shortTime,
} from "../../api/chatHistory";
import type { MySessionItem } from "../../types/history";

interface Props {
  /** 휴대폰 폭에서 서랍이 열렸는지 (넓은 화면에서는 항상 보임) */
  open: boolean;
  onClose: () => void;
  /** 값이 바뀌면 목록을 다시 불러옴 — 메시지를 보낸 뒤·새 대화·로그인 직후 */
  refreshKey: number;
  /** 지금 챗봇이 쓰는 세션(localStorage) — "진행 중" 표시 */
  currentSessionId: string | null;
  /** 가운데에 읽기 전용으로 보고 있는 지난 대화 */
  selectedId: string | null;
  onSelect: (item: MySessionItem) => void;
  onNewConversation: () => void;
  newDisabled: boolean;
}

/**
 * 챗봇 화면 왼쪽 사이드바 — 로그인한 학생의 지난 대화 목록 (작업 1-28, 명세 4-1·5-1).
 * Claude·ChatGPT처럼 대화 화면에서 바로 지난 대화를 고른다. 고르면 가운데 칸에 읽기 전용으로 보여 줌(챗봇 화면이 처리).
 * 로그인했을 때만 챗봇 화면이 이 컴포넌트를 그린다. 넓은 화면은 항상 보이고, 휴대폰은 ☰로 여닫는 서랍.
 */
function HistorySidebar({
  open,
  onClose,
  refreshKey,
  currentSessionId,
  selectedId,
  onSelect,
  onNewConversation,
  newDisabled,
}: Props) {
  const [items, setItems] = useState<MySessionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchMySessions(0)
      .then((r) => {
        if (!alive) return;
        setItems(r.items);
        setTotal(r.total);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(historyErrorMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const r = await fetchMySessions(items.length);
      // 그 사이 새 대화가 생겨 밀린 항목이 겹칠 수 있어 session_id로 걸러 붙임
      setItems((prev) => [
        ...prev,
        ...r.items.filter(
          (i) => !prev.some((p) => p.session_id === i.session_id),
        ),
      ]);
      setTotal(r.total);
    } catch (e) {
      setError(historyErrorMessage(e));
    }
    setLoading(false);
  };

  return (
    <>
      {/* 휴대폰: 서랍이 열렸을 때 뒤를 어둡게, 누르면 닫힘 */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label="이전 대화"
        className={`fixed inset-y-0 left-0 z-20 flex w-72 max-w-[85vw] flex-col border-r border-gray-200 bg-white transition-transform md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-3">
          <button
            type="button"
            onClick={onNewConversation}
            disabled={newDisabled}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
          >
            + 새 대화
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-gray-100 md:hidden"
          >
            닫기
          </button>
        </div>
        <p className="px-4 pb-1 pt-3 text-xs font-medium text-gray-500">
          이전 대화
        </p>
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {error && (
            <p className="px-2 py-2 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
          {!error && !loading && items.length === 0 && (
            <p className="px-2 py-2 text-xs text-gray-500">
              아직 이전 대화가 없어요.
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {items.map((it) => {
              const current = it.session_id === currentSessionId;
              const selected =
                it.session_id === selectedId ||
                (current && selectedId === null);
              return (
                <li key={it.session_id}>
                  <button
                    type="button"
                    onClick={() => onSelect(it)}
                    aria-current={selected ? "true" : undefined}
                    className={`w-full rounded-lg px-2.5 py-2 text-left hover:bg-gray-100 ${
                      selected ? "bg-gray-100" : ""
                    }`}
                  >
                    <span className="block truncate text-sm text-gray-800">
                      {it.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                      {current && (
                        <span className="rounded bg-blue-50 px-1.5 py-px font-medium text-blue-700">
                          진행 중
                        </span>
                      )}
                      {shortTime(it.last_message_at)} · {it.message_count}개
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {loading && (
            <p className="px-2 py-2 text-xs text-gray-400">불러오는 중…</p>
          )}
          {!loading && !error && items.length < total && (
            <button
              type="button"
              onClick={() => void loadMore()}
              className="mt-1 w-full rounded-lg px-2 py-2 text-xs text-gray-600 hover:bg-gray-100"
            >
              더 보기
            </button>
          )}
        </nav>
      </aside>
    </>
  );
}

export default HistorySidebar;
