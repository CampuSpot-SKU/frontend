// 사용자 챗봇 페이지 (작업 1-5).
// 메시지 목록 + 입력창. backend 호출·응답 해석은 src/api/chat.ts가 담당.
// 행정문의 답변(SSE)은 받는 대로 말풍선을 채우고, 첫 글자가 오기 전까지만 "입력 중" 표시.
//
// 신고 흐름은 대화형 (명세 4-1, 1-3c 개편):
//   "3층 정수기가 고장났어요" → 챗봇이 "접수를 도와드릴까요?" → "응" → 필요한 정보를 대화로 묻기
//   → 문장으로 확인 → 접수. 접수 폼·고정 버튼 없이 말풍선만 오가고, backend가 주는 추천 답변(choices)은
//   마지막 말풍선 아래 칩으로 보여준다. 칩을 누르는 건 그 글자를 직접 입력해 보내는 것과 같고,
//   칩에 없는 답은 입력창에 자유롭게 쓰면 된다.
//
// 새 대화·계정 연결 (1-27): 머리글 [새 대화]로 대화방(session_id)을 나눈다. 로그인한 학생이면 로그인 직후·
// 새로고침 뒤 로그인 복원·새 대화 직후·답변을 받은 뒤 지금 세션을 계정에 연결(claim).
// 이전 대화 (1-28): 로그인하면 왼쪽 사이드바(휴대폰은 ☰ 서랍)에 내 대화 목록 → 고르면 가운데 칸에 읽기 전용
// (입력창 대신 "지난 대화예요" + [지금 대화로 돌아가기]·[새 대화]). 비로그인이면 사이드바 없이 지금 화면 그대로.
// 로그아웃하면 새 대화로 (1-29): 로그아웃 뒤 이어 쓴 말이 방금 로그아웃한 계정의 대화에 쌓이지 않게(공용 PC 대비).
import { useEffect, useRef, useState } from "react";
import { chatErrorMessage, sendChatMessage } from "../../api/chat";
import { claimSession, startNewConversation } from "../../api/chatSession";
import { fetchMySession, historyErrorMessage } from "../../api/chatHistory";
import { clearSessionId, getSessionId } from "../../api/client";
import HistorySidebar from "../../components/history/HistorySidebar";
import type { MySessionDetail, MySessionItem } from "../../types/history";
import type { UserSession } from "../../api/userAuth";
import {
  deletePhoto,
  photoErrorMessage,
  uploadPhoto,
  validatePhotoSize,
  validatePhotoType,
} from "../../api/photo";
import { resizeImage } from "../../lib/resizeImage";
import { rememberMyReport } from "../../api/reports";
import AuthBar from "../../components/AuthBar";
import ChatInput from "../../components/ChatInput";
import type { PhotoStatus } from "../../components/PhotoAttach";
import MessageBubble from "../../components/MessageBubble";
import TypingIndicator from "../../components/TypingIndicator";
import ReportStatusDialog from "../../components/report/ReportStatusDialog";
import SlotsCorner from "../../components/report/SlotsCorner";
import { PHOTO_ONLY_TEXT } from "../../types/chat";
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
  // 본인 신고 조회 창 (1-12)
  const [statusOpen, setStatusOpen] = useState(false);
  // 사진 첨부 (1-10): 서버의 대기 사진(세션당 1장)과 화면의 칩이 같은 상태여야 한다.
  // 접수가 끝나면 칩을 지우고, [취소]·안내만 받기 뒤에는 서버 대기 사진이 남으므로 칩도 남긴다.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null); // 미리보기(object URL)
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>("idle");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoUrlRef = useRef<string | null>(null); // 정리(revoke)용 최신 값
  // 방금 올려서 AI가 아직 보지 않은 사진 — 다음 메시지(글이 없어도)와 함께 보내면 AI가 사진을 보고 답한다.
  // 이미 한 번 보낸 사진은 false (같은 사진을 계속 다시 분석하지 않음)
  const [photoUnseen, setPhotoUnseen] = useState(false);
  const photoFileRef = useRef<File | null>(null); // 채팅 목록에 크게 보여줄 사진 파일
  const [analyzing, setAnalyzing] = useState(false); // 사진을 보낸 메시지의 답을 기다리는 중
  const listRef = useRef<HTMLElement>(null);
  const [loggedIn, setLoggedIn] = useState(false); // 학생 로그인 상태 (AuthBar가 알려줌)
  const [startingNew, setStartingNew] = useState(false); // [새 대화] 처리 중
  // [새 대화] 직후 목록 위에 보여줄 안내 한 줄 (다음 메시지를 보내면 사라짐)
  const [notice, setNotice] = useState<string | null>(null);
  // 이전 대화 사이드바 (1-28)
  const [historyKey, setHistoryKey] = useState(0); // 바뀌면 목록 새로 불러옴
  const [drawerOpen, setDrawerOpen] = useState(false); // 휴대폰 서랍
  // 가운데 칸에 읽기 전용으로 보고 있는 지난 대화 (null = 지금 대화)
  const [viewing, setViewing] = useState<{
    item: MySessionItem;
    detail: MySessionDetail | null;
    error: string | null;
  } | null>(null);
  const refreshHistory = () => setHistoryKey((k) => k + 1);

  // 새 메시지가 생기면 메시지 목록(main)만 맨 아래로 스크롤.
  // scrollIntoView는 쓰지 않는다 — 부모(문서 전체)까지 같이 스크롤시켜서, 메시지가 쌓일수록 화면 전체가
  // 위로 튀었다가 내려오는 버그가 있었다. 목록 칸의 scrollTop만 바꾸면 다른 곳은 움직이지 않는다.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, waiting, choices]);

  // 페이지를 닫을 때 미리보기 주소 정리 (메모리)
  useEffect(
    () => () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    },
    [],
  );

  /** 미리보기를 바꾸거나 지운다 (이전 주소는 정리) */
  const replacePhotoPreview = (next: string | null) => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = next;
    setPhotoUrl(next);
  };

  const handlePhotoSelect = async (file: File) => {
    setPhotoError(null);
    // 서버가 최종 검사하지만, 화면에서 먼저 막아서 사진이 아닌 파일을 올리지 않게 함
    const invalid = validatePhotoType(file);
    if (invalid) {
      setPhotoError(invalid);
      return;
    }
    try {
      // 휴대폰 사진(3~8MB, 아이폰은 HEIC)은 그대로 올리면 서버 규칙에 막히므로 먼저 줄여 JPEG로 바꿈
      setPhotoStatus("preparing");
      const prepared = await resizeImage(file);
      const tooBig = validatePhotoSize(prepared); // 줄인 뒤에도 5MB를 넘는 경우는 거의 없음
      if (tooBig) {
        setPhotoError(tooBig);
        setPhotoStatus("idle");
        return;
      }
      setPhotoStatus("uploading");
      await uploadPhoto(prepared);
      replacePhotoPreview(URL.createObjectURL(prepared));
      photoFileRef.current = prepared;
      setPhotoUnseen(true);
    } catch (err) {
      // 실패하면 칩은 그대로(교체 실패 시 이전 사진이 서버에 남아 있음) + 안내 한 줄. 채팅은 계속 가능
      setPhotoError(photoErrorMessage(err));
    }
    setPhotoStatus("idle");
  };

  const handlePhotoRemove = async () => {
    setPhotoError(null);
    setPhotoStatus("uploading");
    try {
      await deletePhoto();
      replacePhotoPreview(null);
      setPhotoUnseen(false);
    } catch (err) {
      setPhotoError(photoErrorMessage(err)); // 서버에 사진이 남았으니 칩도 그대로 둠
    }
    setPhotoStatus("idle");
  };

  const handleUserChange = (u: UserSession | null) => {
    setLoggedIn(u !== null);
    if (u) {
      // 로그인 직후·새로고침 뒤 복원 — 지금 대화를 내 계정에 연결한 뒤 사이드바 목록 갱신
      void claimSession().then(refreshHistory);
    } else {
      setViewing(null);
      setDrawerOpen(false);
    }
  };

  /** 사이드바에서 대화를 고름 — 지금 대화면 그대로, 지난 대화면 읽기 전용으로 불러옴 */
  const handleSelectHistory = async (item: MySessionItem) => {
    setDrawerOpen(false);
    if (item.session_id === getSessionId()) {
      setViewing(null);
      return;
    }
    setViewing({ item, detail: null, error: null });
    try {
      const detail = await fetchMySession(item.session_id);
      setViewing((v) =>
        v?.item.session_id === item.session_id
          ? { item, detail, error: null }
          : v,
      );
    } catch (err) {
      setViewing((v) =>
        v?.item.session_id === item.session_id
          ? { item, detail: null, error: historyErrorMessage(err) }
          : v,
      );
    }
  };

  /** 화면을 인사말 상태로 비움 (새 대화·로그아웃 공용) */
  const resetScreen = (nextNotice: string | null) => {
    setMessages([WELCOME]);
    setChoices([]);
    setSlots(null);
    replacePhotoPreview(null); // 이전 세션의 대기 사진은 서버가 정리함
    photoFileRef.current = null;
    setPhotoUnseen(false);
    setPhotoError(null);
    setNotice(nextNotice);
    setViewing(null);
    setDrawerOpen(false);
  };

  /** [로그아웃] — 새 세션으로 바꿔 이후 대화가 로그아웃한 계정에 남지 않게 (1-29).
   *  AuthBar가 토큰을 먼저 지우므로 새 세션은 계정에 연결(claim)되지 않음 */
  const handleLogout = async () => {
    setStartingNew(true);
    const done = "로그아웃했어요. 새 대화로 시작해요.";
    try {
      await startNewConversation();
      resetScreen(done);
    } catch {
      // 새 세션을 못 만들었으면 지금 session_id를 잊어서, 다음 메시지 때 새 세션이 만들어지게 함
      clearSessionId();
      resetScreen(done);
    }
    setStartingNew(false);
  };

  /** [새 대화] — 화면을 인사말 상태로 비우고 새 세션으로 바꾼다 (이전 대화는 서버에 그대로) */
  const handleNewConversation = async () => {
    if (waiting || startingNew) return;
    setStartingNew(true);
    try {
      await startNewConversation();
      resetScreen(
        loggedIn ? null : "로그인하지 않으면 이전 대화를 다시 볼 수 없어요.",
      );
      if (loggedIn) refreshHistory();
    } catch (err) {
      setNotice(chatErrorMessage(err)); // 새 세션을 못 만들었으면 지금 대화를 그대로 이어감
    }
    setStartingNew(false);
  };

  const handleSend = async (typed: string) => {
    // 방금 올린 사진이 있으면 이 메시지와 함께 보내 AI가 보게 함 (글이 없으면 사진만)
    const withPhoto = photoUnseen && photoFileRef.current !== null;
    const text = typed || (withPhoto ? PHOTO_ONLY_TEXT : "");
    if (!text) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      // 채팅 목록에 사진을 크게 보여줌 (입력창 칩의 미리보기와 별개 주소 — 칩이 지워져도 남아야 함)
      imageUrl:
        withPhoto && photoFileRef.current
          ? URL.createObjectURL(photoFileRef.current)
          : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setNotice(null);
    setChoices([]);
    setWaiting(true);
    setAnalyzing(withPhoto);
    if (withPhoto) setPhotoUnseen(false);
    // 챗봇 답변 말풍선: 스트리밍 중에는 같은 id의 말풍선 내용을 계속 바꿈
    const replyId = crypto.randomUUID();
    const showReply = (
      content: string,
      extra: Pick<ChatMessage, "sources" | "noSources"> = {},
    ) =>
      setMessages((prev) =>
        prev.some((m) => m.id === replyId)
          ? prev.map((m) =>
              m.id === replyId ? { ...m, content, ...extra } : m,
            )
          : [...prev, { id: replyId, role: "assistant", content, ...extra }],
      );
    try {
      const result = await sendChatMessage(text, {
        onDelta: (t) => showReply(t),
        withPhoto,
      });
      // 행정문의 답변이면 근거 칩 (근거가 비어 있으면 "공식 확인 필요" 안내)
      showReply(
        result.text,
        result.sources === undefined
          ? {}
          : result.sources.length > 0
            ? { sources: result.sources }
            : { noSources: true },
      );
      setChoices(result.choices ?? []);
      setSlots(result.slots ?? null);
      // 첫 메시지에서 세션이 새로 만들어졌을 수 있음 → 로그인 상태면 연결 (이미 연결한 세션이면 호출 안 함)
      // 그 뒤 사이드바 목록 갱신(새 대화가 맨 위에 생기고 메시지 수가 바뀜)
      if (loggedIn) void claimSession().then(refreshHistory);
      // 접수가 완료되면 조회 창의 "이 브라우저에서 접수한 신고" 목록에 추가 (1-12)
      if (result.reportNo !== undefined) {
        rememberMyReport(result.reportNo);
        // 대기 사진은 backend가 이 신고에 붙였으니 칩만 지움 (서버 호출 없음)
        replacePhotoPreview(null);
        setPhotoUnseen(false);
        setPhotoError(null);
      }
    } catch (err) {
      // 실패하면 오류 문구만 표시 (같은 말을 다시 보내면 됨)
      showReply(chatErrorMessage(err));
      // 사진이 AI에게 전달되지 않았을 수 있으니 다시 보낼 수 있게 되돌림
      if (withPhoto) setPhotoUnseen(true);
    }
    setWaiting(false);
    setAnalyzing(false);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      {loggedIn && (
        <HistorySidebar
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          refreshKey={historyKey}
          currentSessionId={getSessionId()}
          selectedId={viewing?.item.session_id ?? null}
          onSelect={(it) => void handleSelectHistory(it)}
          onNewConversation={() => void handleNewConversation()}
          newDisabled={waiting || startingNew}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
            <div className="flex items-center gap-2">
              {loggedIn && (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="이전 대화 열기"
                  className="-ml-1 rounded-lg px-2 py-1 text-lg text-gray-700 hover:bg-gray-100 md:hidden"
                >
                  ☰
                </button>
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900">CampuSpot</h1>
                <p className="text-xs text-gray-500">
                  캠퍼스 불편 신고 · 학교 행정 문의
                </p>
              </div>
            </div>
            {/* 좁은 화면(휴대폰)에선 제목 아래 한 줄을 통째로 써서 "환영합니다 OOO님!"이 잘리지 않게 (1-24) */}
            <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 sm:w-auto">
              <AuthBar
                onUserChange={handleUserChange}
                onLogout={() => void handleLogout()}
                logoutDisabled={waiting || startingNew}
              />
              {(messages.length > 1 || viewing) && (
                <button
                  type="button"
                  onClick={() => void handleNewConversation()}
                  disabled={waiting || startingNew}
                  className={`${loggedIn ? "md:hidden " : ""}shrink-0 rounded-full border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 sm:px-3`}
                >
                  새 대화
                </button>
              )}
              <button
                type="button"
                onClick={() => setStatusOpen(true)}
                className="shrink-0 rounded-full border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 sm:px-3"
              >
                내 신고 조회
              </button>
            </div>
          </div>
        </header>

        {/* relative: 안의 sr-only(절대 위치) 글자가 목록 칸 밖으로 새어 문서 스크롤 범위를 늘리지 않게 가둔다 */}
        <main
          ref={listRef}
          className="relative flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-4">
            {viewing ? (
              <>
                <div
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                  role="status"
                >
                  지난 대화예요. 여기서는 이어서 대화할 수 없어요.
                  {viewing.detail?.truncated && " 오래된 대화는 일부만 보여요."}
                </div>
                {!viewing.detail && !viewing.error && (
                  <p className="text-center text-xs text-gray-400">
                    불러오는 중…
                  </p>
                )}
                {viewing.error && (
                  <p className="text-center text-sm text-red-600" role="alert">
                    {viewing.error}
                  </p>
                )}
                {viewing.detail?.messages.map((m, i) => (
                  <MessageBubble
                    key={`${viewing.item.session_id}-${i}`}
                    // sources가 있으면 근거 칩, 없으면(잡담·신고·학생 말) 배지 없이 글만
                    message={{
                      id: String(i),
                      role: m.role,
                      content: m.content,
                      sources: m.sources,
                    }}
                  />
                ))}
              </>
            ) : (
              <>
                {notice && (
                  <p
                    className="text-center text-xs text-gray-500"
                    role="status"
                  >
                    {notice}
                  </p>
                )}
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
                        className={chipClass}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {/* 답변 말풍선이 아직 안 생겼을 때만 (스트리밍이 시작되면 숨김) */}
                {waiting && messages[messages.length - 1]?.role === "user" && (
                  <TypingIndicator
                    label={analyzing ? "사진을 분석 중이에요…" : undefined}
                  />
                )}
                {!waiting && choices.length > 0 && (
                  <div
                    className="flex flex-wrap gap-2 pl-1"
                    aria-label="추천 답변"
                  >
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
              </>
            )}
          </div>
        </main>

        <SlotsCorner slots={slots} />

        {statusOpen && (
          <ReportStatusDialog onClose={() => setStatusOpen(false)} />
        )}

        <footer className="shrink-0 border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-2xl px-4 py-3">
            {viewing ? (
              <div className="flex flex-wrap items-center justify-center gap-2 py-1">
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  지금 대화로 돌아가기
                </button>
                <button
                  type="button"
                  onClick={() => void handleNewConversation()}
                  disabled={waiting || startingNew}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  새 대화
                </button>
              </div>
            ) : (
              <>
                <ChatInput
                  onSend={(t) => handleSend(t)}
                  disabled={waiting}
                  photoPreviewUrl={photoUrl}
                  photoStatus={photoStatus}
                  photoError={photoError}
                  onPhotoSelect={(f) => void handlePhotoSelect(f)}
                  onPhotoRemove={() => void handlePhotoRemove()}
                  canSendEmpty={photoUnseen && photoUrl !== null}
                />
                {!loggedIn && (
                  <p className="mt-1 px-1 text-xs text-gray-400">
                    로그인은 선택이에요. 로그인하면 대화가 내 계정에 저장돼요.
                  </p>
                )}
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default ChatPage;
