# Hola 올라 — 스페인어, 여행하듯 배우자 ✈️

AI가 생성한 실전 스페인어 문장으로 듣고, 말하고, 익히는 웹 서비스입니다.

## 서비스 소개

**Hola(올라)**는 여행 단계별 난이도로 구성된 스페인어 학습 서비스입니다.

- **✈️ 도착 (A1):** 인사, 숫자, 주문 등 기초 회화
- **🚶 현지 탐험 (A2-B1):** 길 찾기, 쇼핑, 일상 대화
- **🏠 현지인 (B2+):** 토론, 감정 표현, 추상적 주제

AI가 매번 새로운 문장을 만들어주고, 문장 속 단어를 클릭하면 뜻과 예문을 볼 수 있습니다.

## 배포 URL

> 배포 후 여기에 URL을 추가합니다.

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | HTML / CSS / JavaScript (바닐라) |
| 백엔드 | Vercel Serverless Functions (Python) |
| AI API | OpenAI GPT-4o-mini |
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
   vercel env add OPENAI_API_KEY
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
| `OPENAI_API_KEY` | OpenAI API 키 (필수) |

Vercel 대시보드 → Settings → Environment Variables에서 설정합니다.

**주의:** API 키는 절대 코드나 커밋에 포함하지 마세요.

## 주요 기능

1. **AI 문장 생성:** 단계별 맞춤 스페인어 문장을 GPT-4o-mini가 생성
2. **듣기 연습:** Web Speech API(TTS)로 원어민 발음 재생
3. **발음 체크:** 마이크로 말하면 음성 인식(STT)으로 발음 비교
4. **단어 탐구:** 문장 속 단어 클릭 시 뜻/예문 표시
5. **내 여권:** 학습 스탬프 + 오답 노트로 진도 관리
6. **반응형 디자인:** 모바일/태블릿/데스크톱 대응
