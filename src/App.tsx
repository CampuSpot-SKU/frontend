// App.tsx — 최상위 진입점. 지금은 챗봇 화면 하나만 보여줌.
// 관리자 페이지(1-6)를 붙일 때 여기서 주소(/, /admin)에 따라 화면을 나누면 됨 — TODO
import ChatPage from "./pages/chat";

function App() {
  return <ChatPage />;
}

export default App;
