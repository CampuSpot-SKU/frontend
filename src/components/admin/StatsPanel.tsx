// 통계 탭 — 기간(최근 7일·30일·전체)을 고르면 신고 건수·평균 처리시간·SLA 준수율을 보여준다 (작업 1-16 화면, 명세 4-2).
// 맨 위 숫자 4개(전체·해결·평균 처리시간·SLA 준수율) → 상태별 건수 → 카테고리별 막대 → 우선순위별 표.
// 막대는 값이 클수록 길고(색은 파랑 한 가지), 값은 막대 끝에 글자로 적는다. 표 형태라 숫자는 전부 글자로도 읽힌다.
// 조회만 하는 화면이라 운영 데이터를 바꾸지 않는다.
import { useEffect, useState } from "react";
import { fetchStats, STATS_PERIODS } from "../../api/adminStats";
import { ApiError } from "../../api/client";
import type { AdminStats, StatsGroup } from "../../types/stats";
import { formatDateTime } from "./format";
import { barWidthPct, formatHours, formatPct } from "./statsFormat";

interface Props {
  token: string;
  /** 페이지의 새로고침 버튼이 올리는 값 — 바뀌면 다시 불러옴 */
  reloadKey: number;
  onUnauthorized: () => void;
}

function loadErrorText(err: unknown): string {
  if (err instanceof ApiError && (err.status === 404 || err.status === 503))
    return "이 기능은 아직 준비 중이에요.";
  return "통계를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

/** 숫자 한 칸 — 라벨(위) · 값(크게) · 보조 설명(아래) */
function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
    </div>
  );
}

/** SLA 준수율 칸 — 퍼센트 글자 + 가는 막대(트랙은 같은 파랑의 연한 색) + 준수·위반 건수 */
function SlaCell({ group }: { group: StatsGroup }) {
  const { met, breached, compliance_pct } = group.sla;
  return (
    <div
      title={`마감 안에 해결 ${met}건 · 마감 넘김 ${breached}건`}
      className="flex flex-col gap-1"
    >
      <span className="tabular-nums text-gray-900">
        {formatPct(compliance_pct)}
      </span>
      <span className="h-1.5 w-20 rounded-full bg-blue-100">
        <span
          className="block h-1.5 rounded-full bg-blue-600"
          style={{ width: `${compliance_pct ?? 0}%` }}
        />
      </span>
      <span className="text-xs text-gray-500">
        준수 {met} · 넘김 {breached}
      </span>
    </div>
  );
}

export default function StatsPanel({
  token,
  reloadKey,
  onUnauthorized,
}: Props) {
  const [days, setDays] = useState<number | null>(30);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setStats(null);
    fetchStats(token, days)
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(loadErrorText(err));
      });
    return () => {
      cancelled = true;
    };
  }, [token, days, reloadKey, onUnauthorized]);

  const maxCategory = stats
    ? Math.max(0, ...stats.by_category.map((c) => c.count))
    : 0;

  return (
    <section aria-label="통계">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="기간" className="flex gap-2">
          {STATS_PERIODS.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={days === p.days}
              onClick={() => setDays(p.days)}
              className={`rounded-full border px-3 py-1 text-sm ${
                days === p.days
                  ? "border-blue-600 bg-blue-50 font-medium text-blue-700"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {stats && (
          <span className="text-xs text-gray-500">
            접수 시각 기준 · {formatDateTime(stats.period.until)} 현재
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && stats === null && (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      )}

      {stats && stats.total.count === 0 && (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          이 기간에 접수된 신고가 없어요.
        </p>
      )}

      {stats && stats.total.count > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="접수된 신고" value={`${stats.total.count}건`} />
            <StatTile
              label="해결·종료"
              value={`${stats.total.resolved_count}건`}
            />
            <StatTile
              label="평균 처리시간"
              value={formatHours(stats.total.avg_resolution_hours)}
              note="접수부터 해결까지"
            />
            <StatTile
              label="SLA 준수율"
              value={formatPct(stats.total.sla.compliance_pct)}
              note={`준수 ${stats.total.sla.met} · 넘김 ${stats.total.sla.breached}`}
            />
          </div>

          <div
            role="group"
            aria-label="상태별 건수"
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <h2 className="text-base font-semibold text-gray-900">
              상태별 건수
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {stats.by_status.map((s) => (
                <li key={s.status} className="text-sm">
                  <span className="text-gray-600">{s.status}</span>{" "}
                  <span className="ml-1 font-semibold tabular-nums text-gray-900">
                    {s.count}건
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">
              카테고리별 신고
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              막대는 신고 건수예요. 꺼 둔 카테고리도 기간 안에 신고가 있으면
              보여요.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500">
                    <th className="w-36 py-1 pr-2">카테고리</th>
                    <th className="py-1 pr-2">신고 건수</th>
                    <th className="w-28 py-1 pr-2">평균 처리시간</th>
                    <th className="w-32 py-1">SLA 준수율</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_category.map((c) => (
                    <tr
                      key={c.category.id}
                      className="border-t border-gray-100"
                    >
                      <th
                        scope="row"
                        className="py-2 pr-2 text-left font-normal text-gray-900"
                      >
                        {c.category.name}
                        {!c.is_active && (
                          <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                            꺼짐
                          </span>
                        )}
                      </th>
                      <td className="py-2 pr-2">
                        <div
                          title={`${c.category.name}: ${c.count}건 (해결·종료 ${c.resolved_count}건)`}
                          className="flex items-center gap-2"
                        >
                          <span className="flex h-5 flex-1 items-center">
                            <span
                              className="block h-5 rounded-r bg-blue-600"
                              style={{
                                width: `${barWidthPct(c.count, maxCategory)}%`,
                              }}
                            />
                          </span>
                          <span className="w-12 text-right tabular-nums text-gray-900">
                            {c.count}건
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-2 tabular-nums text-gray-900">
                        {formatHours(c.avg_resolution_hours)}
                      </td>
                      <td className="py-2">
                        <SlaCell group={c} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-base font-semibold text-gray-900">
              우선순위별 신고
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500">
                    <th className="w-24 py-1 pr-2">우선순위</th>
                    <th className="w-24 py-1 pr-2">신고 건수</th>
                    <th className="w-32 py-1 pr-2">평균 처리시간</th>
                    <th className="py-1">SLA 준수율</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_priority.map((p) => (
                    <tr key={p.priority} className="border-t border-gray-100">
                      <th
                        scope="row"
                        className="py-2 pr-2 text-left font-semibold text-gray-900"
                      >
                        {p.priority}
                      </th>
                      <td className="py-2 pr-2 tabular-nums text-gray-900">
                        {p.count}건
                      </td>
                      <td className="py-2 pr-2 tabular-nums text-gray-900">
                        {formatHours(p.avg_resolution_hours)}
                      </td>
                      <td className="py-2">
                        <SlaCell group={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            SLA 준수율 = 마감 안에 해결한 건 ÷ (마감 안에 해결 + 마감을 넘긴 건)
            × 100. 해결하지 못한 채 마감이 지난 신고도 &lsquo;넘김&rsquo;에
            들어가요. 아직 마감 전인 처리 중 신고는 계산에서 빠져요. 평균
            처리시간은 해결·종료된 신고만, 마지막으로 &lsquo;해결&rsquo;이 된
            시각 기준이에요.
          </p>
        </div>
      )}
    </section>
  );
}
