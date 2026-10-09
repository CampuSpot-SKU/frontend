import type { ChatMessage, InquirySource } from "../types/chat";

interface Props {
  message: ChatMessage;
}

/** 근거 칩에 쓰는 글자: "학칙 제29조(휴학) · 2025.10.1 기준" 형태. as_of는 backend가 만든 문구 그대로. 조 번호·기준일이 없으면 제목만 */
function sourceLabel(s: InquirySource): string {
  // 제목에 이미 조 번호가 들어 있으면("학칙 제29조(휴학)") 다시 붙이지 않음
  const head =
    s.article_no && !s.title.includes(s.article_no)
      ? `${s.article_no} ${s.title}`
      : s.title;
  return s.as_of ? `${head} · ${s.as_of}` : head;
}

const CHIP_CLASS =
  "inline-block max-w-full truncate rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs text-gray-700";

/** 행정문의 답변 밑의 근거 칩들. 주소가 있으면 새 탭으로 열리는 링크 */
function SourceChips({ sources }: { sources: InquirySource[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2">
      <span className="text-xs text-gray-500">근거</span>
      {sources.map((s, i) =>
        s.url ? (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${CHIP_CLASS} hover:bg-gray-100 hover:underline`}
            title={sourceLabel(s)}
          >
            {sourceLabel(s)}
          </a>
        ) : (
          <span key={i} className={CHIP_CLASS} title={sourceLabel(s)}>
            {sourceLabel(s)}
          </span>
        ),
      )}
    </div>
  );
}

/** 말풍선 하나. 사용자는 오른쪽(파란색), 챗봇은 왼쪽(흰색). 챗봇 문의 답변에는 근거 칩이 붙는다. */
function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const hasSources = !isUser && message.sources && message.sources.length > 0;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] break-words rounded-2xl px-4 py-2 text-sm leading-relaxed sm:text-base ${
          isUser
            ? "rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm border border-gray-200 bg-white text-gray-900"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {hasSources && <SourceChips sources={message.sources ?? []} />}
        {!isUser && message.noSources && (
          <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500">
            학교 공식 확인이 필요해요
          </p>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
