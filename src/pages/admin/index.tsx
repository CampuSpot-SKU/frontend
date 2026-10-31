// 관리자 대시보드 페이지.
// 로그인 전 → 로그인 폼 / 로그인 후 → 탭 6개(접수 목록·반복 신고·예방 점검·통계·문의 로그·설정).
// 접수 목록: 숫자 띠 + 상태 칩·검색·필터 + 표(같은 건은 묶어서) / 신고 상세 패널은 어느 탭에서든 열린다.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearAdminToken,
  fetchReports,
  fetchReportSummary,
  getAdminToken,
  REPORT_LIMIT,
} from "../../api/admin";
import { fetchProblemClusters } from "../../api/adminDetection";
import { ApiError } from "../../api/client";
import AdminTabs, { type AdminTab } from "../../components/admin/AdminTabs";
import ChatLogsPanel from "../../components/admin/ChatLogsPanel";
import { formatClock } from "../../components/admin/format";
import { buildRows, flattenIds, matchesSearch } from "../../components/admin/groupReports";
import LoginForm from "../../components/admin/LoginForm";
import PredictionPanel from "../../components/admin/PredictionPanel";
import RepeatReportPanel from "../../components/admin/RepeatReportPanel";
import ReportDetailPanel from "../../components/admin/ReportDetailPanel";
import ReportFilterBar, { DEFAULT_FILTERS } from "../../components/admin/ReportFilterBar";
import ReportTable from "../../components/admin/ReportTable";
import SettingsPanel from "../../components/admin/settings/SettingsPanel";
import StatsPanel from "../../components/admin/StatsPanel";
import SummaryStrip from "../../components/admin/SummaryStrip";
import type {
  AdminReportItem,
  NamedRef,
  ReportFilters,
  ReportSummary,
} from "../../types/admin";

function AdminPage() {
  const [token, setToken] = useState<string | null>(getAdminToken);
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [grouped, setGrouped] = useState(true);
  const [reports, setReports] = useState<AdminReportItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 카테고리 필터 선택지 — 카테고리 목록 API가 아직 없어서(3순위 1-17) 지금까지 본 목록에서 모음
  const [categories, setCategories] = useState<NamedRef[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<AdminTab>("reports");
  // 탭 배지용 "확인 필요" 반복 신고 건수 — null이면 배지를 숨김 (불러오기 실패·API 미배포)
  const [repeatCount, setRepeatCount] = useState<number | null>(null);
  const [focusCluster, setFocusCluster] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  const logout = useCallback(() => {
    clearAdminToken();
    setToken(null);
    setReports(null);
    setSummary(null);
    setSelectedId(null);
    setCategories([]);
    setFilters(DEFAULT_FILTERS);
    setSearch("");
    setTab("reports");
    setRepeatCount(null);
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setError(null);
    fetchReports(token, filters)
      .then((res) => {
        if (cancelled) return;
        setReports(res.items);
        setTotal(res.total);
        setLoadedAt(Date.now());
        setCategories((prev) => {
          const seen = new Map(prev.map((c) => [c.id, c]));
          res.items.forEach((r) => seen.set(r.category.id, r.category));
          return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          logout(); // 토큰 만료·위조 → 다시 로그인
          return;
        }
        setError("목록을 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, filters, reloadKey, logout]);

  // 숫자 띠·칩 건수·탭 배지 — 목록과 별개로 전체 신고 기준. 실패하면 숫자만 숨기고 나머지는 그대로
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchReportSummary(token)
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) logout();
        else setSummary(null);
      });
    fetchProblemClusters(token, "후보")
      .then((res) => {
        if (!cancelled) setRepeatCount(res.items.length);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) logout();
        else setRepeatCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, logout]);

  const visible = useMemo(
    () => (reports ? reports.filter((r) => matchesSearch(r, search)) : null),
    [reports, search],
  );
  const rows = useMemo(() => (visible ? buildRows(visible, grouped) : []), [visible, grouped]);
  const orderedIds = useMemo(() => flattenIds(rows), [rows]);
  const now = loadedAt ?? Date.now();

  const pickFilters = useCallback(
    (patch: Partial<ReportFilters>) => {
      setFilters((f) => {
        const next = { ...f, ...patch };
        if (!next.open_only && !next.status && next.sort === "sla_deadline") next.sort = "-created_at";
        return next;
      });
      setSearch("");
    },
    [],
  );

  const openCluster = useCallback((clusterId: string) => {
    setFocusCluster(clusterId);
    setTab("clusters");
  }, []);

  const findReports = useCallback((text: string) => {
    setFilters({ ...DEFAULT_FILTERS, open_only: false, sort: "-created_at" });
    setSearch(text);
    setTab("reports");
  }, []);

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-4">
        <LoginForm onLoggedIn={setToken} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <h1 className="text-lg font-bold text-gray-900">CampuSpot 관리자</h1>
          <div className="flex items-center gap-2">
            {loadedAt && (
              <span className="hidden text-xs text-gray-400 sm:inline">
                {formatClock(loadedAt)} 기준
              </span>
            )}
            <button
              type="button"
              onClick={reload}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              로그아웃
            </button>
          </div>
        </div>
        <AdminTabs
          tab={tab}
          onChange={setTab}
          repeatCount={repeatCount}
          overdueCount={summary?.sla_over ?? null}
        />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">
        {tab === "reports" && (
          <>
            <SummaryStrip
              summary={summary}
              repeatCount={repeatCount}
              filters={filters}
              onPick={pickFilters}
              onOpenRepeat={() => setTab("clusters")}
            />
            <ReportFilterBar
              filters={filters}
              categories={categories}
              summary={summary}
              search={search}
              grouped={grouped}
              onChange={setFilters}
              onSearch={setSearch}
              onGrouped={setGrouped}
            />
            {error && (
              <p className="text-sm text-red-600">
                {error}{" "}
                <button type="button" onClick={reload} className="underline">
                  다시 시도
                </button>
              </p>
            )}
            {!error && reports === null && <p className="text-sm text-gray-400">불러오는 중…</p>}
            {visible !== null && (
              <>
                <p className="mb-2 text-sm text-gray-600">
                  {search.trim() ? `검색 결과 ${visible.length}건` : `${total}건`}
                  {!search.trim() && total > REPORT_LIMIT && ` · 최근 ${REPORT_LIMIT}건만 표시`}
                </p>
                <ReportTable
                  rows={rows}
                  selectedId={selectedId}
                  now={now}
                  onSelect={setSelectedId}
                  onOpenCluster={openCluster}
                />
              </>
            )}
          </>
        )}
        {tab === "clusters" && (
          <RepeatReportPanel
            token={token}
            reloadKey={reloadKey}
            focusId={focusCluster}
            onFocusDone={() => setFocusCluster(null)}
            onChanged={reload}
            onSelectReport={setSelectedId}
            onUnauthorized={logout}
          />
        )}
        {tab === "predictions" && (
          <PredictionPanel
            token={token}
            reloadKey={reloadKey}
            onFindReports={findReports}
            onUnauthorized={logout}
          />
        )}
        {tab === "stats" && (
          <StatsPanel token={token} reloadKey={reloadKey} onUnauthorized={logout} />
        )}
        {tab === "logs" && (
          <ChatLogsPanel token={token} reloadKey={reloadKey} onUnauthorized={logout} />
        )}
        {tab === "settings" && (
          <SettingsPanel token={token} reloadKey={reloadKey} onUnauthorized={logout} />
        )}
      </main>

      {selectedId && (
        <ReportDetailPanel
          token={token}
          reportId={selectedId}
          orderedIds={tab === "reports" ? orderedIds : []}
          onSelect={setSelectedId}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
          onUnauthorized={logout}
        />
      )}
    </div>
  );
}

export default AdminPage;
