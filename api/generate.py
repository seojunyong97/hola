from http.server import BaseHTTPRequestHandler
import json
import os

from openai import OpenAI


def _get_prompt(stage: str, word: str | None = None) -> str:
    """단계별 프롬프트 생성"""

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

    word_instruction = ""
    if word:
        word_instruction = f'\n- 반드시 "{word}"라는 단어를 문장에 포함시켜주세요.'

    return f"""당신은 스페인어 학습 도우미입니다.
아래 조건에 맞는 스페인어 문장 1개를 생성해주세요.

- 난이도: {config['level']}
- 상황: {config['context']}
- 문장 길이: {config['length']}{word_instruction}

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
            stage = body.get("stage", "").strip()
            word = body.get("word", "").strip() or None

            if stage not in ("arrival", "explore", "local"):
                return self._error(400, "올바른 단계를 선택해주세요.")

            # API 키 확인
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                return self._error(500, "서버 설정 오류: API 키가 없어요.")

            # OpenAI 호출
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a Spanish language tutor. Always respond in valid JSON only."},
                    {"role": "user", "content": _get_prompt(stage, word)},
                ],
                temperature=0.8,
                max_tokens=500,
            )

            result_text = response.choices[0].message.content.strip()

            # JSON 파싱 (마크다운 코드블록 제거)
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
            return self._error(400, "요청 형식이 올바르지 않아요.")
        except Exception as e:
            error_msg = str(e)
            if "rate_limit" in error_msg.lower() or "429" in error_msg:
                return self._error(429, "요청이 너무 많아요. 잠시 후 다시 시도해주세요.")
            return self._error(500, "문장 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.")

    def _json(self, status: int, data: dict):
        self.send_response(status)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _error(self, status: int, msg: str):
        return self._json(status, {"error": msg})

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
