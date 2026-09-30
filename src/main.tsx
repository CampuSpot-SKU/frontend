import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { resetChatFlowOnLoad } from "./api/chatReset";
import "./index.css";

// 새로고침하면 화면은 처음 상태로 돌아오므로, 서버에 남은 이전 신고 흐름도 끝냄 (src/api/chatReset.ts)
resetChatFlowOnLoad();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
