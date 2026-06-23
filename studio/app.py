from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROMPT_PATH = ROOT / "prompts" / "story_grammar_v3.md"
SAMPLE_PATH = ROOT / "samples" / "OG0021_v3.quiz.json"
PORT = int(os.environ.get("QUIZ_STUDIO_PORT", "5177"))


def load_dotenv() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def json_response(handler: SimpleHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json_body(handler: SimpleHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", "0"))
    raw = handler.rfile.read(length).decode("utf-8") if length else "{}"
    return json.loads(raw or "{}")


def parse_story_lines(story_text: str) -> list[dict]:
    scenes: dict[str, list[dict]] = {}
    for raw in story_text.splitlines():
        match = re.match(r"^(SC\d{2})_(ST\d{2})_N\s*=\s*(.+)$", raw.strip())
        if not match:
            continue
        scene_id, sentence_no, text = match.groups()
        scenes.setdefault(scene_id, []).append({
            "sentenceId": f"{scene_id}_{sentence_no}_N",
            "text": text.strip().strip('"')
        })
    return [{"sceneId": sid, "sentences": sentences} for sid, sentences in sorted(scenes.items())]


def choose_scene(scene_ids: list[str], ratio: float) -> str:
    if not scene_ids:
        return "SC01"
    idx = round((len(scene_ids) - 1) * ratio)
    return scene_ids[max(0, min(idx, len(scene_ids) - 1))]


def rule_based_quiz(payload: dict) -> dict:
    story_id = payload.get("storyId") or "OG0000"
    title = payload.get("title") or "Untitled Story"
    level = payload.get("level") or "Draft Level"
    story_text = payload.get("storyText") or ""
    scenes = parse_story_lines(story_text)
    scene_ids = [s["sceneId"] for s in scenes] or ["SC01", "SC02", "SC03", "SC04", "SC05"]
    first_scene = scene_ids[0]
    event_scene = scene_ids[1] if len(scene_ids) > 1 else first_scene
    attempt_scene = choose_scene(scene_ids, 0.35)
    reaction_scene = choose_scene(scene_ids, 0.62)
    consequence_scene = scene_ids[-1]
    sequence = list(dict.fromkeys([first_scene, event_scene, attempt_scene, reaction_scene, consequence_scene]))
    while len(sequence) < 5:
        sequence.append(scene_ids[min(len(sequence), len(scene_ids) - 1)])

    def image(scene: str) -> dict:
        return {"id": scene, "path": f"{story_id}_{scene}_I.png", "kind": "image", "sceneId": scene}

    def first_sentence(scene: str) -> tuple[str, str]:
        for item in scenes:
            if item["sceneId"] == scene and item.get("sentences"):
                sent = item["sentences"][0]
                return sent["sentenceId"], sent["text"]
        return f"{scene}_ST01_N", ""

    attempt_sentence_id, attempt_sentence = first_sentence(attempt_scene)
    words = re.findall(r"[A-Za-z']+[,\.!?]?", attempt_sentence)[:7] or ["Put", "the", "words", "in", "order."]

    axes = [
        ["setting", "Setting", "배경 이해", "이야기의 시간, 장소, 상황적 배경을 이해하는 능력"],
        ["initiating_event", "Initiating Event", "사건 시작", "사건이 시작된 원인이나 문제 상황을 파악하는 능력"],
        ["attempt", "Attempt", "해결 행동", "등장인물이 목표를 해결하기 위해 수행한 행동을 이해하는 능력"],
        ["reaction", "Reaction", "감정 반응", "사건 결과에 대한 등장인물의 감정과 반응을 이해하는 능력"],
        ["internal_response", "Internal Response", "내면 추론", "등장인물의 생각, 의도, 동기와 같은 내적 상태를 추론하는 능력"],
        ["consequence", "Consequence", "결과 이해", "행동의 결과와 사건의 전개를 이해하는 능력"],
    ]

    questions = [
        {
            "qId": f"{story_id}_V3_Q01", "number": 1, "type": "story_sequence_drag", "storyGrammar": "consequence",
            "instruction": "Put the story scenes in order.",
            "hint": "Think about the story from start to end.",
            "resources": {"images": [image(sc) for sc in sequence]},
            "interaction": {"promptMode": "drag_sequence", "items": sequence, "correct": sequence},
            "scoring": {
                "type": "weighted_position", "maxScore": 100,
                "formula": "score = round(sum(weight_i * max(0, 1 - abs(placed_pos_i - correct_pos_i) * 0.5)) / sum(weights) * 100)",
                "components": [
                    {"key": sc, "weight": 2.5 if idx in (0, len(sequence) - 1) else 1.5, "rule": "position_distance", "correctValue": idx + 1, "rationale": "Story sequence diagnostic point."}
                    for idx, sc in enumerate(sequence)
                ]
            },
            "diagnostics": [{"code": "consequence_order_gap", "threshold": 70, "messageKo": "사건의 순서와 결과를 다시 확인할 필요가 있습니다."}],
            "lrs": {"verb": "answered", "objectId": f"quiz_{story_id}_v3_Q01_consequence", "resultFields": ["score_raw", "scene_order", "hint_used"]}
        },
        {
            "qId": f"{story_id}_V3_Q02", "number": 2, "type": "setting_slot_drag", "storyGrammar": "setting",
            "instruction": "Look at the first scene. Fill in the boxes.",
            "hint": "Who is there? Where are they?",
            "resources": {"images": [image(first_scene)], "scene": first_scene},
            "interaction": {
                "promptMode": "slot_drag",
                "slots": [
                    {"key": "who", "label": "Who?", "correct": "main_character", "weight": 2.5},
                    {"key": "where", "label": "Where?", "correct": "main_place", "weight": 2.0},
                    {"key": "what", "label": "At first...", "correct": "opening_state", "weight": 1.5}
                ],
                "items": [
                    {"key": "main_place", "text": "story place", "slot": "where"},
                    {"key": "main_character", "text": "main character", "slot": "who"},
                    {"key": "later_problem", "text": "later problem", "slot": "what", "diagnostic": "문제 장면을 처음 상황으로 혼동함"},
                    {"key": "other_character", "text": "other character", "slot": "who", "diagnostic": "주인공과 주변 인물을 혼동함"},
                    {"key": "opening_state", "text": "first action", "slot": "what"},
                    {"key": "other_place", "text": "other place", "slot": "where", "diagnostic": "다른 장소를 시작 배경으로 혼동함"}
                ],
                "correct": {"who": "main_character", "where": "main_place", "what": "opening_state"}
            },
            "scoring": {
                "type": "weighted_slot_match", "maxScore": 100,
                "formula": "full slot weight if exact target; 35% slot credit if same category but wrong card; 0 for wrong category",
                "components": [
                    {"key": "who", "weight": 2.5, "rule": "slot_match", "correctValue": "main_character", "partialCredit": 0.35, "rationale": "Identifies the main character."},
                    {"key": "where", "weight": 2.0, "rule": "slot_match", "correctValue": "main_place", "partialCredit": 0.35, "rationale": "Identifies the story place."},
                    {"key": "what", "weight": 1.5, "rule": "slot_match", "correctValue": "opening_state", "partialCredit": 0.35, "rationale": "Identifies the opening state."}
                ]
            },
            "diagnostics": [{"code": "setting_slot_gap", "threshold": 70, "messageKo": "인물, 장소, 처음 상황을 나누어 읽는 연습이 필요합니다."}],
            "lrs": {"verb": "answered", "objectId": f"quiz_{story_id}_v3_Q02_setting", "resultFields": ["score_raw", "slot_values", "hint_used"]}
        },
        {
            "qId": f"{story_id}_V3_Q03", "number": 3, "type": "listen_scene_mcq", "storyGrammar": "initiating_event",
            "instruction": "Listen. Which scene starts the problem?",
            "hint": "Listen for the first big change.",
            "resources": {"images": [image(sc) for sc in sequence[:4]], "audio": {"id": f"{event_scene}_ST01_N_A", "path": f"{story_id}_{event_scene}_ST01_N_A.mp3", "kind": "audio", "sceneId": event_scene, "sentenceId": f"{event_scene}_ST01_N"}},
            "interaction": {
                "promptMode": "image_mcq",
                "options": [
                    {"key": chr(65 + idx), "text": sc, "score": 100 if sc == event_scene else max(0, 30 - idx * 5), "isCorrect": sc == event_scene, "diagnostic": "사건 시작 장면과 다른 장면을 혼동함"}
                    for idx, sc in enumerate(sequence[:4])
                ],
                "correct": chr(65 + max(0, sequence[:4].index(event_scene) if event_scene in sequence[:4] else 0))
            },
            "scoring": {"type": "fixed_option_score", "maxScore": 100, "formula": "score = selected_option.score", "components": [{"key": "correct", "weight": 100, "rule": "option_score", "correctValue": True, "rationale": "Correctly identifies the initiating event."}]},
            "diagnostics": [{"code": "initiating_event_gap", "threshold": 70, "messageKo": "이야기가 시작되는 문제 장면을 찾는 연습이 필요합니다."}],
            "lrs": {"verb": "answered", "objectId": f"quiz_{story_id}_v3_Q03_initiating_event", "resultFields": ["score_raw", "option_selected", "hint_used"]}
        },
        {
            "qId": f"{story_id}_V3_Q04", "number": 4, "type": "scene_word_unscramble", "storyGrammar": "attempt",
            "instruction": "Put the story words in order.",
            "hint": "Find who. Then find the action.",
            "resources": {"images": [image(attempt_scene)], "scene": attempt_scene, "sentenceId": attempt_sentence_id},
            "interaction": {"promptMode": "word_unscramble", "items": list(reversed(words)), "correct": words},
            "scoring": {
                "type": "weighted_word_position", "maxScore": 100,
                "formula": "score = round(sum(weight[word] if submitted_pos == correct_pos) / sum(weights) * 100)",
                "components": [
                    {"key": word, "weight": 2.5 if idx in (0, 1, len(words) - 1) else 1.0, "rule": "exact_position", "correctValue": idx + 1, "rationale": "Sentence structure diagnostic point."}
                    for idx, word in enumerate(words)
                ]
            },
            "diagnostics": [{"code": "attempt_sentence_gap", "threshold": 70, "messageKo": "행동 문장의 순서를 구성하는 연습이 필요합니다."}],
            "lrs": {"verb": "answered", "objectId": f"quiz_{story_id}_v3_Q04_attempt", "resultFields": ["score_raw", "word_order", "hint_used"]}
        },
        {
            "qId": f"{story_id}_V3_Q05", "number": 5, "type": "emotion_mcq", "storyGrammar": "reaction",
            "instruction": "How does the character feel here?",
            "hint": "Look at the face and the scene.",
            "resources": {"images": [image(reaction_scene)], "scene": reaction_scene},
            "interaction": {"promptMode": "text_mcq", "options": [
                {"key": "A", "text": "Happy", "score": 20, "isCorrect": False, "diagnostic": "장면의 감정을 반대로 이해함"},
                {"key": "B", "text": "Sad", "score": 100, "isCorrect": True},
                {"key": "C", "text": "Angry", "score": 40, "isCorrect": False, "diagnostic": "비슷한 부정 감정을 혼동함"},
                {"key": "D", "text": "Surprised", "score": 20, "isCorrect": False, "diagnostic": "갑작스러운 반응과 감정을 혼동함"}
            ], "correct": "B"},
            "scoring": {"type": "fixed_option_score", "maxScore": 100, "formula": "score = selected_option.score", "components": [{"key": "B", "weight": 100, "rule": "option_score", "correctValue": True, "rationale": "Identifies the character reaction."}]},
            "diagnostics": [{"code": "reaction_emotion_gap", "threshold": 70, "messageKo": "장면 근거를 보고 감정을 고르는 연습이 필요합니다."}],
            "lrs": {"verb": "answered", "objectId": f"quiz_{story_id}_v3_Q05_reaction", "resultFields": ["score_raw", "option_selected", "hint_used"]}
        },
        {
            "qId": f"{story_id}_V3_Q06", "number": 6, "type": "internal_response_mcq", "storyGrammar": "internal_response",
            "instruction": "What is the character thinking?",
            "hint": "Think about the character's heart.",
            "resources": {"images": [image(reaction_scene)], "scene": reaction_scene},
            "interaction": {"promptMode": "text_mcq", "options": [
                {"key": "A", "text": "I understand something now.", "score": 100, "isCorrect": True},
                {"key": "B", "text": "I want a new toy.", "score": 0, "isCorrect": False, "diagnostic": "이야기와 무관한 생각을 선택함"},
                {"key": "C", "text": "The place is pretty.", "score": 40, "isCorrect": False, "diagnostic": "표면 정보에 머무름"},
                {"key": "D", "text": "I want to go away.", "score": 20, "isCorrect": False, "diagnostic": "행동과 내면의 이유를 혼동함"}
            ], "correct": "A"},
            "scoring": {"type": "fixed_option_score", "maxScore": 100, "formula": "score = selected_option.score", "components": [{"key": "A", "weight": 100, "rule": "option_score", "correctValue": True, "rationale": "Infers internal response."}]},
            "diagnostics": [{"code": "internal_response_gap", "threshold": 70, "messageKo": "인물의 생각과 내면 상태를 추론하는 연습이 필요합니다."}],
            "lrs": {"verb": "answered", "objectId": f"quiz_{story_id}_v3_Q06_internal_response", "resultFields": ["score_raw", "option_selected", "hint_used"]}
        }
    ]

    return {
        "schemaVersion": "quiz-v3.0",
        "story": {"storyId": story_id, "title": title, "level": level, "text": story_text, "scenes": scenes},
        "assets": {
            "imageBasePath": f"../v3/{story_id}/Image/",
            "audioBasePath": f"../v3/{story_id}/Audio/",
            "coverBasePath": f"../v3/{story_id}/Cover/",
            "backgroundImage": f"../v3/{story_id}/Image/{story_id}_Talking_BG_I.png",
            "hintCharacter": "../v3/Assets/BKTK_Characters_Bookey.png"
        },
        "storyGrammarAxes": [{"key": k, "labelEn": en, "labelKo": ko, "descriptionKo": desc} for k, en, ko, desc in axes],
        "questions": questions,
        "reporting": {
            "overallFormula": "overall = average(setting, initiating_event, attempt, reaction, internal_response, consequence)",
            "masteryBands": [
                {"key": "stable", "min": 85, "max": 100, "labelKo": "안정"},
                {"key": "developing", "min": 70, "max": 84, "labelKo": "발달 중"},
                {"key": "shaky", "min": 50, "max": 69, "labelKo": "흔들림"},
                {"key": "focus", "min": 0, "max": 49, "labelKo": "집중 보완"}
            ],
            "parentFeedback": {
                axis[0]: {
                    "stable": f"{axis[2]} 항목을 안정적으로 이해했습니다.",
                    "developing": f"{axis[2]} 항목은 대체로 이해하고 있습니다.",
                    "shaky": f"{axis[2]} 항목의 근거를 더 확인할 필요가 있습니다.",
                    "focus": f"{axis[2]} 항목을 짧은 문장과 장면으로 다시 연습하세요."
                } for axis in axes
            }
        },
        "generation": {"provider": "rule_based", "model": "local-heuristic", "promptVersion": "story_grammar_v3", "createdAt": "2026-06-23", "notes": "Draft generated locally. Human review required."}
    }


def extract_json(text: str) -> dict:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?", "", stripped).strip()
        stripped = re.sub(r"```$", "", stripped).strip()
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start >= 0 and end > start:
        stripped = stripped[start:end + 1]
    return json.loads(stripped)


def call_openai(prompt: str, user_payload: dict) -> dict:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")
    model = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
    body = {
        "model": model,
        "input": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)}
        ],
        "text": {"format": {"type": "json_object"}}
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=90) as res:
        data = json.loads(res.read().decode("utf-8"))
    text = data.get("output_text")
    if not text:
        chunks = []
        for item in data.get("output", []):
            for content in item.get("content", []):
                if content.get("type") in ("output_text", "text"):
                    chunks.append(content.get("text", ""))
        text = "".join(chunks)
    return extract_json(text)


def call_gemini(prompt: str, user_payload: dict) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set.")
    model = os.environ.get("GEMINI_MODEL", "gemini-1.5-pro")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(model)}:generateContent?key={urllib.parse.quote(api_key)}"
    body = {
        "contents": [{
            "role": "user",
            "parts": [{"text": prompt + "\n\nINPUT:\n" + json.dumps(user_payload, ensure_ascii=False)}]
        }],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=90) as res:
        data = json.loads(res.read().decode("utf-8"))
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    return extract_json(text)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        if self.path == "/api/health":
            json_response(self, 200, {"ok": True, "service": "quiz-studio", "port": PORT})
            return
        if self.path == "/api/sample/og0021":
            json_response(self, 200, json.loads(SAMPLE_PATH.read_text(encoding="utf-8")))
            return
        if self.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self) -> None:
        try:
            payload = read_json_body(self)
            if self.path == "/api/generate-rule-based":
                json_response(self, 200, {"quiz": rule_based_quiz(payload)})
                return
            if self.path == "/api/generate-ai":
                prompt = PROMPT_PATH.read_text(encoding="utf-8")
                provider = (payload.get("provider") or os.environ.get("DEFAULT_AI_PROVIDER") or "openai").lower()
                user_payload = payload.get("input") or payload
                quiz = call_gemini(prompt, user_payload) if provider == "gemini" else call_openai(prompt, user_payload)
                json_response(self, 200, {"quiz": quiz, "provider": provider})
                return
            json_response(self, 404, {"error": "Unknown endpoint."})
        except (urllib.error.URLError, RuntimeError, KeyError, json.JSONDecodeError) as exc:
            json_response(self, 400, {"error": str(exc)})


if __name__ == "__main__":
    load_dotenv()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Quiz Studio running at http://127.0.0.1:{PORT}/")
    server.serve_forever()
