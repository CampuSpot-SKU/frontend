/** 챗봇이 답변을 준비하는 동안 보여주는 "입력 중" 말풍선 (점 3개가 차례로 튀어오름). */
function TypingIndicator() {
  return (
    <div className="flex justify-start" role="status" aria-live="polite">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
        <span className="sr-only">답변을 준비하고 있어요</span>
      </div>
    </div>
  );
}

export default TypingIndicator;
