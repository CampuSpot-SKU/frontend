# CampuSpot frontend

> 「불편이 문제가 되기 전에」 AI 기반 캠퍼스 문제 탐지·예측·해결 서비스 **캠퍼스팟**

캠퍼스 불편사항 신고와 학교 행정 문의를 하나의 챗봇으로 받는 서비스의 웹 화면(React + TypeScript)입니다.
학생용 챗봇 화면과 관리자 대시보드를 함께 담고 있습니다.

- 배포 주소: https://campuspot-frontend-890230516680.asia-northeast3.run.app
- 관리자 화면: https://campuspot-frontend-890230516680.asia-northeast3.run.app/admin

## 레포 구성

캠퍼스팟은 3개 레포로 나뉘어 있습니다 — [CampuSpot-SKU](https://github.com/CampuSpot-SKU)

| 레포 | 역할 |
|---|---|
| **frontend** (이 레포) | 학생 챗봇 화면, 관리자 대시보드 |
| [backend](https://github.com/CampuSpot-SKU/backend) | FastAPI API 서버 — 대화 세션, 신고 접수·처리 흐름, 관리자 기능, DB |
| [ai](https://github.com/CampuSpot-SKU/ai) | 의도 분류, 학칙·공지 기반 RAG 답변, 사진 분석 등 AI 기능 |

```
브라우저 ──(HTTPS, /api/v1)──> backend ──(내부 HTTP)──> ai
 (이 레포)                        └── PostgreSQL(pgvector)
```

frontend는 backend API만 호출하고, ai 서비스는 backend를 거쳐서만 사용합니다.
backend 주소는 빌드 시 `VITE_API_BASE_URL`로 바꿀 수 있고, 없으면 배포된 backend 주소를 씁니다(`src/api/client.ts`).

## 주요 화면

- **챗봇** (`/`): 신고·문의를 한 입력창으로 받음 — 신고 접수(사진 첨부, 위치 선택), 신고 상태 조회, 행정 문의 답변(근거 인용·실시간 표시), 회원가입·로그인(선택), 왼쪽 사이드바의 이전 대화 보기
- **관리자** (`/admin`): 접수 목록·상세(AI 판정 이유, 유사 사례, 신고 대화) 및 상태 변경, 문제 후보, 예방 점검, 통계, 문의 로그, 설정(카테고리·건물·우선순위·SLA·조건-액션 규칙·탐지 기준)

## 폴더 구조

```
src/
├── main.tsx, App.tsx      # 진입점 — 주소가 /admin으로 시작하면 관리자, 그 외는 챗봇
├── pages/
│   ├── chat/              # 학생 챗봇 화면
│   └── admin/             # 관리자 대시보드
├── components/
│   ├── report/            # 신고 패널·위치 선택·상태 조회
│   ├── history/           # 이전 대화 사이드바
│   ├── admin/             # 관리자 탭·목록·상세·통계·탐지/예측 패널
│   │   └── settings/      # 관리자 설정 편집기
│   └── *.tsx              # 말풍선·입력창·사진 첨부·로그인 바 등 공통 부품
├── api/                   # backend 호출 함수 (client.ts를 공통으로 거침)
├── types/                 # API 응답 타입
└── lib/                   # 사진 크기 줄이기 등 보조 함수
Dockerfile, nginx.conf     # 빌드 결과를 nginx로 서빙 (없는 경로는 index.html로)
.github/workflows/deploy.yml
```

## 기술 스택

- React 18, TypeScript 5, Vite 5
- Tailwind CSS 4
- ESLint, Prettier
- nginx (정적 파일 서빙), Docker, Google Cloud Run

## 배포 방식

`main`에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 자동으로 실행됩니다.

1. **test**: 비밀값 검사(gitleaks) → `npm ci` → ESLint → TypeScript 타입 검사
2. **build**: Docker 이미지 빌드 → Artifact Registry에 저장 (태그 = 커밋 SHA)
3. **deploy**: test와 build가 모두 성공하면 Cloud Run(`campuspot-frontend`, 서울 리전)에 배포

Pull request에서는 test만 실행됩니다.
