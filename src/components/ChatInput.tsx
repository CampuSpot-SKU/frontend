import { useState } from "react";
import type { FormEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

/** 하단 입력창 + 전송 버튼. Enter로도 전송됨. */
function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="불편한 점이나 궁금한 점을 입력하세요"
          maxLength={1000}
          aria-label="메시지 입력"
          className="min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="shrink-0 rounded-full bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          전송
        </button>
      </form>
      <p className="mt-1.5 px-1 text-xs text-gray-500">
        이름·학번·연락처는 입력하지 마세요.
      </p>
    </div>
  );
}

export default ChatInput;
