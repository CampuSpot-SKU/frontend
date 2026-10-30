import { useState } from "react";
import { clearAdminToken, getAdminToken } from "../api/admin";

const linkClass =
  "shrink-0 rounded-full px-1.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 sm:px-2";

/**
 * 챗봇 머리글의 관리자 링크 (작업 1-24).
 * - 관리자로 로그인 안 한 탭: [관리자 로그인] → /admin 로그인 화면(admins 테이블)
 * - 관리자로 로그인한 탭: [관리자 페이지] + [관리자 로그아웃] — 로그아웃하면 관리자 토큰을 지우고 [관리자 로그인]으로 돌아감
 * 학생 로그인(AuthBar)과는 토큰·계정이 따로라 서로 영향을 주지 않는다.
 */
function AdminLinks() {
  const [loggedIn, setLoggedIn] = useState(() => getAdminToken() !== null);

  if (!loggedIn) {
    return (
      <a href="/admin" className={linkClass}>
        관리자 로그인
      </a>
    );
  }
  return (
    <>
      <a href="/admin" className={linkClass}>
        관리자 페이지
      </a>
      <button
        type="button"
        onClick={() => {
          clearAdminToken();
          setLoggedIn(false);
        }}
        className={linkClass}
      >
        관리자 로그아웃
      </button>
    </>
  );
}

export default AdminLinks;
