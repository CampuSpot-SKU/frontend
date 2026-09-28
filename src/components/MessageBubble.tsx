import type { ChatMessage } from "../types/chat";

interface Props {
  message: ChatMessage;
}

/** 말풍선 하나. 사용자는 오른쪽(파란색), 챗봇은 왼쪽(흰색). */
function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm leading-relaxed sm:text-base ${
          isUser
            ? "rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm border border-gray-200 bg-white text-gray-900"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export default MessageBubble;
