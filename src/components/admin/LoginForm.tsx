import { useState } from "react";
import type { FormEvent } from "react";
import { login } from "../../api/admin";
import { ApiError } from "../../api/client";

interface Props {
  onLoggedIn: (token: string) => void;
}

/** 서버 응답 코드를 사람이 읽을 문구로 바꾼다. */
function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "아이디 또는 비밀번호가 올바르지 않아요.";
    if (err.status === 422) return "아이디와 비밀번호를 모두 입력해 주세요.";
    if (err.status === 503)
      return "서버의 로그인 설정이 아직 준비되지 않았어요. (JWT_SECRET 미설정)";
  }
  return "서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

/** 관리자 로그인 폼 (login_id + 비밀번호). */
function LoginForm({ onLoggedIn }: Props) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await login(loginId.trim(), password);
      onLoggedIn(token);
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h1 className="text-lg font-bold text-gray-900">CampuSpot 관리자</h1>
        <p className="text-xs text-gray-500">
          접수된 신고를 확인하고 처리합니다
        </p>
      </div>
      <label className="block">
        <span className="text-sm text-gray-700">아이디</span>
        <input
          type="text"
          autoComplete="username"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-700">비밀번호</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      </label>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || !loginId.trim() || !password}
        className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {submitting ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}

export default LoginForm;
