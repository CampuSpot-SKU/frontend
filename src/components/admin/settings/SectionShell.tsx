// 설정 한 구역의 공통 틀 — 제목·설명 · 편집 영역 · [저장][되돌리기] · 안내/오류 문구.
// 편집 영역(children)은 각 편집기가 채우고, 불러오기·저장 상태 표시는 여기서 한 번만 처리한다.
import { useEffect, useState, type ReactNode } from "react";
import type { ConfigSectionState } from "./useConfigSection";

interface Props<D> {
  title: string;
  description: string;
  state: ConfigSectionState<D>;
  /** 지금 입력값이 잘못된 이유(있으면 저장 막음). 없으면 null */
  problem: string | null;
  /** 저장 전에 한 번 더 확인할 내용(삭제·이름 변경 등). 없으면 null */
  confirmMessage: string | null;
  children: ReactNode;
}

export default function SectionShell<D>({
  title,
  description,
  state,
  problem,
  confirmMessage,
  children,
}: Props<D>) {
  const [confirming, setConfirming] = useState(false);

  // 확인할 내용이 없어지면(되돌렸거나 다시 고침) 확인 단계도 닫음
  useEffect(() => {
    if (confirmMessage === null) setConfirming(false);
  }, [confirmMessage]);

  function onSaveClick() {
    if (confirmMessage && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    void state.save();
  }

  const canSave = state.dirty && !problem && !state.saving;

  return (
    <section
      aria-label={title}
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{description}</p>

      <div className="mt-4">
        {state.loading && <p className="text-sm text-gray-400">불러오는 중…</p>}
        {state.loadError && (
          <div>
            <p className="text-sm text-red-600">{state.loadError}</p>
            <button
              type="button"
              onClick={state.reload}
              className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              다시 불러오기
            </button>
          </div>
        )}
        {!state.loading && !state.loadError && state.draft !== null && children}
      </div>

      {!state.loading && !state.loadError && state.draft !== null && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          {problem && state.dirty && (
            <p role="alert" className="mb-2 text-sm text-red-600">
              {problem}
            </p>
          )}
          {state.saveError && (
            <p role="alert" className="mb-2 text-sm text-red-600">
              {state.saveError}
            </p>
          )}
          {confirming && confirmMessage && (
            <p
              role="alert"
              className="mb-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-900"
            >
              {confirmMessage} 정말 저장할까요?
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSaveClick}
              disabled={!canSave}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {state.saving
                ? "저장 중…"
                : confirming
                  ? "확인하고 저장"
                  : "저장"}
            </button>
            {confirming && (
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                취소
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                state.revert();
              }}
              disabled={!state.dirty || state.saving}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              되돌리기
            </button>
            <span aria-live="polite" className="text-sm">
              {state.justSaved && !state.dirty && (
                <span className="text-green-700">저장했어요.</span>
              )}
              {state.dirty && !state.saving && (
                <span className="text-gray-500">
                  저장하지 않은 변경이 있어요.
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
