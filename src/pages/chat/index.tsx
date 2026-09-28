// 사용자 챗봇 페이지 (작업 1-5, 1단계: 화면 뼈대).
// 메시지 목록 + 입력창. 실제 응답은 src/api/chat.ts가 담당 (지금은 가짜 응답).
import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../../api/chat";
import ChatInput from "../../components/ChatInput";
import MessageBubble from "../../components/MessageBubble";
import type { ChatMessage } from "../../types/chat";

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

function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [waiting, setWaiting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 생기면 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, waiting]);

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setWaiting(true);
    let reply: string;
    try {
      reply = await sendChatMessage(text);
    } catch {
      reply = "죄송해요, 잠시 문제가 생겼어요. 조금 뒤에 다시 시도해 주세요.";
    }
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content: reply },
    ]);
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
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:bg-blue-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {waiting && (
            <div className="text-sm text-gray-400" aria-live="polite">
              답변을 준비하고 있어요…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="shrink-0 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <ChatInput onSend={handleSend} disabled={waiting} />
        </div>
      </footer>
    </div>
  );
}

export default ChatPage;
