// 상세보기 "신고 대화" 구역 (1-25, 명세 4-2) — 신고가 접수되기까지 학생과 챗봇이 나눈 대화를
// 접이식으로 보여준다. 기본은 접힘이고, 펼칠 때만 GET /admin/reports/{id}/conversation(조회만)을 부른다.
// 세션 ID 같은 식별값은 응답에 없다(익명 원칙). 글은 저장 전에 학번·전화번호가 이미 가려져 있다.
import { useEffect, useState } from "react";
import { fetchReportConversation } from "../../api/admin";
import { ApiError } from "../../api/client";
import type { ReportConversation as ConversationData } from "../../types/admin";
import { formatDateTime } from "./format";

interface Props {
  token: string;
  reportId: string;
  onUnauthorized: () => void;
}

export default function ReportConversation({ token, reportId, onUnauthorized }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ConversationData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // 다른 신고로 바뀌면 접고 비운다
  useEffect(() => {
    setOpen(false);
    setData(null);
    setFailed(false);
  }, [reportId]);

  useEffect(() => {
    if (!open || data) return;
    let cancelled = false;
    setFailed(false);
    fetchReportConversation(token, reportId)
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
  }, [open, data, attempt, token, reportId, onUnauthorized]);

  let body = null;
  if (open) {
    if (failed) {
      body = (
        <p className="text-gray-500">
          대화를 불러오지 못했어요.{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="underline">
            다시 시도
          </button>
        </p>
      );
    } else if (!data) {
      body = <p className="text-gray-400">불러오는 중…</p>;
    } else if (data.messages.length === 0) {
      body = (
        <p className="text-gray-500">
          대화 기록이 없어요. 챗봇 대화 없이 만들어진 신고(시연용 데이터)일 수 있어요.
        </p>
      );
    } else {
      body = (
        <>
          {data.truncated && (
            <p className="mb-2 text-xs text-gray-500">대화가 길어서 최근 80개만 보여요.</p>
          )}
          <ul className="space-y-2">
            {data.messages.map((m, i) => (
              <li
                key={`${m.created_at}-${i}`}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <span className="mb-0.5 text-xs text-gray-400">
                  {m.role === "user" ? "학생" : "챗봇"} · {formatDateTime(m.created_at)}
                </span>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 ${
                    m.role === "user" ? "bg-blue-50 text-blue-900" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {m.content}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-400">학번·전화번호는 저장할 때 이미 가려져요.</p>
        </>
      );
    }
  }

  return (
    <section>
      <h3 className="font-semibold text-gray-800">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-left hover:bg-gray-100"
        >
          <span>신고 대화</span>
          <span aria-hidden="true" className="text-xs font-normal text-gray-500">
            {open ? "접기 ▲" : "보기 ▼"}
          </span>
        </button>
      </h3>
      {open && <div className="mt-2">{body}</div>}
    </section>
  );
}
