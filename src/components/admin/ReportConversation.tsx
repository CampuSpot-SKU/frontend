// 상세보기 "신고 대화" (1-25, 명세 4-2) — 신고가 접수되기까지 학생과 챗봇이 나눈 대화.
// 펼칠 때만 마운트되어 GET /admin/reports/{id}/conversation(조회만)을 부른다. 세션 ID 같은 식별값은 응답에 없다(익명 원칙).
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
  const [data, setData] = useState<ConversationData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setData(null);
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
  }, [attempt, token, reportId, onUnauthorized]);

  if (failed) {
    return (
      <p className="text-gray-500">
        불러오지 못했어요.{" "}
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="underline">
          다시 시도
        </button>
      </p>
    );
  }
  if (!data) return <p className="text-gray-400">불러오는 중…</p>;
  if (data.messages.length === 0) return <p className="text-gray-500">대화 기록이 없어요.</p>;
  return (
    <>
      {data.truncated && <p className="mb-2 text-xs text-gray-500">최근 80개만 보여요.</p>}
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
    </>
  );
}
