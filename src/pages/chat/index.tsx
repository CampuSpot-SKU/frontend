// 사용자 챗봇 페이지 (작업 1-5, 1-5b).
// 메시지 목록 + 입력창 + (신고 중일 때) 접수 폼. backend 호출·응답 해석은 src/api/chat.ts가 담당.
// 행정문의 답변(SSE)은 받는 대로 말풍선을 채우고, 첫 글자가 오기 전까지만 "입력 중" 표시.
//
// 신고 흐름 개편 (명세 4-1, 1-5b):
//   - 대화로 알아낸 건물·층·세부장소·상황을 접수 폼에 실시간 표시
//     (넓은 화면 = 채팅 오른쪽 패널, 모바일 = 채팅 위 접이식 카드)
//   - 위치·상황을 묻는 중: [안내만 받을래요] / 요약 확인 중: [접수] [수정] [취소]
//   - [수정]을 누르면 폼을 직접 고칠 수 있고, [접수]를 누르면 그때의 폼 값을 최종 값으로 보냄
//   - backend가 1-3c 형식으로 응답할 때만 켜짐 (src/api/chat.ts 설명 참고)
import { useEffect, useRef, useState } from "react";
import type { SendOptions } from "../../api/chat";
import { chatErrorMessage, sendChatMessage } from "../../api/chat";
import { fetchLocations } from "../../api/locations";
import ChatInput from "../../components/ChatInput";
import MessageBubble from "../../components/MessageBubble";
import TypingIndicator from "../../components/TypingIndicator";
import ReportActions from "../../components/report/ReportActions";
import {
  applyToiletGender,
  needsToiletChoice,
} from "../../components/report/ToiletChips";
import type { ToiletGender } from "../../components/report/ToiletChips";
import {
  ReportPanelDesktop,
  ReportPanelMobile,
} from "../../components/report/ReportPanel";
import type {
  ChatMessage,
  LocationOptions,
  ReportDraft,
  ReportPhase,
} from "../../types/chat";

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

const EMPTY_DRAFT: ReportDraft = {
  building: "",
  floor: "",
  detail: "",
  description: "",
};

/** 접수 가능 조건 (명세 4-1): 상황 + 위치(건물 또는 세부장소 — 층만으로는 부족) */
function canConfirmDraft(d: ReportDraft): boolean {
  return (
    d.description.trim() !== "" &&
    (d.building.trim() !== "" || d.detail.trim() !== "")
  );
}

function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [waiting, setWaiting] = useState(false);
  // 신고 흐름 상태 (1-5b)
  const [phase, setPhase] = useState<ReportPhase>("none");
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [editing, setEditing] = useState(false);
  // 학생이 [수정] 후 직접 고친 칸 — 그 뒤 챗봇 응답이 와도 이 칸은 덮어쓰지 않음
  // (ref인 이유: 응답을 기다리는 동안 고친 칸도 응답 처리 시점에 바로 반영되게)
  const editedRef = useRef<Set<keyof ReportDraft>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  // 되묻기 선택지 버튼 (은주관 [은주1관][은주2관][잘 모르겠어요])
  const [choices, setChoices] = useState<string[] | undefined>();
  // 화장실 [남][여][모름] — [접수] 때 세부장소에 붙여 보냄 (선택 사항)
  const [toilet, setToilet] = useState<ToiletGender>(null);
  // 접수 폼 위치 선택 목록 (GET /locations) — 신고가 시작되면 한 번 받아옴
  const [locations, setLocations] = useState<LocationOptions | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const showReportUi = phase === "collecting" || phase === "confirming";
  const canConfirm = canConfirmDraft(draft);

  // 새 메시지가 생기면 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, waiting, phase]);

  useEffect(() => {
    if (showReportUi && !locations) {
      fetchLocations().then((l) => l && setLocations(l));
    }
  }, [showReportUi, locations]);

  // [수정]을 누르면 지금 화면에 보이는 폼(패널 또는 카드)의 첫 칸에 커서
  useEffect(() => {
    if (!editing) return;
    const inputs = document.querySelectorAll<HTMLElement>(
      "[data-report-first]",
    );
    Array.from(inputs)
      .find((el) => el.offsetParent !== null)
      ?.focus();
  }, [editing, mobileOpen]);

  const resetReport = () => {
    setDraft(EMPTY_DRAFT);
    setEditing(false);
    editedRef.current = new Set();
    setMobileOpen(false);
    setToilet(null);
  };

  const handleSend = async (
    text: string,
    options: Omit<SendOptions, "onDelta"> = {},
  ) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
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
      const result = await sendChatMessage(text, {
        ...options,
        onDelta: showReply,
      });
      showReply(result.text);
      setPhase(result.phase);
      setChoices(result.choices);
      if (result.phase === "collecting" || result.phase === "confirming") {
        const fromChat = result.draft ?? EMPTY_DRAFT;
        // 대화로 알아낸 값으로 폼을 채우되, 학생이 직접 고친 칸은 그대로 둠
        setDraft((prev) => {
          const next = { ...fromChat };
          editedRef.current.forEach((k) => {
            next[k] = prev[k];
          });
          return next;
        });
      } else {
        resetReport();
      }
    } catch (err) {
      // 실패하면 신고 흐름 상태는 그대로 두고(다시 누를 수 있게) 오류 문구만 표시
      showReply(chatErrorMessage(err));
    }
    setWaiting(false);
  };

  const handleDraftChange = (field: keyof ReportDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    editedRef.current.add(field);
  };

  const handleEdit = () => {
    setEditing(true);
    setMobileOpen(true);
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    handleSend("접수", {
      action: "confirm_report",
      draft: { ...draft, detail: applyToiletGender(draft.detail, toilet) },
    });
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

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {showReportUi && (
            <ReportPanelMobile
              draft={draft}
              editing={editing}
              disabled={waiting}
              canConfirm={canConfirm}
              onChange={handleDraftChange}
              onConfirm={handleConfirm}
              locations={locations}
              toilet={toilet}
              onToiletChange={setToilet}
              open={mobileOpen}
              onToggle={() => setMobileOpen((v) => !v)}
            />
          )}

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {messages.length === 1 && !waiting && (
                <div
                  className="flex flex-wrap gap-2 pl-1"
                  aria-label="예시 질문"
                >
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
              {/* 답변 말풍선이 아직 안 생겼을 때만 (스트리밍이 시작되면 숨김) */}
              {waiting && messages[messages.length - 1]?.role === "user" && (
                <TypingIndicator />
              )}
              {!waiting && (
                <ReportActions
                  phase={phase}
                  disabled={waiting}
                  canConfirm={canConfirm}
                  onSwitchToInquiry={() =>
                    handleSend("안내만 받을래요", {
                      action: "switch_to_inquiry",
                    })
                  }
                  onConfirm={handleConfirm}
                  onEdit={handleEdit}
                  onCancel={() =>
                    handleSend("취소", { action: "cancel_report" })
                  }
                  choices={choices}
                  onChoice={(c) => handleSend(c)}
                  showToilet={needsToiletChoice(draft.detail)}
                  toilet={toilet}
                  onToiletChange={setToilet}
                />
              )}
              <div ref={bottomRef} />
            </div>
          </main>

          <footer className="shrink-0 border-t border-gray-200 bg-white">
            <div className="mx-auto max-w-2xl px-4 py-3">
              <ChatInput onSend={(t) => handleSend(t)} disabled={waiting} />
            </div>
          </footer>
        </div>

        {showReportUi && (
          <ReportPanelDesktop
            draft={draft}
            editing={editing}
            disabled={waiting}
            canConfirm={canConfirm}
            onChange={handleDraftChange}
            onConfirm={handleConfirm}
            locations={locations}
            toilet={toilet}
            onToiletChange={setToilet}
          />
        )}
      </div>
    </div>
  );
}

export default ChatPage;
