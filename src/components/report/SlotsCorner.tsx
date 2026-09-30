import { useState } from "react";
import type { SlotsFilled } from "../../types/chat";

interface Props {
  /** 챗봇이 지금까지 알아낸 신고 내용. 신고 중이 아니면 null (이때는 아무것도 안 그림) */
  slots: SlotsFilled | null;
}

/**
 * 화면 구석에 작게 붙는 "챗봇이 이해한 접수 내용" 보기 (명세 4-1 대화형 개편).
 * 채팅은 대화로만 진행하고, 원하면 이 칸을 열어서 위치·상황이 실제로 어떻게 입력됐는지 실시간으로 확인.
 * 위치·모양은 임시 — 디자인 담당이 자리를 옮기거나 다듬어도 됨 (props는 slots 하나뿐).
 */
function SlotsCorner({ slots }: Props) {
  const [open, setOpen] = useState(false);
  if (!slots) return null;

  const rows: [string, string | null | undefined][] = [
    ["건물", slots.building],
    ["층", slots.floor],
    ["세부장소", slots.detail],
    ["위치(표시)", slots.location],
    ["분류", slots.category],
    ["상황", slots.description],
  ];

  return (
    <div className="fixed bottom-20 right-3 z-20 w-56 text-xs sm:bottom-24">
      {open && (
        <div className="mb-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="mb-2 font-semibold text-gray-700">챗봇이 이해한 내용</p>
          <dl className="space-y-1">
            {rows.map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="w-16 shrink-0 text-gray-500">{label}</dt>
                <dd className="min-w-0 break-words text-gray-900">
                  {value || <span className="text-gray-400">아직 모름</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-auto block rounded-full border border-gray-300 bg-white px-3 py-1.5 text-gray-700 shadow hover:bg-gray-100"
      >
        {open ? "접수 내용 닫기" : "접수 내용 보기"}
      </button>
    </div>
  );
}

export default SlotsCorner;
