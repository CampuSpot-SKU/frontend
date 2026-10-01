// 챗봇 API 호출 — 챗봇 화면은 이 파일의 sendChatMessage·chatErrorMessage만 사용한다.
//
// 흐름 (명세서 5-1 "사용자용 — 챗봇"):
//   1) 브라우저에 session_id가 없으면 POST /chat/sessions로 만들고 localStorage에 저장
//   2) POST /chat/sessions/{session_id}/messages {content, action?, draft?}
//      - action·draft: 대화형 개편 이후 화면이 보내지 않음 (backend는 계속 받아줌 — 하위 호환)
//   3) 응답 종류에 따라 화면에 보여줄 문구 + 신고 흐름 단계(phase)로 바꿈
//      - JSON: 신고 되묻기 / 요약 확인(confirm_required) / 취소(report_cancelled) /
//              접수 완료(report_created) / 애매함(clarifying_question)
//      - SSE(text/event-stream): 행정문의 답변. 이벤트마다 {delta}, 마지막에 {done, sources}
//   세션이 없다고(404) 하면 새 세션을 만들어 한 번만 다시 보낸다 (DB 초기화 등으로 세션이 사라진 경우).
//
// 신고 흐름은 대화형(명세 4-1): 접수 제안 → 정보 묻기 → 문장 확인. 응답의 choices는 추천 답변 칩.
import {
  API_BASE_URL,
  API_PREFIX,
  ApiError,
  apiFetch,
  getSessionId,
  saveSessionId,
} from "./client";
import type {
  ChatAction,
  ChatJsonReply,
  ChatResult,
  InquirySource,
  MessageIn,
  ReportDraft,
  SessionCreated,
} from "../types/chat";

/** 스트리밍 중 지금까지 받은 답변 전체를 넘겨주는 콜백 (말풍선을 실시간으로 채우는 용도) */
export type OnDelta = (textSoFar: string) => void;

export interface SendOptions {
  onDelta?: OnDelta;
  action?: ChatAction;
  draft?: ReportDraft;
}

/**
 * 사용자 메시지를 보내고 챗봇의 최종 답변 문구 + 신고 흐름 단계를 돌려준다.
 * 행정문의(SSE)일 때는 받는 도중에도 onDelta로 지금까지의 답변을 알려준다.
 * 실패하면 ApiError(또는 네트워크 오류)를 던진다 → 화면은 chatErrorMessage()로 문구를 만든다.
 */
export async function sendChatMessage(
  content: string,
  { onDelta, action, draft }: SendOptions = {},
): Promise<ChatResult> {
  const body: MessageIn = { content, action, draft };
  let sessionId = getSessionId() ?? (await createSession());
  let res = await postMessage(sessionId, body);
  if (res.status === 404) {
    sessionId = await createSession();
    res = await postMessage(sessionId, body);
  }
  if (!res.ok) {
    throw new ApiError(res.status, await readBody(res));
  }
  if (res.headers.get("content-type")?.includes("text/event-stream")) {
    // 행정문의 답변 = 신고 흐름이 아님 ([안내만 받을래요]를 누른 뒤의 답변도 여기로 옴)
    return { text: await readInquiryStream(res, onDelta), phase: "none" };
  }
  return interpretJsonReply((await res.json()) as ChatJsonReply);
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

export async function createSession(): Promise<string> {
  const { session_id } = await apiFetch<SessionCreated>("/chat/sessions", {
    method: "POST",
  });
  saveSessionId(session_id);
  return session_id;
}

// SSE 응답을 읽어야 해서 apiFetch(JSON 전용) 대신 fetch를 직접 사용
function postMessage(sessionId: string, body: MessageIn): Promise<Response> {
  return fetch(
    `${API_BASE_URL}${API_PREFIX}/chat/sessions/${sessionId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // action·draft가 undefined면 JSON.stringify가 빼고 보냄 → 기존 요청 {content}와 같음
      body: JSON.stringify(body),
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

function interpretJsonReply(reply: ChatJsonReply): ChatResult {
  if (reply.intent === "unclear") {
    return { text: reply.clarifying_question, phase: "none" };
  }
  if ("report_created" in reply) {
    return {
      text: reportCreatedText(reply),
      phase: "ended",
      reportNo: reply.report.display_no,
      choices: reply.choices ?? undefined,
    };
  }
  if ("report_cancelled" in reply) {
    return { text: reply.message, phase: "ended" };
  }
  // 대화형 흐름: 접수 제안·되묻기·확인 모두 그냥 챗봇의 말 + (있으면) 추천 답변 칩.
  // 위치·상황을 따로 보여주는 폼은 없음 — 알아낸 내용은 챗봇이 문장으로 확인해 줌
  const choices = reply.choices ?? undefined;
  const slots = reply.slots_filled;
  if ("confirm_required" in reply) {
    return { text: reply.summary, phase: "none", choices, slots };
  }
  return { text: reply.follow_up_question, phase: "none", choices, slots };
}

function reportCreatedText(
  reply: Extract<ChatJsonReply, { report_created: true }>,
): string {
  // backend가 완성 문구(message)를 주면 그대로 — 접수번호·위치·AI 판정 이유가 들어 있음 (1-3c)
  if (reply.message) return reply.message;
  const r = reply.report;
  return (
    `신고가 접수됐어요! 접수번호는 ${r.display_no}번이에요.\n` +
    `· 분류: ${r.category.name} · 우선순위 ${r.priority}\n` +
    "담당 부서에서 확인 후 처리할게요."
  );
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
