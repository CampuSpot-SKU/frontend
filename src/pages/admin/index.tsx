// 관리자 대시보드 페이지 (작업 1-6 화면, 2단계: 필터·정렬·SLA 강조·상세보기·상태 변경).
// 로그인 전 → 로그인 폼 / 로그인 후 → 탭 4개(접수 목록·문제 후보·예방 점검·설정).
// 접수 목록 탭: 필터 막대 + 접수 목록 표 + (행 선택 시) 상세 패널. 문제 후보·예방 점검은 작업 1-8·1-11, 설정은 작업 1-17.
import { useCallback, useEffect, useState } from "react";
import { clearAdminToken, fetchReports, getAdminToken, REPORT_LIMIT } from "../../api/admin";
import { fetchProblemClusters } from "../../api/adminDetection";
import { ApiError } from "../../api/client";
import AdminTabs, { type AdminTab } from "../../components/admin/AdminTabs";
import LoginForm from "../../components/admin/LoginForm";
import PredictionPanel from "../../components/admin/PredictionPanel";
import ProblemClusterPanel from "../../components/admin/ProblemClusterPanel";
import ReportDetailPanel from "../../components/admin/ReportDetailPanel";
import ReportFilterBar, { DEFAULT_FILTERS } from "../../components/admin/ReportFilterBar";
import ReportTable from "../../components/admin/ReportTable";
import SettingsPanel from "../../components/admin/settings/SettingsPanel";
import type {
  AdminReportItem,
  NamedRef,
  ReportFilters,
} from "../../types/admin";

const TAB_TITLES: Record<AdminTab, string> = {
  reports: "접수 목록",
  clusters: "문제 후보",
  predictions: "예방 점검",
  settings: "설정",
};

function AdminPage() {
  const [token, setToken] = useState<string | null>(getAdminToken);
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [reports, setReports] = useState<AdminReportItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 카테고리 필터 선택지 — 카테고리 목록 API가 아직 없어서(3순위 1-17) 지금까지 본 목록에서 모음
  const [categories, setCategories] = useState<NamedRef[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<AdminTab>("reports");
  // 탭 배지용 "후보" 상태 문제 후보 건수 — null이면 배지를 숨김 (불러오기 실패·API 미배포)
  const [candidateCount, setCandidateCount] = useState<number | null>(null);
  const [badgeKey, setBadgeKey] = useState(0);

  const logout = useCallback(() => {
    clearAdminToken();
    setToken(null);
    setReports(null);
    setSelectedId(null);
    setCategories([]);
    setFilters(DEFAULT_FILTERS);
    setTab("reports");
    setCandidateCount(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setError(null);
    fetchReports(token, filters)
      .then((res) => {
        if (cancelled) return;
        setReports(res.items);
        setTotal(res.total);
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
        setError("목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, filters, reloadKey, logout]);

  // 문제 후보 알림 배지: 페이지가 열릴 때·새로고침·승격/기각 처리 뒤에 후보 건수를 다시 센다
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchProblemClusters(token, "후보")
      .then((res) => {
        if (!cancelled) setCandidateCount(res.items.length);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          return;
        }
        setCandidateCount(null); // 배지만 숨기고 다른 화면은 그대로
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey, badgeKey, logout]);

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-4">
        <LoginForm onLoggedIn={setToken} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              CampuSpot 관리자
            </h1>
            <p className="text-xs text-gray-500">
              {TAB_TITLES[tab]}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
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
        <AdminTabs tab={tab} onChange={setTab} candidateCount={candidateCount} />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4">
        {tab === "reports" && (
          <>
            <ReportFilterBar
              filters={filters}
              categories={categories}
              onChange={setFilters}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!error && reports === null && (
              <p className="text-sm text-gray-400">불러오는 중…</p>
            )}
            {reports !== null && (
              <>
                <p className="mb-2 text-sm text-gray-600">
                  전체 {total}건
                  {total > REPORT_LIMIT && ` (최근 ${REPORT_LIMIT}건만 표시 — 필터로 좁혀 보세요)`}
                </p>
                <ReportTable
                  reports={reports}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </>
            )}
          </>
        )}
        {tab === "clusters" && (
          <ProblemClusterPanel
            token={token}
            reloadKey={reloadKey}
            onChanged={() => setBadgeKey((k) => k + 1)}
            onUnauthorized={logout}
          />
        )}
        {tab === "predictions" && (
          <PredictionPanel token={token} reloadKey={reloadKey} onUnauthorized={logout} />
        )}
        {tab === "settings" && (
          <SettingsPanel token={token} reloadKey={reloadKey} onUnauthorized={logout} />
        )}
      </main>

      {tab === "reports" && selectedId && (
        <ReportDetailPanel
          token={token}
          reportId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
          onUnauthorized={logout}
        />
      )}
    </div>
  );
}

export default AdminPage;
