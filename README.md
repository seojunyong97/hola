# Hola 올라 — 스페인어, 여행하듯 배우자 ✈️

AI가 생성한 실전 스페인어 문장으로 듣고, 말하고, 익히는 웹 서비스입니다.

## 서비스 소개

**Hola(올라)**는 여행 단계별 난이도로 구성된 스페인어 학습 서비스입니다.

- **✈️ 도착 (초보):** Hola, Gracias 같은 초간단 표현 (2~4 단어)
- **🚶 현지 탐험 (초급):** 주문, 길 찾기, 간단한 대화 (4~7 단어)
- **🏠 현지인 (중급):** 일상 대화, 감정 표현 (6~10 단어)

AI가 매번 새로운 문장을 만들어주고, 문장 속 단어를 클릭하면 뜻과 예문을 볼 수 있습니다.

## 배포 URL

> **https://hola-eight-black.vercel.app**

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | HTML / CSS / JavaScript (바닐라) |
| 백엔드 | Vercel Serverless Functions (Python) |
| AI API | Google Gemini API |
| 음성 | Web Speech API (TTS/STT) |
| 배포 | Vercel |

## 프로젝트 구조

```
hola/
├── index.html          # 메인 HTML (SPA)
├── css/
│   └── style.css       # 스타일시트
├── js/
│   ├── app.js          # 라우팅, 네비게이션
│   ├── learn.js        # 학습 기능 (TTS, STT, 문장 표시)
│   ├── passport.js     # 내 여권 (오답 노트, 스탬프)
│   └── utils.js        # 공통 유틸리티 (API, localStorage)
├── api/
│   └── generate.py     # AI 문장 생성 서버리스 함수
├── images/             # 이미지 리소스
├── requirements.txt    # Python 패키지
├── vercel.json         # Vercel 설정
└── README.md
```

## 실행 방법

### 로컬 개발

1. 저장소를 클론합니다.
   ```bash
   git clone https://github.com/<username>/hola.git
   cd hola
   ```

2. Vercel CLI를 설치합니다.
   ```bash
   npm i -g vercel
   ```

3. 환경 변수를 설정합니다.
   ```bash
   vercel env add GEMINI_API_KEY
   ```

4. 로컬 서버를 실행합니다.
   ```bash
   vercel dev
   ```

5. 브라우저에서 `http://localhost:3000`에 접속합니다.

### 배포

```bash
vercel --prod
```

또는 GitHub 저장소를 Vercel에 연동하면 push 시 자동 배포됩니다.

## 환경 변수 설정

| 변수명 | 설명 |
|--------|------|
| `GEMINI_API_KEY` | Google Gemini API 키 (필수, 선택: GEMINI_MODEL) |

Vercel 대시보드 → Settings → Environment Variables에서 설정합니다.

**주의:** API 키는 절대 코드나 커밋에 포함하지 마세요.

## 주요 기능

1. **AI 문장 생성:** 단계별 맞춤 스페인어 문장을 Gemini가 생성 (16개 세부 상황 랜덤 선택, 중복 방지)
2. **한국어 → 스페인어 번역:** 한국어 문장을 입력하면 스페인어로 번역 + 학습 정보 제공
3. **듣기 연습:** Web Speech API(TTS)로 원어민 발음 재생
4. **발음 체크:** 마이크로 말하면 음성 인식(STT)으로 단어별 발음 비교 (맞은 단어 초록색 / 틀린 단어 빨간색)
5. **단어 탐구:** 문장 속 단어 클릭 시 뜻/예문 표시
6. **내 여권:** 학습 스탬프 + 오답 노트 (틀린 문장 듣기/말하기 재연습 가능)
7. **반응형 디자인:** 모바일/태블릿/데스크톱 대응
8. **다크 모드:** 네비게이션의 🌙/☀️ 버튼으로 전환, 선택값은 localStorage에 저장 (처음 방문 시 시스템 설정을 따름)
