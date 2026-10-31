// 반복 신고 탭 — 같은 장소·같은 종류로 반복된 신고를 한 묶음으로 보여주고, 묶인 신고를 펼쳐서 같이 본다 (작업 1-8 화면, 명세 3-3).
// 확인 필요 → [문제로 등록] 또는 [문제 아님] (줄 안에서 한 번 더 확인) / 묶인 신고는 한 번에 배정·처리중·해결로 올릴 수 있다.
// API 값은 후보·승격·기각 그대로, 화면 표시만 확인 필요·문제로 등록·문제 아님 (detectionFormat).
import { useEffect, useRef, useState } from "react";
import {
  advanceCluster,
  fetchClusterDetail,
  fetchProblemClusters,
  patchProblemCluster,
} from "../../api/adminDetection";
import { ApiError } from "../../api/client";
import { PriorityBadge, StatusBadge } from "../report/StatusBadge";
import type {
  AdvanceTarget,
  ClusterStatus,
  ProblemCluster,
  ProblemClusterDetail,
  ReportStatus,
} from "../../types/admin";
import {
  CLUSTER_STATUS_LABEL,
  CLUSTER_STATUS_STYLE,
  clusterLocationText,
} from "./detectionFormat";
import { formatDay, locationText, relativeTime, slaRemaining, withRo } from "./format";
import SlaBadge from "./SlaBadge";

const VIEWS: ClusterStatus[] = ["후보", "승격", "기각"];
const TARGETS: AdvanceTarget[] = ["배정", "처리중", "해결"];
const PATH: ReportStatus[] = ["접수", "배정", "처리중", "해결", "종료"];
const AUTO_EXPAND = 5;

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "이 기능은 준비 중이에요.";
    const d = err.detail;
    if (d && typeof d === "object" && "detail" in d) {
      const v = (d as { detail: unknown }).detail;
      if (typeof v === "string") return v;
    }
  }
  return fallback;
}

type Confirm =
  | { id: string; kind: "decide"; action: "승격" | "기각" }
  | { id: string; kind: "bulk"; to: AdvanceTarget };

interface Props {
  token: string;
  /** 페이지의 새로고침이 올리는 값 — 바뀌면 목록을 다시 불러옴 */
  reloadKey: number;
  /** 접수 목록에서 [묶음 보기]로 들어왔을 때 먼저 보여줄 묶음 */
  focusId: string | null;
  onFocusDone: () => void;
  /** 처리가 성공했을 때 (배지·접수 목록 다시 불러오기) */
  onChanged: () => void;
  onSelectReport: (id: string) => void;
  onUnauthorized: () => void;
}

export default function RepeatReportPanel({
  token,
  reloadKey,
  focusId,
  onFocusDone,
  onChanged,
  onSelectReport,
  onUnauthorized,
}: Props) {
  const [view, setView] = useState<ClusterStatus>("후보");
  const [items, setItems] = useState<ProblemCluster[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, ProblemClusterDetail>>({});
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const initialized = useRef(false);
  const requested = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchProblemClusters(token)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setDetails({});
        requested.current = new Set();
        if (!initialized.current) {
          initialized.current = true;
          const first = res.items.filter((c) => c.status === "후보").slice(0, AUTO_EXPAND);
          setExpanded(new Set(first.map((c) => c.id)));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(errorText(err, "목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요."));
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, onUnauthorized]);

  // 펼쳐진 묶음의 신고 목록을 불러온다
  useEffect(() => {
    if (!items) return;
    for (const id of expanded) {
      if (details[id] || requested.current.has(id)) continue;
      requested.current.add(id);
      fetchClusterDetail(token, id)
        .then((d) => setDetails((prev) => ({ ...prev, [id]: d })))
        .catch((err: unknown) => {
          requested.current.delete(id);
          if (err instanceof ApiError && err.status === 401) onUnauthorized();
        });
    }
  }, [items, expanded, details, token, onUnauthorized]);

  // 접수 목록에서 넘어온 묶음으로 이동
  useEffect(() => {
    if (!focusId || !items) return;
    const target = items.find((c) => c.id === focusId);
    if (target) {
      setView(target.status);
      setExpanded((prev) => new Set(prev).add(focusId));
      setHighlight(focusId);
      window.setTimeout(
        () => document.getElementById(`cluster-${focusId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }),
        80,
      );
      window.setTimeout(() => setHighlight(null), 2500);
    }
    onFocusDone();
  }, [focusId, items, onFocusDone]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function run(id: string, job: () => Promise<string>) {
    setBusyId(id);
    setActionError(null);
    setNotice(null);
    try {
      const done = await job();
      setConfirm(null);
      setNotice(done);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setConfirm(null);
      setActionError(errorText(err, "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요."));
    } finally {
      setBusyId(null);
    }
  }

  const decide = (c: ProblemCluster, action: "승격" | "기각") =>
    run(c.id, async () => {
      await patchProblemCluster(token, c.id, action);
      return action === "승격" ? "문제로 등록했어요." : "문제 아님으로 정리했어요.";
    });

  const bulk = (c: ProblemCluster, to: AdvanceTarget) =>
    run(c.id, async () => {
      const res = await advanceCluster(token, c.id, to, memos[c.id] ?? "");
      setDetails((prev) => ({ ...prev, [c.id]: res }));
      setMemos((prev) => ({ ...prev, [c.id]: "" }));
      return `${res.changed_count}건을 ${withRo(to)} 바꿨어요.`;
    });

  const counts = (s: ClusterStatus) => items?.filter((c) => c.status === s).length ?? 0;
  const shown = (items ?? [])
    .filter((c) => c.status === view)
    .sort((a, b) => {
      if ((a.open_count > 0) !== (b.open_count > 0)) return a.open_count > 0 ? -1 : 1;
      const at = new Date(a.last_reported_at ?? a.detected_at).getTime();
      const bt = new Date(b.last_reported_at ?? b.detected_at).getTime();
      return bt - at;
    });
  const now = Date.now();

  return (
    <section aria-label="반복 신고">
      <div role="group" aria-label="상태" className="mb-3 flex flex-wrap items-center gap-1.5">
        {VIEWS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={view === s}
            onClick={() => {
              setView(s);
              setConfirm(null);
              setActionError(null);
              setNotice(null);
            }}
            className={`rounded-full border px-3 py-1 text-sm ${
              view === s
                ? "border-blue-600 bg-blue-600 font-medium text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {CLUSTER_STATUS_LABEL[s]}
            <span className={`ml-1.5 tabular-nums ${view === s ? "text-blue-100" : "text-gray-400"}`}>
              {counts(s)}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {actionError && <p className="mb-2 text-sm text-red-600">{actionError}</p>}
      {notice && <p className="mb-2 text-sm text-green-700">{notice}</p>}
      {!error && items === null && <p className="text-sm text-gray-400">불러오는 중…</p>}

      {!error && items !== null && shown.length === 0 && (
        <p className="rounded-xl border border-gray-200 bg-white px-3 py-10 text-center text-sm text-gray-400">
          {view === "후보" ? "확인할 반복 신고가 없어요." : `${CLUSTER_STATUS_LABEL[view]}인 묶음이 없어요.`}
        </p>
      )}

      <ul className="space-y-3">
        {shown.map((c) => {
          const isOpen = expanded.has(c.id);
          const detail = details[c.id];
          const busy = busyId === c.id;
          const asking = confirm?.id === c.id ? confirm : null;
          const range =
            c.first_reported_at && c.last_reported_at
              ? formatDay(c.first_reported_at) === formatDay(c.last_reported_at)
                ? formatDay(c.first_reported_at)
                : `${formatDay(c.first_reported_at)} ~ ${formatDay(c.last_reported_at)}`
              : null;
          return (
            <li
              key={c.id}
              id={`cluster-${c.id}`}
              className={`rounded-xl border bg-white transition ${
                highlight === c.id ? "border-blue-500 ring-2 ring-blue-300" : "border-gray-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3">
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? "접기" : "펼치기"}
                  className="flex h-7 w-7 items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-100"
                >
                  {isOpen ? "▼" : "▶"}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">
                    {clusterLocationText(c.building, c.detail)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {c.category.name} · 신고 {c.report_count}건
                    {range && ` · ${range}`}
                    {c.open_count > 0 ? (
                      <span className="font-medium text-orange-600"> · 처리 필요 {c.open_count}건</span>
                    ) : (
                      " · 모두 처리됨"
                    )}
                  </p>
                </div>
                {c.status !== "후보" ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLUSTER_STATUS_STYLE[c.status]}`}
                  >
                    {CLUSTER_STATUS_LABEL[c.status]}
                  </span>
                ) : asking?.kind === "decide" ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm text-gray-700">
                      {asking.action === "승격" ? "문제로 등록할까요?" : "문제 아님으로 할까요?"}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decide(c, asking.action)}
                      className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      확인
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirm(null)}
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
                      onClick={() => setConfirm({ id: c.id, kind: "decide", action: "승격" })}
                      className="rounded-lg border border-indigo-300 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      문제로 등록
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirm({ id: c.id, kind: "decide", action: "기각" })}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      문제 아님
                    </button>
                  </span>
                )}
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                  {!detail ? (
                    <p className="py-3 text-sm text-gray-400">불러오는 중…</p>
                  ) : (
                    <>
                      <ul className="divide-y divide-gray-100">
                        {detail.reports.map((r) => {
                          const remaining = slaRemaining(r.sla_deadline, r.sla_status, now);
                          return (
                            <li key={r.id}>
                              <button
                                type="button"
                                onClick={() => onSelectReport(r.id)}
                                className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-2 text-left hover:bg-gray-50"
                              >
                                <span className="w-14 shrink-0 text-sm font-medium tabular-nums">
                                  #{r.display_no}
                                </span>
                                <PriorityBadge priority={r.priority} />
                                <StatusBadge status={r.status} />
                                <span className="min-w-0 flex-1 basis-40 truncate text-sm text-gray-700">
                                  <span className="text-gray-500">{locationText(r)}</span> {r.description}
                                </span>
                                <SlaBadge status={r.sla_status} />
                                {remaining && <span className="text-xs text-gray-500">{remaining}</span>}
                                <span className="shrink-0 text-xs text-gray-400">
                                  {relativeTime(r.created_at, now)}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>

                      {c.status !== "기각" && c.open_count > 0 && (
                        <div className="mt-3 rounded-lg bg-gray-50 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">한 번에 처리</span>
                            <input
                              value={memos[c.id] ?? ""}
                              onChange={(e) => setMemos((p) => ({ ...p, [c.id]: e.target.value }))}
                              maxLength={1000}
                              placeholder="메모 (선택)"
                              aria-label="처리 메모"
                              className="min-w-[8rem] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
                            />
                            {asking?.kind === "bulk" ? (
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="text-sm text-gray-700">
                                  {detail.reports.filter((r) => PATH.indexOf(r.status) < PATH.indexOf(asking.to)).length}
                                  건을 {withRo(asking.to)} 바꿀까요?
                                </span>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void bulk(c, asking.to)}
                                  className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  확인
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setConfirm(null)}
                                  className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  취소
                                </button>
                              </span>
                            ) : (
                              TARGETS.map((to) => {
                                const n = detail.reports.filter(
                                  (r) => PATH.indexOf(r.status) < PATH.indexOf(to),
                                ).length;
                                return (
                                  <button
                                    key={to}
                                    type="button"
                                    disabled={busy || n === 0}
                                    onClick={() => setConfirm({ id: c.id, kind: "bulk", to })}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                                  >
                                    모두 {withRo(to)}{n > 0 && <span className="ml-1 text-gray-400">{n}</span>}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
