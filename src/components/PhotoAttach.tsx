// 사진 첨부 UI (작업 1-10): 입력창 옆 📎 버튼 + 선택한 사진 칩(썸네일·삭제).
// 상태와 서버 호출은 챗봇 페이지(pages/chat/index.tsx)가 갖고, 여기는 보여주기만 한다.
import { useRef } from "react";
import type { ChangeEvent } from "react";

interface ButtonProps {
  onSelect: (file: File) => void;
  disabled: boolean;
}

/** 📎 버튼 + 숨은 파일 입력. 휴대폰에서는 카메라·앨범 선택이 그대로 열린다(capture 속성 없음). */
export function PhotoButton({ onSelect, disabled }: ButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 같은 파일을 다시 골라도 change 이벤트가 나도록 선택 값을 비움
    e.target.value = "";
    if (file) onSelect(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        hidden
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label="사진 첨부"
        title="사진 첨부 (jpg·png, 5MB 이하)"
        className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-2 text-base hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
      >
        📎
      </button>
    </>
  );
}

interface ChipProps {
  previewUrl: string | null;
  uploading: boolean;
  disabled: boolean;
  onRemove: () => void;
}

/** 올려 둔 사진 칩. 사진이 없고 올리는 중도 아니면 아무것도 그리지 않는다. */
export function PhotoChip({
  previewUrl,
  uploading,
  disabled,
  onRemove,
}: ChipProps) {
  if (uploading) {
    return (
      <p className="mb-2 px-1 text-sm text-gray-500" role="status">
        사진 올리는 중…
      </p>
    );
  }
  if (!previewUrl) return null;
  return (
    <div className="mb-2 flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 py-1 pl-1 pr-3 text-sm text-blue-700">
      <img
        src={previewUrl}
        alt="첨부한 사진 미리보기"
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
      <span className="min-w-0 flex-1 truncate">사진 1장 첨부됨</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="shrink-0 font-medium text-blue-700 underline hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        삭제
      </button>
    </div>
  );
}
