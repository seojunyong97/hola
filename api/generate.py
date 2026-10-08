from http.server import BaseHTTPRequestHandler
import json
import os
import random

from google import genai
from google.genai import types

# 사용할 모델 순서. 첫 모델이 없거나 지원 종료되면 다음 모델로 넘어간다.
# 환경 변수 GEMINI_MODEL 로 첫 번째 모델을 바꿀 수 있다.
DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash"]


def _model_list():
    custom = os.environ.get("GEMINI_MODEL", "").strip()
    return ([custom] if custom else []) + DEFAULT_MODELS


# 단계별 세부 상황 (매번 랜덤 선택 → 문장 다양성 확보)
_ARRIVAL_TOPICS = [
    "공항에서 입국 심사", "택시 타기", "호텔 체크인", "식당에서 주문",
    "카페에서 커피 주문", "길에서 인사", "가격 묻기", "숫자 세기",
    "자기소개", "날씨 이야기", "시간 묻기", "화장실 찾기",
    "메뉴판 읽기", "호텔 조식", "환전소에서", "짐 찾기",
]
_EXPLORE_TOPICS = [
    "지하철 타기", "버스 노선 묻기", "시장에서 쇼핑", "관광지 입장",
    "박물관 관람", "해변에서", "약국에서 약 사기", "전화 통화",
    "우체국에서 소포 보내기", "옷 가게에서", "친구에게 약속 제안",
    "레스토랑 예약", "슈퍼마켓 장보기", "사진 찍어달라 부탁",
    "호텔 불만 말하기", "렌터카 빌리기",
]
_LOCAL_TOPICS = [
    "정치 뉴스 토론", "환경 문제 의견", "영화 리뷰", "역사 이야기",
    "미래 계획 이야기", "실망 표현", "감사 표현", "가족 소개",
    "직장 생활 이야기", "건강과 운동", "음식 문화 비교",
    "교육 시스템 토론", "소셜 미디어 의견", "여행 추억",
    "꿈과 목표", "유머와 농담",
]

_TOPIC_MAP = {
    "arrival": _ARRIVAL_TOPICS,
    "explore": _EXPLORE_TOPICS,
    "local": _LOCAL_TOPICS,
}


def _get_prompt(stage, word=None):
    """단계별 프롬프트 생성 — 매번 랜덤 세부 상황 선택"""

    stage_config = {
        "arrival": {
            "level": "A1 (초급)",
            "context": "공항 도착, 호텔 체크인, 식당 주문, 인사, 숫자, 기본 질문",
            "length": "3~6 단어",
        },
        "explore": {
            "level": "A2-B1 (중급)",
            "context": "길 찾기, 쇼핑, 일상 대화, 교통, 관광지 설명",
            "length": "6~12 단어",
        },
        "local": {
            "level": "B2+ (고급)",
            "context": "토론, 감정 표현, 뉴스, 문화 비교, 추상적 주제",
            "length": "10~18 단어",
        },
    }

    config = stage_config.get(stage, stage_config["arrival"])

    # 랜덤 세부 상황 선택
    topic = random.choice(_TOPIC_MAP.get(stage, _ARRIVAL_TOPICS))

    word_instruction = ""
    if word:
        word_instruction = f'\n- 반드시 "{word}"라는 단어를 문장에 포함시켜주세요.'

    return f"""당신은 스페인어 학습 도우미입니다.
아래 조건에 맞는 스페인어 문장 1개를 생성해주세요.

- 난이도: {config['level']}
- 상황: {config['context']}
- 이번 세부 상황: **{topic}**
- 문장 길이: {config['length']}
- 이전에 생성한 문장과 절대 겹치지 않는 완전히 새로운 문장을 만들어주세요.
- 다양한 어휘와 문법 구조를 사용해주세요.{word_instruction}

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{{
  "sentence": "스페인어 문장",
  "translation": "한국어 번역",
  "hint": "문법 또는 발음 팁 (한국어, 1줄)",
  "words": [
    {{"word": "주요단어1", "meaning": "뜻 (한국어)", "example": "예문 (스페인어)"}},
    {{"word": "주요단어2", "meaning": "뜻 (한국어)", "example": "예문 (스페인어)"}}
  ]
}}

words에는 문장의 핵심 단어 2~4개를 포함해주세요."""


def _get_translate_prompt(korean_text):
    """한국어 → 스페인어 번역 프롬프트"""
    return f"""당신은 한국어-스페인어 번역 도우미입니다.
아래 한국어 문장을 스페인어로 번역하고, 학습에 도움이 되는 정보를 함께 제공해주세요.

한국어: "{korean_text}"

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{{
  "sentence": "번역된 스페인어 문장",
  "translation": "{korean_text}",
  "hint": "이 문장의 문법 포인트 또는 유용한 팁 (한국어, 1줄)",
  "words": [
    {{"word": "주요단어1", "meaning": "뜻 (한국어)", "example": "예문 (스페인어)"}},
    {{"word": "주요단어2", "meaning": "뜻 (한국어)", "example": "예문 (스페인어)"}}
  ]
}}

words에는 문장의 핵심 단어 2~4개를 포함해주세요."""


def _generate(client, prompt):
    """모델을 순서대로 시도한다. 모델이 없을 때(404)만 다음 모델로 넘어간다."""
    last_error = None
    for model in _model_list():
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.95,
                    max_output_tokens=600,
                ),
            )
            return response.text
        except Exception as e:  # noqa: BLE001
            msg = str(e).lower()
            if "not found" in msg or "404" in msg or "no longer available" in msg:
                last_error = e
                continue
            raise
    raise last_error or RuntimeError("사용 가능한 모델이 없습니다.")


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_POST(self):
        try:
            # 요청 파싱
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                return self._error(400, "요청 본문이 비어있어요.")

            body = json.loads(self.rfile.read(content_length))

            # API 키 확인 (환경 변수)
            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key:
                return self._error(500, "서버 설정 오류: API 키가 없어요.")

            client = genai.Client(api_key=api_key)

            # 번역 모드 vs 학습 문장 생성 모드
            mode = str(body.get("mode", "")).strip()

            if mode == "translate":
                korean_text = str(body.get("text", "")).strip()[:200]
                if not korean_text:
                    return self._error(400, "번역할 한국어 문장을 입력해주세요.")
                prompt = _get_translate_prompt(korean_text)
            else:
                stage = str(body.get("stage", "")).strip()
                word = str(body.get("word", "") or "").strip()[:30] or None
                if stage not in ("arrival", "explore", "local"):
                    return self._error(400, "올바른 단계를 선택해주세요.")
                prompt = _get_prompt(stage, word)

            result_text = _generate(client, prompt).strip()

            # 혹시 마크다운 코드블록이 붙어 있으면 제거
            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[1]
                if result_text.endswith("```"):
                    result_text = result_text[:-3]
                result_text = result_text.strip()

            result = json.loads(result_text)

            # 필수 필드 확인
            if "sentence" not in result or "translation" not in result:
                return self._error(500, "AI 응답 형식이 올바르지 않아요. 다시 시도해주세요.")

            return self._json(200, result)

        except json.JSONDecodeError:
            return self._error(502, "AI 응답을 읽지 못했어요. 다시 시도해주세요.")
        except Exception as e:  # noqa: BLE001
            msg = str(e).lower()
            if "429" in msg or "resource_exhausted" in msg or "quota" in msg:
                return self._error(429, "무료 사용량이 잠시 가득 찼어요. 1분 뒤에 다시 시도해주세요.")
            if "api key" in msg or "403" in msg or "401" in msg or "permission" in msg:
                return self._error(500, "서버 설정 오류: API 키를 확인해주세요.")
            return self._error(500, "문장 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.")

    def _json(self, status, data):
        self.send_response(status)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _error(self, status, msg):
        return self._json(status, {"error": msg})

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
