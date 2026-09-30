// 접수 상세보기 + 상태 변경 (오른쪽에서 열리는 패널).
// 상태는 정상 경로(접수→배정→처리중→해결→종료)의 다음 단계 버튼만 보여준다.
// 허용되지 않는 전이는 backend가 409로 거절하므로 그 메시지를 그대로 보여준다 (규칙은 1-7, 명세 10-2).
import { useEffect, useState } from "react";
import {
  changeReportStatus,
  fetchReportDetail,
} from "../../api/admin";
import { ApiError } from "../../api/client";
import { PriorityBadge, StatusBadge } from "../report/StatusBadge";
import type { AdminReportDetail, ReportStatus } from "../../types/admin";
import { formatDateTime, locationText, slaRemaining } from "./format";
import SlaBadge from "./SlaBadge";

const NEXT_STATUS: Record<ReportStatus, ReportStatus | null> = {
  접수: "배정",
  배정: "처리중",
  처리중: "해결",
  해결: "종료",
  종료: null,
};

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

interface Props {
  token: string;
  reportId: string;
  onClose: () => void;
  /** 상태를 바꾼 뒤 목록을 새로 불러오게 알림 */
  onChanged: () => void;
  onUnauthorized: () => void;
}

export default function ReportDetailPanel({
  token,
  reportId,
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const next = detail ? NEXT_STATUS[detail.status] : null;

  const submit = async (to: ReportStatus) => {
    if (!detail || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      const updated = await changeReportStatus(token, detail.id, to, memo);
      setDetail(updated);
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

  const remaining = detail
    ? slaRemaining(detail.sla_deadline, detail.sla_status)
    : null;

  return (
    <div className="fixed inset-0 z-20 flex justify-end">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label="신고 상세"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-bold text-gray-900">
            {detail ? `신고 #${detail.display_no}` : "신고 상세"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            닫기
          </button>
        </div>

        {loadError && <p className="p-4 text-sm text-red-600">{loadError}</p>}
        {!loadError && !detail && (
          <p className="p-4 text-sm text-gray-400">불러오는 중…</p>
        )}

        {detail && (
          <div className="space-y-5 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={detail.priority} />
              <StatusBadge status={detail.status} />
              <SlaBadge status={detail.sla_status} />
              {remaining && <span className="text-xs text-gray-500">{remaining}</span>}
            </div>

            <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-2">
              <dt className="text-gray-500">카테고리</dt>
              <dd>{detail.category.name}</dd>
              <dt className="text-gray-500">위치</dt>
              <dd>{locationText(detail)}</dd>
              <dt className="text-gray-500">접수일시</dt>
              <dd>{formatDateTime(detail.created_at)}</dd>
              <dt className="text-gray-500">SLA 마감</dt>
              <dd>
                {detail.sla_deadline ? formatDateTime(detail.sla_deadline) : "-"}
              </dd>
              <dt className="text-gray-500">담당 부서</dt>
              <dd>{detail.assigned_dept ?? "미배정"}</dd>
            </dl>

            <section>
              <h3 className="mb-1 font-semibold text-gray-800">상황</h3>
              <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-gray-700">
                {detail.description}
              </p>
              {detail.photo_url && (
                <a
                  href={detail.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-blue-600 underline"
                >
                  첨부 사진 보기
                </a>
              )}
            </section>

            <section>
              <h3 className="mb-2 font-semibold text-gray-800">상태 변경</h3>
              {next ? (
                <div className="space-y-2">
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder="처리 메모 (선택) — 예: 시설팀 배정, 오후 방문 예정"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void submit(next)}
                    className="w-full rounded-lg bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "변경 중…" : `${next} 단계로 변경`}
                  </button>
                </div>
              ) : (
                <p className="text-gray-500">종료된 신고예요.</p>
              )}
              {actionError && (
                <p role="alert" className="mt-2 text-red-600">
                  {actionError}
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 font-semibold text-gray-800">처리 이력</h3>
              <ol className="space-y-2 border-l-2 border-gray-200 pl-3">
                {[...detail.status_history].reverse().map((h, i) => (
                  <li key={`${h.changed_at}-${i}`}>
                    <div className="font-medium text-gray-800">
                      {h.from_status ? `${h.from_status} → ${h.to_status}` : `${h.to_status} (최초 접수)`}
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
      </aside>
    </div>
  );
}
