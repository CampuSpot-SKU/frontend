import type { ReportDraft } from "../../types/chat";
import ReportDraftForm from "./ReportDraftForm";

interface Props {
  draft: ReportDraft;
  editing: boolean;
  disabled: boolean;
  canConfirm: boolean;
  onChange: (field: keyof ReportDraft, value: string) => void;
  onConfirm: () => void;
}

interface MobileProps extends Props {
  open: boolean;
  onToggle: () => void;
}

/** 폼 아래 안내 + (수정 중일 때) [이 내용으로 접수] 버튼 — 넓은/좁은 화면 공통 */
function PanelFooter({ editing, disabled, canConfirm, onConfirm }: Props) {
  if (!editing) {
    return (
      <p className="text-xs leading-relaxed text-gray-500">
        대화하면서 알려주신 내용이 여기에 채워져요. 분류와 우선순위는 AI가
        판단해요.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled || !canConfirm}
        onClick={onConfirm}
        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        이 내용으로 접수
      </button>
      {!canConfirm && (
        <p className="text-xs text-red-600">
          상황과, 건물 또는 세부장소를 적어주세요.
        </p>
      )}
    </div>
  );
}

/** 넓은 화면(md 이상): 채팅 오른쪽 고정 패널 (작업 1-5b, 명세 4-1) */
export function ReportPanelDesktop(props: Props) {
  return (
    <aside
      aria-label="접수 내용"
      className="hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-gray-200 bg-white p-4 md:flex"
    >
      <h2 className="text-base font-bold text-gray-900">접수 내용</h2>
      <ReportDraftForm
        draft={props.draft}
        editing={props.editing}
        onChange={props.onChange}
        idPrefix="panel"
      />
      <PanelFooter {...props} />
    </aside>
  );
}

/** 좁은 화면(모바일): 채팅 위 "접수 내용 보기" 접이식 카드 */
export function ReportPanelMobile(props: MobileProps) {
  const { draft, open, onToggle } = props;
  const place = [
    draft.building,
    draft.floor && `${draft.floor}층`,
    draft.detail,
  ]
    .filter(Boolean)
    .join(" ");
  const oneLine = [place, draft.description].filter(Boolean).join(" · ");
  return (
    <section
      aria-label="접수 내용"
      className="shrink-0 border-b border-gray-200 bg-white md:hidden"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-gray-900">
            접수 내용 {open ? "접기" : "보기"}
          </span>
          {!open && (
            <span className="block truncate text-xs text-gray-500">
              {oneLine || "아직 채워진 내용이 없어요"}
            </span>
          )}
        </span>
        <span aria-hidden className="text-gray-400">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="flex max-h-[50dvh] flex-col gap-3 overflow-y-auto px-4 pb-3">
          <ReportDraftForm
            draft={draft}
            editing={props.editing}
            onChange={props.onChange}
            idPrefix="card"
          />
          <PanelFooter {...props} />
        </div>
      )}
    </section>
  );
}
