from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STORY_ID = "OG0060"
QUIZ_DIR = ROOT / "v3" / STORY_ID
EXPECTED_TYPES = [
    "story_sequence_drag",
    "setting_slot_drag",
    "listen_scene_mcq",
    "scene_word_unscramble",
    "emotion_mcq",
    "internal_response_mcq",
]
EXPECTED_AXES = ["consequence", "setting", "initiating_event", "attempt", "reaction", "internal_response"]


def fail(message: str) -> None:
    raise AssertionError(message)


def main() -> None:
    json_path = QUIZ_DIR / f"{STORY_ID}.quiz.json"
    html_path = QUIZ_DIR / f"{STORY_ID}_ReadingQuiz.html"
    if not json_path.exists():
        fail(f"missing quiz JSON: {json_path}")
    if not html_path.exists():
        fail(f"missing quiz HTML: {html_path}")

    quiz = json.loads(json_path.read_text(encoding="utf-8"))
    story = quiz["story"]
    if (story["storyId"], story["title"], story["level"]) != (STORY_ID, "Little Pip's Big Change", "Level 1"):
        fail("story metadata mismatch")
    if [q["type"] for q in quiz["questions"]] != EXPECTED_TYPES:
        fail("fixed six-question type blueprint changed")
    if [q["storyGrammar"] for q in quiz["questions"]] != EXPECTED_AXES:
        fail("fixed Story Grammar mapping changed")
    for q in quiz["questions"]:
        if [r["score"] for r in q["responseRubric"]] != [100, 67, 33, 0]:
            fail(f"Q{q['number']}: invalid score categories")
        if [r["responseQuality"] for r in q["responseRubric"]] != ["Accurate", "Partial", "Related", "Unrelated"]:
            fail(f"Q{q['number']}: invalid Response Quality labels")

    q1, q2, q3, q4, q5, q6 = quiz["questions"]
    if q1["interaction"]["correct"] != ["SC01", "SC02", "SC06", "SC10", "SC13"]:
        fail("Q1 sequence mismatch")
    if q2["resources"]["scene"] != "SC03" or q2["interaction"]["correct"] != {"who": "pip", "where": "on_leaf", "at_first": "eats_leaf"}:
        fail("Q2 setting mismatch")
    if q3["resources"]["audio"]["sentenceId"] != "SC08_ST04_N" or q3["interaction"]["correct"] != "B":
        fail("Q3 initiating event mismatch")
    if q4["interaction"]["correct"] != ["Pip", "makes", "a", "hard", "little", "house."]:
        fail("Q4 exact attempt sentence mismatch")
    if q5["resources"]["scene"] != "SC13" or q5["interaction"]["correct"] != "A":
        fail("Q5 reaction mismatch")
    if q6["resources"]["scene"] != "SC15" or q6["interaction"]["correct"] != "A":
        fail("Q6 internal response mismatch")

    referenced: list[Path] = []
    for q in quiz["questions"]:
        referenced.extend(Path(quiz["assets"]["imageBasePath"]) / r["path"] for r in q.get("resources", {}).get("images", []))
        audio = q.get("resources", {}).get("audio")
        if audio:
            referenced.append(Path(quiz["assets"]["audioBasePath"]) / audio["path"])
    referenced.extend(Path(x) for x in [quiz["assets"]["coverImage"], quiz["assets"]["backgroundImage"], quiz["assets"]["hintCharacter"]])
    for rel in referenced:
        if not (QUIZ_DIR / rel).exists():
            fail(f"missing referenced asset: {rel}")

    html = html_path.read_text(encoding="utf-8")
    match = re.search(r"const QUIZ = (\{.*?\});\r?\nconst bg", html, re.S)
    if not match or json.loads(match.group(1)) != quiz:
        fail("HTML embedded quiz does not match JSON")
    index = (ROOT / "v3" / "index.html").read_text(encoding="utf-8")
    if f'{STORY_ID}/{STORY_ID}_ReadingQuiz.html' not in index or "Little Pip's Big Change" not in index:
        fail("v3 index card missing")
    for name in [f"{STORY_ID}_ReadingQuiz.xlsx", f"{STORY_ID}_DevSpec.xlsx"]:
        if not (QUIZ_DIR / name).exists():
            fail(f"missing workbook: {name}")
    print("OG0060 v3 validation passed: blueprint, rubric, assets, JSON/HTML parity, index, and workbooks")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"OG0060 v3 validation failed: {exc}", file=sys.stderr)
        raise
