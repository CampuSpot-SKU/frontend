// 챗봇 API 호출 — 챗봇 화면은 이 파일의 sendChatMessage·chatErrorMessage만 사용한다.
//
// 흐름 (명세서 5-1 "사용자용 — 챗봇"):
//   1) 브라우저에 session_id가 없으면 POST /chat/sessions로 만들고 localStorage에 저장
//   2) POST /chat/sessions/{session_id}/messages {content}
//   3) 응답 종류에 따라 화면에 보여줄 문구로 바꿈
//      - JSON: 신고 되묻기(follow_up_question) / 신고 접수 완료(report_created) / 애매함(clarifying_question)
//      - SSE(text/event-stream): 행정문의 답변. 이벤트마다 {delta}, 마지막에 {done, sources}
//   세션이 없다고(404) 하면 새 세션을 만들어 한 번만 다시 보낸다 (DB 초기화 등으로 세션이 사라진 경우).
import {
  API_BASE_URL,
  API_PREFIX,
  ApiError,
  apiFetch,
  getSessionId,
  saveSessionId,
} from "./client";
import type {
  ChatJsonReply,
  InquirySource,
  SessionCreated,
} from "../types/chat";

/** 스트리밍 중 지금까지 받은 답변 전체를 넘겨주는 콜백 (말풍선을 실시간으로 채우는 용도) */
export type OnDelta = (textSoFar: string) => void;

/**
 * 사용자 메시지를 보내고 챗봇의 최종 답변 문구를 돌려준다.
 * 행정문의(SSE)일 때는 받는 도중에도 onDelta로 지금까지의 답변을 알려준다.
 * 실패하면 ApiError(또는 네트워크 오류)를 던진다 → 화면은 chatErrorMessage()로 문구를 만든다.
 */
export async function sendChatMessage(
  content: string,
  onDelta?: OnDelta,
): Promise<string> {
  let sessionId = getSessionId() ?? (await createSession());
  let res = await postMessage(sessionId, content);
  if (res.status === 404) {
    sessionId = await createSession();
    res = await postMessage(sessionId, content);
  }
  if (!res.ok) {
    throw new ApiError(res.status, await readBody(res));
  }
  if (res.headers.get("content-type")?.includes("text/event-stream")) {
    return readInquiryStream(res, onDelta);
  }
  return jsonReplyToText((await res.json()) as ChatJsonReply);
}

/** 실패 원인별로 사용자에게 보여줄 문구 */
export function chatErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429)
      return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
    if (err.status === 422)
      return "메시지를 보낼 수 없어요. 1000자 이내로 입력해 주세요.";
    if (err.status === 503)
      return "AI 서버가 잠시 응답하지 않아요. 조금 뒤에 다시 시도해 주세요.";
  }
  return "죄송해요, 잠시 문제가 생겼어요. 조금 뒤에 다시 시도해 주세요.";
}

async function createSession(): Promise<string> {
  const { session_id } = await apiFetch<SessionCreated>("/chat/sessions", {
    method: "POST",
  });
  saveSessionId(session_id);
  return session_id;
}

// SSE 응답을 읽어야 해서 apiFetch(JSON 전용) 대신 fetch를 직접 사용
function postMessage(sessionId: string, content: string): Promise<Response> {
  return fetch(
    `${API_BASE_URL}${API_PREFIX}/chat/sessions/${sessionId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
}

async function readBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function jsonReplyToText(reply: ChatJsonReply): string {
  if (reply.intent === "unclear") return reply.clarifying_question;
  if ("report_created" in reply) {
    const r = reply.report;
    // TODO(1-3b): 명세 4-1 "AI 판정 결과와 이유 한 줄"은 backend 응답에 이유가 추가되면 여기에 표시
    return (
      `신고가 접수됐어요! 접수번호는 ${r.display_no}번이에요.\n` +
      `· 분류: ${r.category.name} · 우선순위 ${r.priority}\n` +
      "담당 부서에서 확인 후 처리할게요."
    );
  }
  return reply.follow_up_question;
}

/** 행정문의 SSE 스트림을 끝까지 읽어서 최종 답변(+근거)을 돌려준다. */
async function readInquiryStream(
  res: Response,
  onDelta?: OnDelta,
): Promise<string> {
  let text = "";
  let sources: InquirySource[] = [];
  const reader = res.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      // SSE 이벤트는 빈 줄(\n\n)로 구분됨. 마지막 조각은 아직 덜 온 것일 수 있어 남겨둠
      const events = buffer.split("\n\n");
      buffer = done ? "" : (events.pop() ?? "");
      for (const event of events) {
        const data = event
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");
        if (!data) continue;
        const payload = JSON.parse(data) as {
          delta?: string;
          done?: boolean;
          sources?: InquirySource[];
        };
        if (payload.delta) {
          text += payload.delta;
          onDelta?.(text);
        }
        if (payload.done) sources = payload.sources ?? [];
      }
      if (done) break;
    }
  }
  if (!text) return chatErrorMessage(null);
  if (sources.length > 0) {
    text +=
      "\n\n근거: " +
      sources.map((s) => `${s.article_no} ${s.title}`).join(", ");
  }
  return text;
}
