import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  fetchMyReport,
  getMyReportNos,
  reportErrorMessage,
} from "../../api/reports";
import { REPORT_STATUS_ORDER } from "../../types/report";
import type { MyReport } from "../../types/report";
import { PriorityBadge, StatusBadge } from "./StatusBadge";

interface Props {
  onClose: () => void;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

/**
 * 본인 신고 상태 조회 창 (작업 1-12, 명세 4-1 "본인이 접수한 신고의 처리 상태 조회").
 * 접수번호를 입력(또는 이 브라우저에서 접수한 번호를 눌러)하면 현재 상태·처리 단계·변경 이력을 보여준다.
 * 본인 확인은 챗봇과 같은 session_id로 backend가 함 — 다른 사람의 신고는 조회되지 않음.
 */
function ReportStatusDialog({ onClose }: Props) {
  const myNos = getMyReportNos();
  const [input, setInput] = useState(myNos[0] ? String(myNos[0]) : "");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<MyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 부모가 다시 그려질 때마다 onClose가 새 함수여도 아래 효과가 다시 돌지 않게 ref로 보관
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 열리면 입력칸에 커서, Esc로 닫기
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const lookup = async (no: number) => {
    setInput(String(no));
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      setReport(await fetchMyReport(no));
    } catch (err) {
      setError(reportErrorMessage(err));
    }
    setLoading(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const no = Number(input.trim().replace(/^#|번$/g, ""));
    if (!Number.isInteger(no) || no <= 0) {
      setError("접수번호를 숫자로 입력해 주세요.");
      setReport(null);
      return;
    }
    lookup(no);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-status-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2
            id="report-status-title"
            className="text-base font-bold text-gray-900"
          >
            내 신고 조회
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full px-2 py-1 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="접수번호 (예: 12)"
            aria-label="접수번호"
            maxLength={10}
            className="min-w-0 flex-1 rounded-full border border-gray-300 px-4 py-2 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-full bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            조회
          </button>
        </form>

        {myNos.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2"
            aria-label="내가 접수한 신고"
          >
            <span className="text-xs text-gray-500">
              이 브라우저에서 접수한 신고
            </span>
            {myNos.map((n) => (
              <button
                key={n}
                type="button"
                disabled={loading}
                onClick={() => lookup(n)}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {n}번
              </button>
            ))}
          </div>
        )}

        {loading && <p className="text-sm text-gray-500">조회하는 중…</p>}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {report && <ReportResult report={report} />}

        {!report && !error && !loading && (
          <p className="text-xs leading-relaxed text-gray-500">
            챗봇에서 신고가 접수되면 접수번호를 알려드려요. 이 브라우저에서
            접수한 신고만 조회할 수 있어요.
          </p>
        )}
      </div>
    </div>
  );
}

function ReportResult({ report }: { report: MyReport }) {
  const category =
    typeof report.category === "string"
      ? report.category
      : report.category.name;
  const current = REPORT_STATUS_ORDER.indexOf(report.status);
  const history = [...report.status_history].sort((a, b) =>
    a.changed_at.localeCompare(b.changed_at),
  );
  return (
    <section aria-label="조회 결과" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold text-gray-900">
          {report.display_no}번
        </span>
        <StatusBadge status={report.status} />
        <PriorityBadge priority={report.priority} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-gray-500">분류</dt>
        <dd className="text-gray-900">{category}</dd>
        <dt className="text-gray-500">접수</dt>
        <dd className="text-gray-900">{formatDate(report.created_at)}</dd>
      </dl>

      {/* 처리 단계: 접수 → 배정 → 처리중 → 해결 → 종료 */}
      <ol className="flex items-center" aria-label="처리 단계">
        {REPORT_STATUS_ORDER.map((s, i) => {
          const done = i <= current;
          return (
            <li
              key={s}
              aria-current={i === current ? "step" : undefined}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span
                className={`h-2.5 w-full ${i === 0 ? "rounded-l-full" : ""} ${
                  i === REPORT_STATUS_ORDER.length - 1 ? "rounded-r-full" : ""
                } ${done ? "bg-blue-600" : "bg-gray-200"}`}
              />
              <span
                className={`text-xs ${
                  i === current
                    ? "font-bold text-blue-700"
                    : done
                      ? "text-gray-700"
                      : "text-gray-400"
                }`}
              >
                {s}
              </span>
            </li>
          );
        })}
      </ol>

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-gray-700">처리 이력</h3>
          <ul className="flex flex-col gap-2 border-l-2 border-gray-200 pl-3">
            {history.map((h, i) => (
              <li key={`${h.changed_at}-${i}`} className="text-sm">
                <span className="text-gray-500">
                  {formatDate(h.changed_at)}
                </span>{" "}
                <StatusBadge status={h.to_status} />
                {h.memo && <p className="mt-0.5 text-gray-700">{h.memo}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default ReportStatusDialog;
