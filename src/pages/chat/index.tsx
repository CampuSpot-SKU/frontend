// 사용자 챗봇 페이지 (작업 1-5).
// 메시지 목록 + 입력창. backend 호출·응답 해석은 src/api/chat.ts가 담당.
// 행정문의 답변(SSE)은 받는 대로 말풍선을 채우고, 첫 글자가 오기 전까지만 "입력 중" 표시.
//
// 신고 흐름은 대화형 (명세 4-1, 1-3c 개편):
//   "3층 정수기가 고장났어요" → 챗봇이 "접수를 도와드릴까요?" → "응" → 필요한 정보를 대화로 묻기
//   → 문장으로 확인 → 접수. 접수 폼·고정 버튼 없이 말풍선만 오가고, backend가 주는 추천 답변(choices)은
//   마지막 말풍선 아래 칩으로 보여준다. 칩을 누르는 건 그 글자를 직접 입력해 보내는 것과 같고,
//   칩에 없는 답은 입력창에 자유롭게 쓰면 된다.
import { useEffect, useRef, useState } from "react";
import { chatErrorMessage, sendChatMessage } from "../../api/chat";
import ChatInput from "../../components/ChatInput";
import MessageBubble from "../../components/MessageBubble";
import TypingIndicator from "../../components/TypingIndicator";
import SlotsCorner from "../../components/report/SlotsCorner";
import type { ChatMessage, SlotsFilled } from "../../types/chat";

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "안녕하세요! 캠퍼스팟이에요.\n고장·불편 신고나 학교 행정 문의를 편하게 말씀해 주세요.",
};

// 처음 들어왔을 때 보여주는 예시 질문 칩. 신고(시설·설비/IT·네트워크/전기)와
// 행정 문의를 하나씩 섞어서 챗봇이 두 가지를 다 처리한다는 걸 바로 보여준다.
// 첫 메시지를 보내고 나면(messages.length > 1) 더 이상 표시하지 않는다.
const SUGGESTIONS = [
  "3층 정수기가 고장났어요",
  "강의실 와이파이가 안 터져요",
  "복도 조명이 깜빡거려요",
  "휴학 신청은 어떻게 하나요?",
];

const chipClass =
  "rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:bg-blue-100";

function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [waiting, setWaiting] = useState(false);
  // backend가 마지막 답변과 함께 준 추천 답변 (다음 메시지를 보내면 사라짐)
  const [choices, setChoices] = useState<string[]>([]);
  // 챗봇이 지금까지 알아낸 신고 내용 — 구석의 [접수 내용 보기]용 (신고 중이 아니면 null)
  const [slots, setSlots] = useState<SlotsFilled | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 생기면 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, waiting, choices]);

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setChoices([]);
    setWaiting(true);
    // 챗봇 답변 말풍선: 스트리밍 중에는 같은 id의 말풍선 내용을 계속 바꿈
    const replyId = crypto.randomUUID();
    const showReply = (content: string) =>
      setMessages((prev) =>
        prev.some((m) => m.id === replyId)
          ? prev.map((m) => (m.id === replyId ? { ...m, content } : m))
          : [...prev, { id: replyId, role: "assistant", content }],
      );
    try {
      const result = await sendChatMessage(text, { onDelta: showReply });
      showReply(result.text);
      setChoices(result.choices ?? []);
      setSlots(result.slots ?? null);
    } catch (err) {
      // 실패하면 오류 문구만 표시 (같은 말을 다시 보내면 됨)
      showReply(chatErrorMessage(err));
    }
    setWaiting(false);
  };

  return (
    <div className="flex h-dvh flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">CampuSpot</h1>
          <p className="text-xs text-gray-500">
            캠퍼스 불편 신고 · 학교 행정 문의
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {messages.length === 1 && !waiting && (
            <div className="flex flex-wrap gap-2 pl-1" aria-label="예시 질문">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSend(s)}
                  className={chipClass}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {/* 답변 말풍선이 아직 안 생겼을 때만 (스트리밍이 시작되면 숨김) */}
          {waiting && messages[messages.length - 1]?.role === "user" && (
            <TypingIndicator />
          )}
          {!waiting && choices.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-1" aria-label="추천 답변">
              {choices.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSend(c)}
                  className={chipClass}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <SlotsCorner slots={slots} />

      <footer className="shrink-0 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <ChatInput onSend={(t) => handleSend(t)} disabled={waiting} />
        </div>
      </footer>
    </div>
  );
}

export default ChatPage;
