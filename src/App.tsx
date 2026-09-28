// App.tsx — 최상위 진입점. 주소(pathname)에 따라 화면을 고른다.
//   /admin, /admin/...  → 관리자 대시보드
//   그 외 전부           → 사용자 챗봇
// 화면이 2개뿐이라 라우터 라이브러리 없이 주소만 본다. 새로고침·직접 접속은
// nginx.conf의 try_files 폴백이 index.html로 보내줘서 그대로 동작함.
import AdminPage from "./pages/admin";
import ChatPage from "./pages/chat";

function App() {
  const isAdmin = window.location.pathname.startsWith("/admin");
  return isAdmin ? <AdminPage /> : <ChatPage />;
}

export default App;
