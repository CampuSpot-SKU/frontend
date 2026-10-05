// 설정 한 구역(카테고리·건물 등)의 "불러오기 → 고치는 중 → 저장" 흐름을 한 곳에 모은 훅.
// - draft: 화면에서 고치는 중인 값. 저장 전에는 서버 값(saved)과 따로 둔다.
// - dirty: 고친 게 있는지(저장 버튼·"저장 안 한 변경" 안내에 씀)
// - 저장은 PUT 전체 통째 저장 — 응답(저장 후 서버 값)으로 draft를 다시 채운다.
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../../api/client";
import { configErrorText } from "../../../api/adminConfig";

interface Options<S, D> {
  token: string;
  /** 페이지의 새로고침 버튼이 올리는 값 — 바뀌면 다시 불러옴 */
  reloadKey: number;
  onUnauthorized: () => void;
  load: (token: string) => Promise<S>;
  save: (token: string, draft: D) => Promise<S>;
  /** 서버 값 → 고치는 값 */
  toDraft: (saved: S) => D;
}

export interface ConfigSectionState<D> {
  /** 서버에 저장돼 있는 값 (고치는 중인 draft와 비교할 때 씀) */
  saved: D | null;
  draft: D | null;
  setDraft: (next: D) => void;
  loading: boolean;
  loadError: string | null;
  saving: boolean;
  saveError: string | null;
  /** 저장에 성공한 직후 true (다시 고치기 시작하면 사라짐) */
  justSaved: boolean;
  dirty: boolean;
  save: () => Promise<void>;
  /** 고친 것을 버리고 서버 값으로 되돌림 */
  revert: () => void;
  reload: () => void;
}

export function useConfigSection<S, D>(
  opts: Options<S, D>,
): ConfigSectionState<D> {
  const [saved, setSaved] = useState<D | null>(null);
  const [draft, setDraftState] = useState<D | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [localKey, setLocalKey] = useState(0);

  // 호출하는 쪽이 매번 새 함수를 넘겨도 불러오기가 반복되지 않게 최신 값만 ref에 둠
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    optsRef.current
      .load(opts.token)
      .then((res) => {
        if (cancelled) return;
        const d = optsRef.current.toDraft(res);
        setSaved(d);
        setDraftState(d);
        setSaveError(null);
        setJustSaved(false);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          optsRef.current.onUnauthorized();
          return;
        }
        setLoadError(configErrorText(err, "load"));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opts.token, opts.reloadKey, localKey]);

  const setDraft = useCallback((next: D) => {
    setDraftState(next);
    setJustSaved(false);
  }, []);

  const dirty =
    draft !== null &&
    saved !== null &&
    JSON.stringify(draft) !== JSON.stringify(saved);

  const save = useCallback(async () => {
    if (draft === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await optsRef.current.save(optsRef.current.token, draft);
      const d = optsRef.current.toDraft(res);
      setSaved(d);
      setDraftState(d);
      setJustSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        optsRef.current.onUnauthorized();
        return;
      }
      setSaveError(configErrorText(err, "save"));
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const revert = useCallback(() => {
    setDraftState(saved);
    setSaveError(null);
    setJustSaved(false);
  }, [saved]);

  const reload = useCallback(() => setLocalKey((k) => k + 1), []);

  return {
    saved,
    draft,
    setDraft,
    loading,
    loadError,
    saving,
    saveError,
    justSaved,
    dirty,
    save,
    revert,
    reload,
  };
}
