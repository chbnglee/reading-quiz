from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from PIL import Image

from apply_diagnostic_rubric import update_quiz


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\IM_1783\Desktop\Quiz\OG0044")
OUT = ROOT / "v3" / "OG0044"


def parse_story() -> tuple[str, list[dict]]:
    source = (SOURCE / "OG0044_The Midnight Visitor.txt").read_text(encoding="utf-8")
    scenes: dict[str, list[dict]] = {}
    clean_lines: list[str] = []
    for raw in source.splitlines():
        match = re.match(r"(SC\d+_ST\d+_N)\s*=\s*(.+)$", raw.strip())
        if not match:
            continue
        sentence_id, text = match.groups()
        text = text.replace("##", "")
        scene_id = sentence_id[:4]
        scenes.setdefault(scene_id, []).append({"sentenceId": sentence_id, "text": text})
        clean_lines.append(f"{sentence_id} = {text}")
    return "\n".join(clean_lines), [
        {"sceneId": scene_id, "sentences": sentences}
        for scene_id, sentences in sorted(scenes.items())
    ]


def image(scene: str, caption: str | None = None) -> dict:
    row = {"id": scene, "path": f"OG0044_{scene}_I.webp", "kind": "image", "sceneId": scene}
    if caption:
        row["caption"] = caption
    return row


def option(key: str, text: str, score: int, diagnostic: str, scene: str | None = None) -> dict:
    row = {
        "key": key,
        "text": text,
        "score": score,
        "isCorrect": score == 100,
        "diagnostic": diagnostic,
        "responseQuality": {100: "Accurate", 67: "Partial", 33: "Related", 0: "Unrelated"}[score],
    }
    if scene:
        row["scene"] = scene
    return row


def lrs(qno: int, axis: str, answer_field: str) -> dict:
    return {
        "verb": "answered",
        "objectId": f"quiz_OG0044_v3_Q{qno:02d}_{axis}",
        "resultFields": ["score_raw", answer_field, "hint_used"],
    }


def build_quiz() -> dict:
    story_text, scenes = parse_story()
    questions = [
        {
            "qId": "OG0044_V3_Q01", "number": 1, "type": "story_sequence_drag",
            "storyGrammar": "consequence", "instruction": "Put the story scenes in order.",
            "hint": "Poco sees two scary shapes, then meets a small kitten.",
            "resources": {"images": [
                image("SC02", "Poco and Waggy are in the bedroom"),
                image("SC03", "Poco sees a dark shape"),
                image("SC06", "Poco turns on his flashlight"),
                image("SC12", "The visitor is a small kitten"),
                image("SC14", "The room feels warm with friends"),
            ]},
            "interaction": {"promptMode": "drag_sequence", "items": ["SC02", "SC03", "SC06", "SC12", "SC14"], "correct": ["SC02", "SC03", "SC06", "SC12", "SC14"]},
            "diagnostics": [{"code": "consequence_sequence_gap", "threshold": 67, "messageKo": "사건의 흐름과 결과를 순서대로 다시 확인하는 연습이 필요합니다."}],
            "lrs": lrs(1, "consequence", "scene_order"),
        },
        {
            "qId": "OG0044_V3_Q02", "number": 2, "type": "setting_slot_drag",
            "storyGrammar": "setting", "instruction": "Look at the picture. Fill in the boxes.",
            "hint": "Who is there? Where are they? What are they doing at first?",
            "resources": {"images": [image("SC02")], "scene": "SC02"},
            "interaction": {
                "promptMode": "slot_drag",
                "slots": [
                    {"key": "who", "label": "Who?", "correct": "poco_waggy", "weight": 1},
                    {"key": "where", "label": "Where?", "correct": "bedroom", "weight": 1},
                    {"key": "at_first", "label": "At first...", "correct": "resting", "weight": 1},
                ],
                "items": [
                    {"key": "poco_waggy", "text": "Poco and Waggy", "slot": "who", "diagnostic": ""},
                    {"key": "small_kitten", "text": "the small kitten", "slot": "who", "diagnostic": "나중에 등장하는 인물을 처음 장면의 인물로 혼동합니다."},
                    {"key": "bedroom", "text": "in Poco's bedroom", "slot": "where", "diagnostic": ""},
                    {"key": "at_window", "text": "at the window", "slot": "where", "diagnostic": "문제가 나타나는 위치를 처음 배경으로 혼동합니다."},
                    {"key": "resting", "text": "rest in the bedroom", "slot": "at_first", "diagnostic": ""},
                    {"key": "meet_kitten", "text": "meet a small kitten", "slot": "at_first", "diagnostic": "결말의 사건을 처음 상황으로 혼동합니다."},
                ],
                "correct": {"who": "poco_waggy", "where": "bedroom", "at_first": "resting"},
            },
            "diagnostics": [{"code": "setting_gap", "threshold": 67, "messageKo": "이야기의 처음 장면에서 인물, 장소, 처음 상황을 구분하는 연습이 필요합니다."}],
            "lrs": lrs(2, "setting", "slot_values"),
        },
        {
            "qId": "OG0044_V3_Q03", "number": 3, "type": "listen_scene_mcq",
            "storyGrammar": "initiating_event", "instruction": "Listen. Which scene starts the problem?",
            "hint": "Listen for what Poco suddenly sees.",
            "resources": {
                "images": [image("SC02"), image("SC03"), image("SC08"), image("SC14")],
                "audio": {"id": "SC03_ST01_N_A", "path": "OG0044_SC03_ST01_N_A.mp3", "kind": "audio", "sceneId": "SC03", "sentenceId": "SC03_ST01_N"},
            },
            "interaction": {
                "promptMode": "image_mcq",
                "options": [
                    option("A", "Poco and Waggy rest in the bedroom.", 33, "문제 이전의 배경 장면을 사건 시작으로 혼동합니다.", "SC02"),
                    option("B", "Poco sees a dark shape at the window.", 100, "", "SC03"),
                    option("C", "Poco finds his dinosaur pajamas.", 0, "첫 번째 오해가 풀리는 장면을 사건 시작으로 혼동합니다.", "SC08"),
                    option("D", "Poco sits with Waggy and the kitten.", 0, "결말 장면을 사건 시작으로 혼동합니다.", "SC14"),
                ],
                "correct": "B",
            },
            "diagnostics": [{"code": "initiating_event_gap", "threshold": 67, "messageKo": "평범한 배경과 문제를 시작시키는 사건을 구분하는 연습이 필요합니다."}],
            "lrs": lrs(3, "initiating_event", "option_selected"),
        },
        {
            "qId": "OG0044_V3_Q04", "number": 4, "type": "scene_word_unscramble",
            "storyGrammar": "attempt", "instruction": "Put the words in order.",
            "hint": "Build the sentence about Poco's flashlight action.",
            "resources": {"images": [image("SC06")], "scene": "SC06", "sourceSentenceId": "SC06_ST01_N"},
            "interaction": {"promptMode": "word_unscramble", "items": ["his flashlight.", "Poco", "takes"], "correct": ["Poco", "takes", "his flashlight."]},
            "diagnostics": [{"code": "attempt_action_gap", "threshold": 67, "messageKo": "문제를 확인하기 위해 인물이 취한 행동을 문장으로 구성하는 연습이 필요합니다."}],
            "lrs": lrs(4, "attempt", "word_order"),
        },
        {
            "qId": "OG0044_V3_Q05", "number": 5, "type": "emotion_mcq",
            "storyGrammar": "reaction", "instruction": "How does Poco feel here?",
            "hint": "Two yellow eyes look in. How does Poco feel?",
            "resources": {"images": [image("SC11")], "scene": "SC11"},
            "interaction": {
                "promptMode": "text_mcq",
                "options": [
                    option("A", "scared", 100, ""),
                    option("B", "curious", 67, "위험한 상황에 주의를 기울이는 점은 이해했지만 두려움의 구체성을 놓칩니다."),
                    option("C", "happy", 33, "첫 번째 오해가 풀린 뒤의 감정을 현재 위기 장면에 적용합니다."),
                    option("D", "sleepy", 0, "장면의 사건과 표정에서 감정 단서를 연결하지 못합니다."),
                ],
                "correct": "A",
            },
            "diagnostics": [{"code": "reaction_emotion_gap", "threshold": 67, "messageKo": "장면의 사건과 인물의 감정 반응을 연결하는 연습이 필요합니다."}],
            "lrs": lrs(5, "reaction", "option_selected"),
        },
        {
            "qId": "OG0044_V3_Q06", "number": 6, "type": "internal_response_mcq",
            "storyGrammar": "internal_response", "instruction": "What is Poco thinking?",
            "hint": "Look at the visitor. What does Poco understand?",
            "resources": {"images": [image("SC12")], "scene": "SC12"},
            "interaction": {
                "promptMode": "text_mcq",
                "options": [
                    option("A", "It is only a small kitten.", 100, ""),
                    option("B", "The visitor is smaller than I thought.", 67, "위협이 줄었다는 변화는 이해했지만 방문자의 정체를 완전히 연결하지 못합니다."),
                    option("C", "My dinosaur pajamas are at the window.", 33, "앞선 오해의 원인을 새로운 방문자 장면에 다시 적용합니다."),
                    option("D", "The room is empty.", 0, "현재 장면의 방문자와 인물 반응을 인식하지 못합니다."),
                ],
                "correct": "A",
            },
            "diagnostics": [{"code": "internal_response_gap", "threshold": 67, "messageKo": "인물의 생각과 깨달음을 장면 근거로 추론하는 연습이 필요합니다."}],
            "lrs": lrs(6, "internal_response", "option_selected"),
        },
    ]

    quiz = {
        "schemaVersion": "quiz-v3.1",
        "story": {"storyId": "OG0044", "title": "The Midnight Visitor", "level": "Pre-A1", "text": story_text, "scenes": scenes},
        "assets": {
            "imageBasePath": "Image/", "audioBasePath": "Audio/", "coverBasePath": "Cover/",
            "backgroundImage": "Image/OG0044_Talking_BG_I.webp",
            "coverImage": "Cover/OG0044_Cover_L_I.webp",
            "hintCharacter": "Assets/BKTK_Characters_Bookey.png",
        },
        "storyGrammarAxes": [
            {"key": "consequence", "labelEn": "Consequence", "labelKo": "결과 이해"},
            {"key": "setting", "labelEn": "Setting", "labelKo": "배경 이해"},
            {"key": "initiating_event", "labelEn": "Initiating Event", "labelKo": "사건 시작"},
            {"key": "attempt", "labelEn": "Attempt", "labelKo": "해결 행동"},
            {"key": "reaction", "labelEn": "Reaction", "labelKo": "감정 반응"},
            {"key": "internal_response", "labelEn": "Internal Response", "labelKo": "내면 추론"},
        ],
        "questions": questions,
        "generation": {"provider": "codex", "model": "manual-v3-logic", "promptVersion": "story_grammar_v3", "createdAt": "2026-08-14", "notes": "Generated from the supplied OG0044 resources."},
    }
    update_quiz(quiz)
    return quiz


def copy_assets() -> None:
    for folder in [OUT / "Image", OUT / "Audio", OUT / "Cover", OUT / "Assets"]:
        folder.mkdir(parents=True, exist_ok=True)
    for source in sorted((SOURCE / "1080p").glob("OG0044_SC*_I.*")):
        target = OUT / "Image" / f"{source.stem}.webp"
        with Image.open(source) as picture:
            picture.convert("RGB").save(target, "WEBP", quality=88, method=6)
    shutil.copy2(SOURCE / "OG0044_Talking_BG_I.webp", OUT / "Image" / "OG0044_Talking_BG_I.webp")
    shutil.copy2(SOURCE / "OG0044_Cover_L_I.webp", OUT / "Cover" / "OG0044_Cover_L_I.webp")
    shutil.copy2(ROOT / "v3" / "Assets" / "BKTK_Characters_Bookey.png", OUT / "Assets" / "BKTK_Characters_Bookey.png")
    for source in sorted(SOURCE.rglob("*_N_A.mp3")):
        shutil.copy2(source, OUT / "Audio" / source.name)


def write_html(quiz: dict) -> None:
    template = (ROOT / "v3" / "OG0049" / "OG0049_ReadingQuiz.html").read_text(encoding="utf-8")
    html = template.replace("The Mystery of the Deep: The Lost Light Reading Quiz", "The Midnight Visitor Reading Quiz")
    html = html.replace("Cover/OG0049_Cover_L_I.webp", "Cover/OG0044_Cover_L_I.webp")
    html = html.replace("OG0049_ReadingQuiz.xlsx", "OG0044_ReadingQuiz.xlsx")
    html = html.replace("OG0049_DevSpec.xlsx", "OG0044_DevSpec.xlsx")
    embedded = json.dumps(quiz, ensure_ascii=False, separators=(",", ":"))
    html, count = re.subn(
        r"const QUIZ = \{.*?\};\r?\nconst bg",
        lambda _: f"const QUIZ = {embedded};\nconst bg",
        html,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("Could not replace embedded quiz JSON")
    (OUT / "OG0044_ReadingQuiz.html").write_text(html, encoding="utf-8")


def main() -> None:
    copy_assets()
    quiz = build_quiz()
    (OUT / "OG0044.quiz.json").write_text(json.dumps(quiz, ensure_ascii=False, indent=2), encoding="utf-8")
    write_html(quiz)
    print(f"Built OG0044 JSON, HTML, and assets in {OUT}")


if __name__ == "__main__":
    main()
