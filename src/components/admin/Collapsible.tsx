// 접었다 펴는 구역 — 펼칠 때만 안쪽을 그려서 데이터도 그때 불러온다.
import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  /** 제목 오른쪽에 붙는 짧은 값 (건수 등) */
  meta?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function Collapsible({ title, meta, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-gray-100"
      >
        <span>
          {title}
          {meta && <span className="ml-1.5 font-normal text-gray-500">{meta}</span>}
        </span>
        <span aria-hidden="true" className="text-xs font-normal text-gray-400">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && <div className="mt-2 text-sm">{children}</div>}
    </section>
  );
}
