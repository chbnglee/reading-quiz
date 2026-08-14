from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from apply_diagnostic_rubric import update_quiz


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\IM_1783\Desktop\Quiz\OG0060")
OUT = ROOT / "v3" / "OG0060"


def parse_story() -> tuple[str, list[dict]]:
    source = next(SOURCE.glob("OG0060_*.txt")).read_text(encoding="utf-8")
    scenes: dict[str, list[dict]] = {}
    clean_lines: list[str] = []
    for raw in source.splitlines():
        match = re.match(r"(SC\d+_ST\d+_N)\s*=\s*(.+)$", raw.strip())
        if not match:
            continue
        sentence_id, text = match.groups()
        text = text.replace("##", "")
        if text == '"Hi!':
            text = '"Hi!"'
        scene_id = sentence_id[:4]
        scenes.setdefault(scene_id, []).append({"sentenceId": sentence_id, "text": text})
        clean_lines.append(f"{sentence_id} = {text}")
    return "\n".join(clean_lines), [{"sceneId": scene, "sentences": rows} for scene, rows in sorted(scenes.items())]


def image(scene: str, caption: str | None = None) -> dict:
    row = {"id": scene, "path": f"OG0060_{scene}_I.webp", "kind": "image", "sceneId": scene}
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


def lrs(number: int, axis: str, answer_field: str) -> dict:
    return {
        "verb": "answered",
        "objectId": f"quiz_OG0060_v3_Q{number:02d}_{axis}",
        "resultFields": ["score_raw", answer_field, "hint_used"],
    }


def build_quiz() -> dict:
    story_text, scenes = parse_story()
    questions = [
        {
            "qId": "OG0060_V3_Q01", "number": 1, "type": "story_sequence_drag", "storyGrammar": "consequence",
            "instruction": "Put the story scenes in order.", "hint": "Follow Pip from the egg to his big change.",
            "resources": {"images": [
                image("SC01", "A small egg rests on a leaf"),
                image("SC02", "Pip comes out of the egg"),
                image("SC06", "Pip meets Dot"),
                image("SC10", "Pip makes a hard little house"),
                image("SC13", "Pip comes out with wings"),
            ]},
            "interaction": {"promptMode": "drag_sequence", "items": ["SC01", "SC02", "SC06", "SC10", "SC13"], "correct": ["SC01", "SC02", "SC06", "SC10", "SC13"]},
            "diagnostics": [{"code": "consequence_sequence_gap", "threshold": 67, "messageKo": "Pip의 성장과 변화가 이어지는 순서를 다시 확인하는 연습이 필요합니다."}],
            "lrs": lrs(1, "consequence", "scene_order"),
        },
        {
            "qId": "OG0060_V3_Q02", "number": 2, "type": "setting_slot_drag", "storyGrammar": "setting",
            "instruction": "Look at the picture. Fill in the boxes.", "hint": "Who is there? Where is he? What does he do at first?",
            "resources": {"images": [image("SC03")], "scene": "SC03"},
            "interaction": {
                "promptMode": "slot_drag",
                "slots": [
                    {"key": "who", "label": "Who?", "correct": "pip", "weight": 1},
                    {"key": "where", "label": "Where?", "correct": "on_leaf", "weight": 1},
                    {"key": "at_first", "label": "At first...", "correct": "eats_leaf", "weight": 1},
                ],
                "items": [
                    {"key": "pip", "text": "Pip", "slot": "who", "diagnostic": ""},
                    {"key": "dot", "text": "Dot", "slot": "who", "diagnostic": "나중에 등장하는 친구를 처음 인물로 혼동합니다."},
                    {"key": "on_leaf", "text": "on a green leaf", "slot": "where", "diagnostic": ""},
                    {"key": "among_flowers", "text": "among the flowers", "slot": "where", "diagnostic": "결말의 장소를 처음 배경으로 혼동합니다."},
                    {"key": "eats_leaf", "text": "eats the leaf", "slot": "at_first", "diagnostic": ""},
                    {"key": "flies_flowers", "text": "flies above the flowers", "slot": "at_first", "diagnostic": "변화 이후의 행동을 처음 상황으로 혼동합니다."},
                ],
                "correct": {"who": "pip", "where": "on_leaf", "at_first": "eats_leaf"},
            },
            "diagnostics": [{"code": "setting_gap", "threshold": 67, "messageKo": "이야기 초반의 인물·장소·처음 행동을 구분하는 연습이 필요합니다."}],
            "lrs": lrs(2, "setting", "slot_values"),
        },
        {
            "qId": "OG0060_V3_Q03", "number": 3, "type": "listen_scene_mcq", "storyGrammar": "initiating_event",
            "instruction": "Listen. Which scene starts Pip's big change?", "hint": "Listen for how Pip feels before he makes a little house.",
            "resources": {
                "images": [image("SC03"), image("SC08"), image("SC10"), image("SC13")],
                "audio": {"id": "SC08_ST04_N_A", "path": "OG0060_SC08_ST04_N_A.mp3", "kind": "audio", "sceneId": "SC08", "sentenceId": "SC08_ST04_N"},
            },
            "interaction": {
                "promptMode": "image_mcq",
                "options": [
                    option("A", "Pip eats a leaf.", 33, "성장 전의 일상 행동을 변화의 시작으로 혼동합니다.", "SC03"),
                    option("B", "Pip becomes very sleepy.", 100, "", "SC08"),
                    option("C", "Pip sleeps inside a hard little house.", 67, "변화 과정은 찾았지만 그 과정을 시작하게 한 졸림보다 뒤 장면을 선택합니다.", "SC10"),
                    option("D", "Pip comes out with wings.", 0, "변화의 결과를 변화의 시작으로 혼동합니다.", "SC13"),
                ],
                "correct": "B",
            },
            "diagnostics": [{"code": "initiating_event_gap", "threshold": 67, "messageKo": "변화를 시작하게 한 사건과 변화 과정·결과를 구분하는 연습이 필요합니다."}],
            "lrs": lrs(3, "initiating_event", "option_selected"),
        },
        {
            "qId": "OG0060_V3_Q04", "number": 4, "type": "scene_word_unscramble", "storyGrammar": "attempt",
            "instruction": "Put the words in order.", "hint": "Build the sentence about the house Pip makes.",
            "resources": {"images": [image("SC10")], "scene": "SC10", "sourceSentenceId": "SC10_ST01_N"},
            "interaction": {"promptMode": "word_unscramble", "items": ["little", "Pip", "house.", "hard", "makes", "a"], "correct": ["Pip", "makes", "a", "hard", "little", "house."]},
            "diagnostics": [{"code": "attempt_action_gap", "threshold": 67, "messageKo": "Pip이 변화를 위해 한 행동을 정확한 문장 순서로 구성하는 연습이 필요합니다."}],
            "lrs": lrs(4, "attempt", "word_order"),
        },
        {
            "qId": "OG0060_V3_Q05", "number": 5, "type": "emotion_mcq", "storyGrammar": "reaction",
            "instruction": "How does Pip feel here?", "hint": "Pip has wings and says, “I can fly!”",
            "resources": {"images": [image("SC13")], "scene": "SC13"},
            "interaction": {
                "promptMode": "text_mcq",
                "options": [
                    option("A", "happy", 100, ""),
                    option("B", "surprised", 67, "새로운 날개에 대한 반응은 이해했지만 장면의 밝고 기쁜 감정을 덜 구체적으로 파악합니다."),
                    option("C", "sleepy", 33, "변화 전 장면의 감정을 현재 장면에 적용합니다."),
                    option("D", "angry", 0, "장면의 표정과 말에서 감정 단서를 연결하지 못합니다."),
                ],
                "correct": "A",
            },
            "diagnostics": [{"code": "reaction_emotion_gap", "threshold": 67, "messageKo": "장면의 말·표정과 Pip의 감정을 연결하는 연습이 필요합니다."}],
            "lrs": lrs(5, "reaction", "option_selected"),
        },
        {
            "qId": "OG0060_V3_Q06", "number": 6, "type": "internal_response_mcq", "storyGrammar": "internal_response",
            "instruction": "What is Pip thinking?", "hint": "Think about what Pip wants to do for Dot now.",
            "resources": {"images": [image("SC15")], "scene": "SC15"},
            "interaction": {
                "promptMode": "text_mcq",
                "options": [
                    option("A", "Now I will wait for Dot.", 100, ""),
                    option("B", "Dot will change too.", 67, "Dot의 다음 변화를 예상하지만 Pip이 친구를 위해 하려는 행동까지 연결하지 못합니다."),
                    option("C", "I want more leaves.", 33, "이야기 초반의 욕구를 결말의 생각으로 혼동합니다."),
                    option("D", "I do not need Dot.", 0, "친구를 기다리려는 결말의 마음과 반대되는 생각을 선택합니다."),
                ],
                "correct": "A",
            },
            "diagnostics": [{"code": "internal_response_gap", "threshold": 67, "messageKo": "Pip의 말과 우정의 행동을 근거로 속마음을 추론하는 연습이 필요합니다."}],
            "lrs": lrs(6, "internal_response", "option_selected"),
        },
    ]

    quiz = {
        "schemaVersion": "quiz-v3.1",
        "story": {"storyId": "OG0060", "title": "Little Pip's Big Change", "level": "Level 1", "text": story_text, "scenes": scenes},
        "assets": {
            "imageBasePath": "Image/", "audioBasePath": "Audio/", "coverBasePath": "Cover/",
            "backgroundImage": "Image/OG0060_Talking_BG_I.webp", "coverImage": "Cover/OG0060_Cover_L_I.webp",
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
        "generation": {"provider": "codex", "model": "manual-v3-logic", "promptVersion": "story_grammar_v3", "createdAt": "2026-08-14", "notes": "Generated from the supplied OG0060 resources."},
    }
    update_quiz(quiz)
    return quiz


def copy_assets() -> None:
    for folder in [OUT / "Image", OUT / "Audio", OUT / "Cover", OUT / "Assets"]:
        folder.mkdir(parents=True, exist_ok=True)
    for source in sorted((SOURCE / "1080p").glob("OG0060_SC*_I_1920x1080.webp")):
        target_name = source.name.replace("_1920x1080", "")
        shutil.copy2(source, OUT / "Image" / target_name)
    shutil.copy2(SOURCE / "OG0060_Talking_BG_I.webp", OUT / "Image" / "OG0060_Talking_BG_I.webp")
    shutil.copy2(SOURCE / "OG0060_Cover_L_I.webp", OUT / "Cover" / "OG0060_Cover_L_I.webp")
    shutil.copy2(ROOT / "v3" / "Assets" / "BKTK_Characters_Bookey.png", OUT / "Assets" / "BKTK_Characters_Bookey.png")
    for source in sorted(SOURCE.rglob("*_N_A.mp3")):
        shutil.copy2(source, OUT / "Audio" / source.name)


def write_html(quiz: dict) -> None:
    template = (ROOT / "v3" / "OG0044" / "OG0044_ReadingQuiz.html").read_text(encoding="utf-8")
    html = template.replace("The Midnight Visitor Reading Quiz", "Little Pip's Big Change Reading Quiz")
    html = html.replace("Cover/OG0044_Cover_L_I.webp", "Cover/OG0060_Cover_L_I.webp")
    html = html.replace("OG0044_ReadingQuiz.xlsx", "OG0060_ReadingQuiz.xlsx")
    html = html.replace("OG0044_DevSpec.xlsx", "OG0060_DevSpec.xlsx")
    embedded = json.dumps(quiz, ensure_ascii=False, separators=(",", ":"))
    html, count = re.subn(r"const QUIZ = \{.*?\};\r?\nconst bg", lambda _: f"const QUIZ = {embedded};\nconst bg", html, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError("Could not replace embedded quiz JSON")
    (OUT / "OG0060_ReadingQuiz.html").write_text(html, encoding="utf-8")


def main() -> None:
    copy_assets()
    quiz = build_quiz()
    (OUT / "OG0060.quiz.json").write_text(json.dumps(quiz, ensure_ascii=False, indent=2), encoding="utf-8")
    write_html(quiz)
    print(f"Built OG0060 JSON, HTML, and assets in {OUT}")


if __name__ == "__main__":
    main()
