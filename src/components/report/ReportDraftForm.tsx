import type { ChangeEvent } from "react";
import type { LocationOptions, ReportDraft } from "../../types/chat";
import LocationPicker from "./LocationPicker";
import ToiletChips, { needsToiletChoice } from "./ToiletChips";
import type { ToiletGender } from "./ToiletChips";

interface Props {
  draft: ReportDraft;
  /** [수정]을 눌렀을 때만 true — 그 전에는 대화로 채워진 값을 보여주기만 함 */
  editing: boolean;
  onChange: (field: keyof ReportDraft, value: string) => void;
  /** 위치 선택 목록 (GET /locations). 아직 안 왔거나 실패하면 null → 글자 입력칸 */
  locations: LocationOptions | null;
  toilet: ToiletGender;
  onToiletChange: (g: ToiletGender) => void;
  /** 같은 폼이 넓은 화면(패널)·좁은 화면(카드)에 하나씩 있어서 label-input 연결 id를 구분 */
  idPrefix: string;
}

const FIELDS: {
  key: keyof ReportDraft;
  label: string;
  placeholder: string;
  multiline?: boolean;
}[] = [
  { key: "building", label: "건물", placeholder: "예: 혜인관, 도서관" },
  { key: "floor", label: "층", placeholder: "예: 2, B1" },
  { key: "detail", label: "세부장소", placeholder: "예: 남자화장실, 301호" },
  {
    key: "description",
    label: "상황",
    placeholder: "예: 세면대 물이 계속 새요",
    multiline: true,
  },
];

/**
 * 접수 폼 (작업 1-5b, 명세 4-1 신고 흐름 개편).
 * 대화에서 알아낸 건물·층·세부장소·상황이 실시간으로 채워지고, [수정]을 누르면 직접 고칠 수 있다.
 * 고칠 때 위치는 건물 → 층 → 세부장소 선택 목록(LocationPicker), 목록이 없으면 글자 입력.
 * 분류·우선순위는 AI가 판정하므로 폼에 없음.
 */
function ReportDraftForm({
  draft,
  editing,
  onChange,
  locations,
  toilet,
  onToiletChange,
  idPrefix,
}: Props) {
  const usePicker = editing && locations !== null;
  const fields = usePicker
    ? FIELDS.filter((f) => f.key === "description")
    : FIELDS;
  return (
    <div className="flex flex-col gap-3">
      {usePicker && (
        <LocationPicker
          draft={draft}
          onChange={onChange}
          locations={locations}
          idPrefix={idPrefix}
        />
      )}
      {fields.map((f, i) => {
        const id = `${idPrefix}-${f.key}`;
        const common = {
          id,
          value: draft[f.key],
          readOnly: !editing,
          placeholder: editing ? f.placeholder : "대화에서 알려주시면 채워져요",
          maxLength: f.multiline ? 500 : 50,
          onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            onChange(f.key, e.target.value),
          // [수정]을 누르면 화면에 보이는 폼의 첫 칸으로 커서를 옮기는 데 씀 (ChatPage)
          ...(i === 0 && !usePicker ? { "data-report-first": true } : {}),
          className: `w-full rounded-lg border px-3 py-2 text-sm outline-none ${
            editing
              ? "border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              : "border-transparent bg-gray-100 text-gray-800"
          }`,
        };
        return (
          <div key={f.key} className="flex flex-col gap-1">
            <label htmlFor={id} className="text-xs font-medium text-gray-500">
              {f.label}
            </label>
            {f.multiline ? (
              <textarea
                {...common}
                rows={3}
                className={`${common.className} resize-none`}
              />
            ) : (
              <input type="text" {...common} />
            )}
          </div>
        );
      })}
      {needsToiletChoice(draft.detail) && (
        <ToiletChips value={toilet} onChange={onToiletChange} />
      )}
    </div>
  );
}

export default ReportDraftForm;
