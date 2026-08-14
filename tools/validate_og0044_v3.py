from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STORY_ID = "OG0044"
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
EXPECTED_QUALITIES = ["Accurate", "Partial", "Related", "Unrelated"]


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
    if quiz["story"]["storyId"] != STORY_ID:
        fail("wrong story ID")
    if quiz["story"]["title"] != "The Midnight Visitor":
        fail("wrong story title")
    if quiz["story"]["level"] != "Pre-A1":
        fail("wrong story level")
    if [q["type"] for q in quiz["questions"]] != EXPECTED_TYPES:
        fail("fixed six-question type blueprint changed")
    if [q["storyGrammar"] for q in quiz["questions"]] != EXPECTED_AXES:
        fail("fixed Story Grammar mapping changed")

    for q in quiz["questions"]:
        if [r["score"] for r in q["responseRubric"]] != [100, 67, 33, 0]:
            fail(f"Q{q['number']}: invalid score categories")
        if [r["responseQuality"] for r in q["responseRubric"]] != EXPECTED_QUALITIES:
            fail(f"Q{q['number']}: invalid Response Quality labels")

    q1, q2, q3, q4, q5, q6 = quiz["questions"]
    if q1["interaction"]["correct"] != ["SC02", "SC03", "SC06", "SC12", "SC14"]:
        fail("Q1 story sequence mismatch")
    if q2["resources"]["scene"] != "SC02" or len(q2["interaction"]["items"]) != 6:
        fail("Q2 setting construction mismatch")
    if q3["resources"]["audio"]["sentenceId"] != "SC03_ST01_N":
        fail("Q3 must use the problem-start sentence")
    if q3["interaction"]["correct"] != "B":
        fail("Q3 correct option mismatch")
    if q4["interaction"]["correct"] != ["Poco", "takes", "his flashlight."]:
        fail("Q4 must use the exact attempt sentence")
    if q5["resources"]["scene"] != "SC11" or q5["interaction"]["correct"] != "A":
        fail("Q5 reaction mismatch")
    if q6["resources"]["scene"] != "SC12" or q6["interaction"]["correct"] != "A":
        fail("Q6 internal response mismatch")

    referenced = []
    for q in quiz["questions"]:
        referenced.extend(Path(quiz["assets"]["imageBasePath"]) / r["path"] for r in q.get("resources", {}).get("images", []))
        audio = q.get("resources", {}).get("audio")
        if audio:
            referenced.append(Path(quiz["assets"]["audioBasePath"]) / audio["path"])
    referenced.extend([quiz["assets"]["coverImage"], quiz["assets"]["backgroundImage"], quiz["assets"]["hintCharacter"]])
    for rel in referenced:
        if not (QUIZ_DIR / rel).exists():
            fail(f"missing referenced asset: {rel}")

    html = html_path.read_text(encoding="utf-8")
    match = re.search(r"const QUIZ = (\{.*?\});\r?\nconst bg", html, re.S)
    if not match:
        fail("embedded quiz JSON missing")
    if json.loads(match.group(1)) != quiz:
        fail("HTML embedded quiz does not match JSON")

    index = (ROOT / "v3" / "index.html").read_text(encoding="utf-8")
    if f'{STORY_ID}/{STORY_ID}_ReadingQuiz.html' not in index or "The Midnight Visitor" not in index:
        fail("v3 index card missing")

    for name in [f"{STORY_ID}_ReadingQuiz.xlsx", f"{STORY_ID}_DevSpec.xlsx"]:
        if not (QUIZ_DIR / name).exists():
            fail(f"missing workbook: {name}")

    print("OG0044 v3 validation passed: fixed blueprint, Response Quality, assets, JSON/HTML parity, index, workbooks")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"OG0044 v3 validation failed: {exc}", file=sys.stderr)
        raise
