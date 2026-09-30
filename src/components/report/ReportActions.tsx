import type { ReportPhase } from "../../types/chat";
import ToiletChips from "./ToiletChips";
import type { ToiletGender } from "./ToiletChips";

interface Props {
  phase: ReportPhase;
  disabled: boolean;
  /** [접수]를 눌러도 되는지 (상황과, 건물 또는 세부장소가 있어야 함) */
  canConfirm: boolean;
  onSwitchToInquiry: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  /** 되묻기 선택지 (은주관: ["은주1관","은주2관","잘 모르겠어요"]) — 누르면 그 글자를 일반 메시지로 보냄 */
  choices?: string[];
  onChoice: (text: string) => void;
  /** 요약 카드의 화장실 [남][여][모름] 칩 — 세부장소가 화장실일 때만 보임 */
  showToilet: boolean;
  toilet: ToiletGender;
  onToiletChange: (g: ToiletGender) => void;
}

const base =
  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/**
 * 챗봇 마지막 말풍선 아래에 붙는 신고 흐름 버튼 (작업 1-5b, 명세 4-1).
 * - 위치·상황을 묻는 중: [안내만 받을래요] — 신고가 아니라 안내만 원할 때 문의로 전환
 * - 요약 확인 중: [접수] [수정] [취소] — [접수]를 눌러야만 실제로 접수됨
 */
function ReportActions({
  phase,
  disabled,
  canConfirm,
  onSwitchToInquiry,
  onConfirm,
  onEdit,
  onCancel,
  choices,
  onChoice,
  showToilet,
  toilet,
  onToiletChange,
}: Props) {
  if (phase === "collecting") {
    return (
      <div className="flex flex-wrap gap-2 pl-1">
        {choices?.map((c) => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => onChoice(c)}
            className={`${base} border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}
          >
            {c}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={onSwitchToInquiry}
          className={`${base} border border-gray-300 bg-white text-gray-700 hover:bg-gray-100`}
        >
          안내만 받을래요
        </button>
      </div>
    );
  }
  if (phase === "confirming") {
    return (
      <div className="flex flex-col gap-2 pl-1">
        {showToilet && (
          <ToiletChips
            value={toilet}
            onChange={onToiletChange}
            disabled={disabled}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || !canConfirm}
            onClick={onConfirm}
            className={`${base} bg-blue-600 text-white hover:bg-blue-700`}
          >
            접수
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onEdit}
            className={`${base} border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}
          >
            수정
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onCancel}
            className={`${base} border border-gray-300 bg-white text-gray-700 hover:bg-gray-100`}
          >
            취소
          </button>
        </div>
      </div>
    );
  }
  return null;
}

export default ReportActions;
