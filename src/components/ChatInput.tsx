import { useState } from "react";
import type { FormEvent } from "react";
import { PhotoButton, PhotoChip } from "./PhotoAttach";
import type { PhotoStatus } from "./PhotoAttach";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  // 사진 첨부 (1-10) — 상태는 챗봇 페이지가 갖고 여기는 보여주기만 함
  photoPreviewUrl: string | null;
  photoStatus: PhotoStatus;
  photoError: string | null;
  onPhotoSelect: (file: File) => void;
  onPhotoRemove: () => void;
}

/** 하단 입력창 + 📎 사진 첨부 + 전송 버튼. Enter로도 전송됨. */
function ChatInput({
  onSend,
  disabled,
  photoPreviewUrl,
  photoStatus,
  photoError,
  onPhotoSelect,
  onPhotoRemove,
}: Props) {
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
      <PhotoChip
        previewUrl={photoPreviewUrl}
        status={photoStatus}
        disabled={photoStatus !== "idle"}
        onRemove={onPhotoRemove}
      />
      {photoError && (
        <p className="mb-2 px-1 text-sm text-red-600" role="alert">
          {photoError}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <PhotoButton
          onSelect={onPhotoSelect}
          disabled={photoStatus !== "idle"}
        />
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
        이름·학번·연락처 등 개인정보는 입력하지 마세요. 사진에는 사람
        얼굴·이름표·학생증이 나오지 않게 해 주세요.
      </p>
    </div>
  );
}

export default ChatInput;
