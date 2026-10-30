import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  authErrorMessage,
  clearUserToken,
  login,
  restoreSession,
  signup,
} from "../api/userAuth";
import type { UserSession } from "../api/userAuth";

type Mode = "login" | "signup";

interface Props {
  /** 로그인 상태가 바뀔 때(새로고침 뒤 복원·로그인·가입·로그아웃) — 챗봇 화면이 대화를 계정에 연결(claim)하는 데 씀 (1-27) */
  onUserChange?: (user: UserSession | null) => void;
  /** [로그아웃]을 눌렀을 때만 (처음 들어온 비로그인·토큰 만료는 아님) — 챗봇 화면이 새 대화로 바꿈 (1-29) */
  onLogout?: () => void;
  /** 챗봇이 답하는 중에는 로그아웃을 잠시 막음 (답이 새 대화 화면에 섞이지 않게) */
  logoutDisabled?: boolean;
}

/**
 * 챗봇 머리글의 로그인 영역 (작업 1-24).
 * - 로그인 전: [로그인] [회원가입] 버튼 → 누르면 입력 창
 * - 로그인 후: 버튼 대신 "환영합니다 OOO님!" + [로그아웃]
 * 로그인은 선택 사항이라 챗봇·신고 흐름은 이 상태와 상관없이 그대로 동작한다.
 * 로그인 창은 하나 — 관리자 계정으로 로그인하면 관리자 페이지(/admin)로 넘어간다 (10/30).
 * 로그인한 동안의 대화는 계정에 저장된다(1-27) — 로그인 창에 고지.
 */
function AuthBar({ onUserChange, onLogout, logoutDisabled }: Props) {
  const [user, setUserState] = useState<UserSession | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const onUserChangeRef = useRef(onUserChange);
  onUserChangeRef.current = onUserChange;

  const setUser = (s: UserSession | null) => {
    setUserState(s);
    onUserChangeRef.current?.(s);
  };

  useEffect(() => {
    let alive = true;
    void restoreSession().then((s) => {
      if (alive) {
        setUserState(s);
        onUserChangeRef.current?.(s);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (user) {
    // 부모(머리글 오른쪽 묶음)가 줄바꿈되는 flex라 조각(<>)으로 돌려줌 — 휴대폰에선 환영 문구가 한 줄을 통째로 씀
    return (
      <>
        <span className="basis-full break-all text-right text-sm font-medium text-gray-800 sm:basis-auto">
          환영합니다 {user.name}님!
        </span>
        <button
          type="button"
          onClick={() => {
            clearUserToken();
            setUser(null);
            onLogout?.();
          }}
          disabled={logoutDisabled}
          className="shrink-0 rounded-full px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-50"
        >
          로그아웃
        </button>
      </>
    );
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className="rounded-full px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 sm:px-3"
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className="rounded-full bg-blue-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 sm:px-3"
        >
          회원가입
        </button>
      </div>
      {mode && (
        <AuthDialog
          mode={mode}
          onSwitch={setMode}
          onClose={() => setMode(null)}
          onDone={(s) => {
            setUser(s);
            setMode(null);
          }}
        />
      )}
    </>
  );
}

interface DialogProps {
  mode: Mode;
  onSwitch: (m: Mode) => void;
  onClose: () => void;
  onDone: (s: UserSession) => void;
}

function AuthDialog({ mode, onSwitch, onClose, onDone }: DialogProps) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isSignup = mode === "signup";

  useEffect(() => {
    firstRef.current?.focus();
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (isSignup && password !== password2) {
      setError("비밀번호 확인이 일치하지 않아요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (isSignup) {
        onDone(await signup(loginId.trim(), password, name.trim()));
      } else {
        const result = await login(loginId.trim(), password);
        if (result.kind === "admin") {
          window.location.href = "/admin"; // 관리자 계정이면 관리자 페이지로
          return; // 페이지가 넘어가는 동안 버튼은 "처리 중…" 그대로
        }
        onDone(result.session);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    }
    setBusy(false);
  };

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="auth-title" className="text-base font-bold text-gray-900">
            {isSignup ? "회원가입" : "로그인"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            닫기
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">아이디</span>
            <input
              ref={firstRef}
              className={input}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
              minLength={isSignup ? 4 : 1}
              maxLength={20}
              placeholder={isSignup ? "4~20자 영문 소문자·숫자·_" : undefined}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">비밀번호</span>
            <input
              type="password"
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : 1}
              maxLength={72}
              placeholder={isSignup ? "8자 이상" : undefined}
            />
          </label>
          {isSignup && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block text-gray-600">비밀번호 확인</span>
                <input
                  type="password"
                  className={input}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  autoComplete="new-password"
                  required
                  maxLength={72}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-gray-600">이름 (닉네임도 돼요)</span>
                <input
                  className={input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="nickname"
                  required
                  maxLength={20}
                />
              </label>
              <p className="text-xs text-gray-500">학번·전화번호는 받지 않아요.</p>
            </>
          )}
          <p className="text-xs text-gray-500">
            로그인하면 그동안의 대화가 내 계정에 저장돼 나중에 다시 볼 수 있어요. 로그인하지 않아도 신고와 문의는 그대로 쓸 수 있어요.
          </p>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "처리 중…" : isSignup ? "가입하기" : "로그인"}
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-gray-500">
          {isSignup ? "이미 계정이 있나요? " : "계정이 없나요? "}
          <button
            type="button"
            onClick={() => onSwitch(isSignup ? "login" : "signup")}
            className="font-medium text-blue-600 hover:underline"
          >
            {isSignup ? "로그인" : "회원가입"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthBar;
