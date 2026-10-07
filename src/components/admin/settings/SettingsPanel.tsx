// 설정 탭 — 학교마다 다른 값(카테고리·건물·우선순위 기준·SLA·탐지 기준·조건-액션 규칙 1-21)을 화면에서 바꾼다 (작업 1-17, 명세 4-2·5-1).
// "다른 학교에 적용하려면 코드가 아니라 이 설정만 바꾸면 된다"는 것을 보여 주는 화면.
// 구역(6개)을 나눠 한 번에 하나씩 보여 주되, 구역을 오가도 고치던 내용이 사라지지 않게 전부 그려 두고 숨기기만 한다.
import { useState } from "react";
import BuildingsEditor from "./BuildingsEditor";
import CategoriesEditor from "./CategoriesEditor";
import DetectionEditor from "./DetectionEditor";
import PriorityMatrixEditor from "./PriorityMatrixEditor";
import RulesEditor from "./RulesEditor";
import SlaEditor from "./SlaEditor";

type SectionKey =
  | "categories"
  | "buildings"
  | "priority"
  | "sla"
  | "detection"
  | "rules";

const SECTIONS: { value: SectionKey; label: string }[] = [
  { value: "categories", label: "카테고리" },
  { value: "buildings", label: "건물" },
  { value: "priority", label: "우선순위" },
  { value: "sla", label: "SLA" },
  { value: "detection", label: "탐지 기준" },
  { value: "rules", label: "규칙" },
];

interface Props {
  token: string;
  /** 페이지의 새로고침 버튼이 올리는 값 — 바뀌면 현재 구역을 다시 불러옴 */
  reloadKey: number;
  onUnauthorized: () => void;
}

export default function SettingsPanel({
  token,
  reloadKey,
  onUnauthorized,
}: Props) {
  const [section, setSection] = useState<SectionKey>("categories");
  const common = { token, reloadKey, onUnauthorized };

  return (
    <div>
      <div
        role="group"
        aria-label="설정 구역"
        className="mb-3 flex flex-wrap gap-2"
      >
        {SECTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            aria-pressed={section === s.value}
            onClick={() => setSection(s.value)}
            className={`rounded-full border px-3 py-1 text-sm ${
              section === s.value
                ? "border-blue-600 bg-blue-50 font-medium text-blue-700"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {SECTIONS.map((s) => (
        <div key={s.value} hidden={section !== s.value}>
          {s.value === "categories" && <CategoriesEditor {...common} />}
          {s.value === "buildings" && <BuildingsEditor {...common} />}
          {s.value === "priority" && <PriorityMatrixEditor {...common} />}
          {s.value === "sla" && <SlaEditor {...common} />}
          {s.value === "detection" && <DetectionEditor {...common} />}
          {s.value === "rules" && <RulesEditor {...common} />}
        </div>
      ))}
    </div>
  );
}
