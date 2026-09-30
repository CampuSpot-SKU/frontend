// 접수 폼 위치 선택 목록 — GET /locations (명세 5-1, 작업 1-5b).
// 목록은 거의 바뀌지 않으므로 페이지를 연 동안 한 번만 받아서 재사용한다.
// 실패하면 null → 화면은 선택 목록 대신 글자 입력칸을 보여준다 (접수는 막지 않음).
import { apiFetch } from "./client";
import type { LocationOptions } from "../types/chat";

let cached: Promise<LocationOptions | null> | null = null;

export function fetchLocations(): Promise<LocationOptions | null> {
  if (!cached) {
    cached = apiFetch<LocationOptions>("/locations").catch(() => {
      cached = null; // 다음에 다시 시도할 수 있게
      return null;
    });
  }
  return cached;
}
