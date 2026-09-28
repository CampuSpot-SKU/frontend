// 관리자 대시보드 페이지 (작업 1-6 화면, 1단계: 뼈대).
// 로그인 전 → 로그인 폼 / 로그인 후 → 접수 목록 표.
// 다음 단계(TODO): 필터·정렬, SLA 임박·초과 강조, 상세보기, 상태 변경.
import { useEffect, useState } from "react";
import { clearAdminToken, fetchReports, getAdminToken } from "../../api/admin";
import { ApiError } from "../../api/client";
import LoginForm from "../../components/admin/LoginForm";
import type { AdminReportItem } from "../../types/admin";

/** 건물 이름이 있으면 "건물 층 세부", 없으면 사용자가 입력한 원문 위치 */
function locationText(r: AdminReportItem): string {
  if (r.building) {
    return [r.building.name, r.floor, r.detail].filter(Boolean).join(" ");
  }
  return r.location_raw ?? "-";
}

function AdminPage() {
  const [token, setToken] = useState<string | null>(getAdminToken);
  const [reports, setReports] = useState<AdminReportItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const logout = () => {
    clearAdminToken();
    setToken(null);
    setReports(null);
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setError(null);
    fetchReports(token)
      .then((res) => {
        if (cancelled) return;
        setReports(res.items);
        setTotal(res.total);
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
  }, [token]);

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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              CampuSpot 관리자
            </h1>
            <p className="text-xs text-gray-500">접수 목록</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && reports === null && (
          <p className="text-sm text-gray-400">불러오는 중…</p>
        )}
        {reports !== null && (
          <>
            <p className="mb-2 text-sm text-gray-600">전체 {total}건</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2">번호</th>
                    <th className="px-3 py-2">카테고리</th>
                    <th className="px-3 py-2">우선순위</th>
                    <th className="px-3 py-2">상태</th>
                    <th className="px-3 py-2">위치</th>
                    <th className="px-3 py-2">SLA</th>
                    <th className="px-3 py-2">접수일시</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-gray-400"
                      >
                        접수된 신고가 없어요
                      </td>
                    </tr>
                  )}
                  {reports.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{r.display_no}</td>
                      <td className="px-3 py-2">{r.category.name}</td>
                      <td className="px-3 py-2">{r.priority}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2">{locationText(r)}</td>
                      <td className="px-3 py-2">{r.sla_status ?? "-"}</td>
                      <td className="px-3 py-2">
                        {new Date(r.created_at).toLocaleString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminPage;
