// 신고 상세 + 상태 변경 (오른쪽에서 열리는 패널).
// 위에서부터: 요약 → 상황 → 같은 건으로 묶인 신고 → (접힘) 대화·비슷한 과거 사례 → 처리 이력. 상태 변경은 아래에 고정.
// 상태는 정상 경로(접수→배정→처리중→해결→종료)의 다음 단계로만 가고, 해결 상태에서만 [처리중으로 되돌리기(재오픈)]가 보인다 (1-7b, 명세 4-2·10-2).
// 같은 묶음에 아직 처리 전인 신고가 더 있으면 [묶음 N건 모두 …로]로 한 번에 올릴 수 있다.
// ↑ ↓ 키 또는 위·아래 버튼으로 목록의 이전·다음 신고로 넘어간다.
import { useEffect, useState } from "react";
import { changeReportStatus, fetchReportDetail } from "../../api/admin";
import { advanceCluster } from "../../api/adminDetection";
import { ApiError } from "../../api/client";
import { PriorityBadge, StatusBadge } from "../report/StatusBadge";
import type {
  AdminReportDetail,
  AdvanceTarget,
  ReportStatus,
} from "../../types/admin";
import Collapsible from "./Collapsible";
import { CLUSTER_STATUS_LABEL, CLUSTER_STATUS_STYLE } from "./detectionFormat";
import {
  formatDateTime,
  locationText,
  relativeTime,
  slaRemaining,
  withRo,
} from "./format";
import ReportConversation from "./ReportConversation";
import SimilarCases from "./SimilarCases";
import SlaBadge from "./SlaBadge";

const PATH: ReportStatus[] = ["접수", "배정", "처리중", "해결", "종료"];
const NEXT_STATUS: Record<ReportStatus, ReportStatus | null> = {
  접수: "배정",
  배정: "처리중",
  처리중: "해결",
  해결: "종료",
  종료: null,
};
const ADVANCE_TARGETS: ReportStatus[] = ["배정", "처리중", "해결"];

/** 해결 → 처리중 되돌리기(재오픈)만 정상 경로 밖에서 허용된 전이 (명세 10-2) */
const REOPEN_TO: ReportStatus = "처리중";

/** ApiError에서 사용자에게 보여줄 문장 (backend는 {detail: "..."} 형식) */
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const d = err.detail;
    if (d && typeof d === "object" && "detail" in d) {
      const v = (d as { detail: unknown }).detail;
      if (typeof v === "string") return v;
    }
  }
  return fallback;
}

/** 접수 때 붙은 사진 — 10분짜리 임시 링크라서 만료되면 불러오기에 실패할 수 있다 (1-10) */
function AttachedPhoto({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <p className="mt-2 text-sm text-gray-500">
        사진을 불러오지 못했어요. 상세를 다시 열어 주세요.
      </p>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
      <img
        src={url}
        alt="첨부 사진"
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-h-48 rounded-lg border border-gray-200 object-contain"
      />
    </a>
  );
}

interface Props {
  token: string;
  reportId: string;
  /** 목록에 보이는 순서대로의 신고 id — 이전·다음 이동용 */
  orderedIds: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
  /** 상태를 바꾼 뒤 목록을 새로 불러오게 알림 */
  onChanged: () => void;
  onUnauthorized: () => void;
}

export default function ReportDetailPanel({
  token,
  reportId,
  orderedIds,
  onSelect,
  onClose,
  onChanged,
  onUnauthorized,
}: Props) {
  const [detail, setDetail] = useState<AdminReportDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setLoadError(null);
    setActionError(null);
    setMemo("");
    fetchReportDetail(token, reportId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setLoadError(errorMessage(err, "상세 내용을 불러오지 못했어요."));
      });
    return () => {
      cancelled = true;
    };
  }, [token, reportId, onUnauthorized]);

  const index = orderedIds.indexOf(reportId);
  const prevId = index > 0 ? orderedIds[index - 1] : null;
  const nextId = index >= 0 && index < orderedIds.length - 1 ? orderedIds[index + 1] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (e.key === "ArrowDown" && nextId) {
        e.preventDefault();
        onSelect(nextId);
      } else if (e.key === "ArrowUp" && prevId) {
        e.preventDefault();
        onSelect(prevId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onSelect, prevId, nextId]);

  const next = detail ? NEXT_STATUS[detail.status] : null;
  const canReopen = detail?.status === "해결";
  const clusterReports = detail?.cluster_reports ?? [];
  // 묶음 전체를 next 단계까지 올리면 바뀌는 신고 수 (자기 자신 포함)
  const bulkCount =
    next && ADVANCE_TARGETS.includes(next) && detail?.cluster
      ? clusterReports.filter((r) => PATH.indexOf(r.status) < PATH.indexOf(next)).length
      : 0;

  const run = async (job: () => Promise<void>) => {
    if (saving) return;
    setSaving(true);
    setActionError(null);
    try {
      await job();
      setMemo("");
      onChanged();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setActionError(errorMessage(err, "상태를 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요."));
    } finally {
      setSaving(false);
    }
  };

  const submit = (to: ReportStatus) =>
    run(async () => {
      if (!detail) return;
      setDetail(await changeReportStatus(token, detail.id, to, memo));
    });

  const submitBulk = (to: AdvanceTarget) =>
    run(async () => {
      if (!detail?.cluster) return;
      await advanceCluster(token, detail.cluster.id, to, memo);
      setDetail(await fetchReportDetail(token, detail.id));
    });

  const remaining = detail ? slaRemaining(detail.sla_deadline, detail.sla_status) : null;

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label="신고 상세"
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2.5">
          <h2 className="text-base font-bold text-gray-900">
            {detail ? `#${detail.display_no}` : "신고 상세"}
          </h2>
          {detail && (
            <>
              <PriorityBadge priority={detail.priority} />
              <StatusBadge status={detail.status} />
            </>
          )}
          <div className="ml-auto flex items-center gap-1">
            {orderedIds.length > 1 && index >= 0 && (
              <>
                <span className="mr-1 text-xs tabular-nums text-gray-400">
                  {index + 1} / {orderedIds.length}
                </span>
                <button
                  type="button"
                  disabled={!prevId}
                  onClick={() => prevId && onSelect(prevId)}
                  aria-label="이전 신고"
                  className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={!nextId}
                  onClick={() => nextId && onSelect(nextId)}
                  aria-label="다음 신고"
                  className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                >
                  ▼
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadError && <p className="p-4 text-sm text-red-600">{loadError}</p>}
          {!loadError && !detail && <p className="p-4 text-sm text-gray-400">불러오는 중…</p>}

          {detail && (
            <div className="space-y-4 p-4 text-sm">
              <div>
                <p className="text-lg font-semibold text-gray-900">{locationText(detail)}</p>
                <p className="mt-0.5 text-gray-600">
                  {detail.category.name} ·{" "}
                  <span title={formatDateTime(detail.created_at)}>
                    {relativeTime(detail.created_at)} 접수
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SlaBadge status={detail.sla_status} />
                  {remaining && <span className="text-xs text-gray-500">{remaining}</span>}
                  {detail.sla_deadline && (
                    <span className="text-xs text-gray-400">
                      마감 {formatDateTime(detail.sla_deadline)}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    담당 {detail.assigned_dept ?? "미배정"}
                  </span>
                </div>
              </div>

              <section>
                <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-gray-800">
                  {detail.description}
                </p>
                {detail.photo_url && <AttachedPhoto url={detail.photo_url} />}
              </section>

              {detail.cluster && clusterReports.length > 1 && (
                <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-semibold text-indigo-900">
                      같은 건 {clusterReports.length}건
                      {detail.cluster.whole_building && " · 건물 전체"}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLUSTER_STATUS_STYLE[detail.cluster.status]}`}
                    >
                      {CLUSTER_STATUS_LABEL[detail.cluster.status]}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {clusterReports.map((r) => {
                      const current = r.id === detail.id;
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            disabled={current}
                            onClick={() => onSelect(r.id)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${
                              current
                                ? "bg-white ring-1 ring-indigo-300"
                                : "hover:bg-white"
                            }`}
                          >
                            <span className="w-12 shrink-0 font-medium tabular-nums">
                              #{r.display_no}
                            </span>
                            <StatusBadge status={r.status} />
                            <span className="min-w-0 flex-1 truncate text-gray-700">
                              {r.description}
                            </span>
                            <span className="shrink-0 text-xs text-gray-400">
                              {relativeTime(r.created_at)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <Collapsible title="신고 대화">
                <ReportConversation
                  token={token}
                  reportId={detail.id}
                  onUnauthorized={onUnauthorized}
                />
              </Collapsible>

              <Collapsible title="비슷한 과거 사례">
                <SimilarCases token={token} reportId={detail.id} onUnauthorized={onUnauthorized} />
              </Collapsible>

              <section>
                <h3 className="mb-2 font-semibold text-gray-800">처리 이력</h3>
                <ol className="space-y-2 border-l-2 border-gray-200 pl-3">
                  {[...detail.status_history].reverse().map((h, i) => (
                    <li key={`${h.changed_at}-${i}`}>
                      <div className="font-medium text-gray-800">
                        {!h.from_status
                          ? `${h.to_status} (최초 접수)`
                          : h.from_status === h.to_status
                            ? `${h.to_status} (자동 조치)`
                            : `${h.from_status} → ${h.to_status}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(h.changed_at)} · {h.changed_by?.name ?? "시스템"}
                      </div>
                      {h.memo && <div className="text-gray-600">{h.memo}</div>}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </div>

        {detail && (
          <div className="space-y-2 border-t border-gray-200 bg-white p-3">
            {next ? (
              <>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  aria-label="처리 메모"
                  placeholder={canReopen ? "메모 (재발 사유)" : "메모 (선택) — 예: 시설팀 배정, 오후 방문"}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  {bulkCount >= 2 && ADVANCE_TARGETS.includes(next) && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void submitBulk(next as AdvanceTarget)}
                      className="min-w-0 flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? "변경 중…" : `같은 건 ${bulkCount}건 모두 ${withRo(next)}`}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void submit(next)}
                    className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
                      bulkCount >= 2
                        ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {saving ? "변경 중…" : bulkCount >= 2 ? `이 신고만 ${withRo(next)}` : `${withRo(next)} 변경`}
                  </button>
                  {canReopen && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void submit(REOPEN_TO)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      재오픈
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">종료된 신고예요.</p>
            )}
            {actionError && (
              <p role="alert" className="text-sm text-red-600">
                {actionError}
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
