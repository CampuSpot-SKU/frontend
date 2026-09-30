import { useState } from "react";
import type { ReactNode } from "react";
import type {
  LocationBuilding,
  LocationCustomItem,
  LocationFloor,
  LocationOptions,
  LocationPlace,
  ReportDraft,
} from "../../types/chat";

interface Props {
  draft: ReportDraft;
  onChange: (field: keyof ReportDraft, value: string) => void;
  locations: LocationOptions;
  /** 같은 폼이 패널·카드에 하나씩 있어서 label-input 연결 id를 구분 */
  idPrefix: string;
}

/** 건물 DB에 없는 묶음 — 고르면 건물·층은 비우고 세부장소만 보냄 (명세 5-1 /locations) */
const OUTDOOR = "실외·기타";
const CUSTOM = "__custom__";
const UNSET = "";

const isBuilding = (
  b: LocationBuilding | LocationCustomItem,
): b is LocationBuilding => !b.custom;
const isFloor = (f: LocationFloor | LocationCustomItem): f is LocationFloor =>
  !f.custom;
const isPlace = (p: LocationPlace | LocationCustomItem): p is LocationPlace =>
  !p.custom;

type BuildingMode = "list" | "outdoor" | "custom";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

/**
 * 접수 폼 위치 선택 (작업 1-5b, 명세 4-1 위치 처리 규칙).
 * 건물 → 층 → 세부장소를 목록에서 고르고, 단계마다 "목록에 없음 (직접 입력)"을 고르면 글자로 입력.
 * 목록에 없다고 접수를 막지 않음 — 대화로 채워진 값이 목록에 없으면 처음부터 직접 입력 칸에 보여줌.
 * 폼 값(draft)은 글자 그대로 backend로 가고, backend가 건물 이름으로 건물을 찾음.
 */
function LocationPicker({ draft, onChange, locations, idPrefix }: Props) {
  const buildings = locations.buildings.filter(isBuilding);
  const listBuildings = buildings.filter((b) => b.name !== OUTDOOR);
  const outdoor = buildings.find((b) => b.name === OUTDOOR);
  const outdoorPlaces = (outdoor?.floors.filter(isFloor) ?? []).flatMap((f) =>
    f.places.filter(isPlace),
  );

  // 처음 [수정]을 눌렀을 때 대화로 채워진 값이 목록 어디에 해당하는지로 시작 상태를 정함
  const [mode, setMode] = useState<BuildingMode>(() => {
    if (listBuildings.some((b) => b.name === draft.building)) return "list";
    if (draft.building) return "custom";
    if (draft.detail && outdoorPlaces.some((p) => p.label === draft.detail))
      return "outdoor";
    return "list";
  });
  const building = listBuildings.find((b) => b.name === draft.building);
  const floors = building?.floors.filter(isFloor) ?? [];
  // 층 구분 없는 묶음(floor=null)이 있어 층 값 대신 label로 어떤 묶음을 골랐는지 기억
  const [floorLabel, setFloorLabel] = useState<string | null>(
    () =>
      floors.find((f) => (f.floor ?? "") === draft.floor && draft.floor)
        ?.label ?? null,
  );
  const [floorCustom, setFloorCustom] = useState(
    () => mode === "list" && !!draft.floor && floorLabel === null,
  );
  const floor = floors.find((f) => f.label === floorLabel);
  const places =
    mode === "outdoor" ? outdoorPlaces : (floor?.places.filter(isPlace) ?? []);
  const [detailCustom, setDetailCustom] = useState(
    () => !!draft.detail && !places.some((p) => p.label === draft.detail),
  );

  // 건물을 바꿔도 이미 채워진 층·세부장소는 버리지 않음: 새 건물 목록에 있으면 선택, 없으면 직접 입력 칸에 남김
  const selectBuilding = (value: string) => {
    if (value === CUSTOM || value === OUTDOOR) {
      setMode(value === CUSTOM ? "custom" : "outdoor");
      setFloorLabel(null);
      setFloorCustom(false);
      onChange("building", "");
      if (value === OUTDOOR) onChange("floor", "");
      setDetailCustom(
        value === OUTDOOR &&
          !!draft.detail &&
          !outdoorPlaces.some((p) => p.label === draft.detail),
      );
      return;
    }
    setMode("list");
    onChange("building", value);
    const nextFloors =
      listBuildings.find((b) => b.name === value)?.floors.filter(isFloor) ?? [];
    const nextFloor = draft.floor
      ? nextFloors.find((f) => f.floor === draft.floor)
      : undefined;
    setFloorLabel(nextFloor?.label ?? null);
    setFloorCustom(!!draft.floor && !nextFloor);
    setDetailCustom(
      !!draft.detail &&
        !(nextFloor?.places ?? []).some(
          (p) => isPlace(p) && p.label === draft.detail,
        ),
    );
  };

  const selectFloor = (value: string) => {
    if (value === CUSTOM) {
      setFloorLabel(null);
      setFloorCustom(true);
      onChange("floor", "");
      setDetailCustom(!!draft.detail);
      return;
    }
    const next = floors.find((f) => f.label === value);
    setFloorCustom(false);
    setFloorLabel(next?.label ?? null);
    onChange("floor", next?.floor ?? "");
    setDetailCustom(
      !!draft.detail &&
        !(next?.places ?? []).some(
          (p) => isPlace(p) && p.label === draft.detail,
        ),
    );
  };

  const selectDetail = (value: string) => {
    setDetailCustom(value === CUSTOM);
    onChange("detail", value === CUSTOM ? "" : value);
  };

  const buildingValue =
    mode === "custom" ? CUSTOM : mode === "outdoor" ? OUTDOOR : draft.building;
  const showFloorSelect = mode === "list" && !!building;
  // 건물을 아직 안 골랐는데 대화로 층·세부장소가 채워져 있으면(예: "3층 강의실") 글자로 보여줌
  const noBuilding = mode === "list" && !building;
  const showFloorInput =
    mode === "custom" || floorCustom || (noBuilding && !!draft.floor);
  // 세부장소: 고를 목록이 있으면 선택, 직접 입력이거나 목록이 없으면 글자 입력
  const showDetailSelect = mode === "outdoor" || (mode === "list" && !!floor);
  const showDetailInput =
    detailCustom ||
    mode === "custom" ||
    (mode === "list" && floorCustom) ||
    (noBuilding && !!draft.detail);
  // 직접 입력한 층이면 그 층의 목록이 없으니 세부장소도 글자로 받음

  return (
    <>
      <Field label="건물" id={`${idPrefix}-building`}>
        <select
          id={`${idPrefix}-building`}
          data-report-first
          value={buildingValue}
          onChange={(e) => selectBuilding(e.target.value)}
          className={inputClass}
        >
          <option value={UNSET}>건물 선택</option>
          {listBuildings.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
          {outdoor && <option value={OUTDOOR}>{OUTDOOR}</option>}
          <option value={CUSTOM}>목록에 없음 (직접 입력)</option>
        </select>
        {mode === "custom" && (
          <input
            type="text"
            aria-label="건물 직접 입력"
            value={draft.building}
            maxLength={50}
            placeholder="건물 이름"
            onChange={(e) => onChange("building", e.target.value)}
            className={`${inputClass} mt-2`}
          />
        )}
      </Field>

      {(showFloorSelect || showFloorInput) && (
        <Field label="층" id={`${idPrefix}-floor`}>
          {showFloorSelect && (
            <select
              id={`${idPrefix}-floor`}
              value={floorCustom ? CUSTOM : (floorLabel ?? UNSET)}
              onChange={(e) => selectFloor(e.target.value)}
              className={inputClass}
            >
              <option value={UNSET}>층 선택</option>
              {floors.map((f) => (
                <option key={f.label} value={f.label}>
                  {f.label}
                </option>
              ))}
              <option value={CUSTOM}>목록에 없음 (직접 입력)</option>
            </select>
          )}
          {showFloorInput && (
            <input
              type="text"
              id={showFloorSelect ? undefined : `${idPrefix}-floor`}
              aria-label={showFloorSelect ? "층 직접 입력" : undefined}
              value={draft.floor}
              maxLength={20}
              placeholder="예: 2, B1"
              onChange={(e) => onChange("floor", e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
      )}

      {(showDetailSelect || showDetailInput) && (
        <Field label="세부장소" id={`${idPrefix}-detail`}>
          {showDetailSelect && (
            <select
              id={`${idPrefix}-detail`}
              value={detailCustom ? CUSTOM : draft.detail}
              onChange={(e) => selectDetail(e.target.value)}
              className={inputClass}
            >
              <option value={UNSET}>세부장소 선택</option>
              {places.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
              <option value={CUSTOM}>목록에 없음 (직접 입력)</option>
            </select>
          )}
          {showDetailInput && (
            <input
              type="text"
              id={showDetailSelect ? undefined : `${idPrefix}-detail`}
              aria-label={showDetailSelect ? "세부장소 직접 입력" : undefined}
              value={draft.detail}
              maxLength={100}
              placeholder="예: 남자화장실, 301호"
              onChange={(e) => onChange("detail", e.target.value)}
              className={`${inputClass} ${showDetailSelect ? "mt-2" : ""}`}
            />
          )}
        </Field>
      )}
    </>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export default LocationPicker;
