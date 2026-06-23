# Story Grammar Quiz v3 Generation Prompt

You are generating a draft reading quiz for a young English learner.

Return ONLY valid JSON that follows `quiz-v3.0`.
Do not wrap the JSON in Markdown.
Do not add comments.

## Goal

Create exactly 6 quiz questions.
Each question must map to exactly one Story Grammar axis:

1. `setting`
2. `initiating_event`
3. `attempt`
4. `reaction`
5. `internal_response`
6. `consequence`

Do not create Synthesis or a seventh question.

The question order may follow the story flow. The six axes must all be included once.

## Input

The user provides:

- `storyId`
- `title`
- `level`
- story text split by scene codes such as `SC01_ST01_N`
- available image filenames such as `{storyId}_SC01_I.png`
- available audio filenames such as `{storyId}_SC02_ST01_N_A.mp3`

Use only `_N` story sentences as source text.
Ignore `_E` and `_D` versions if present.

## Required Design Principles

- The quiz should feel like a digital activity, not a paper test.
- Use no more than 3 plain multiple-choice questions.
- Prefer varied interactions:
  - scene sequencing
  - setting slot fill
  - listening scene choice
  - scene-based word unscramble
  - emotion choice
  - internal response choice
- Keep learner-facing instructions short, direct, and A1-friendly.
- Hints must be short A1-level English.
- Hints should guide thinking, not reveal the answer directly.
- Use story sentences exactly for word unscramble questions.
- Use image and audio filenames that match the provided assets.

## Scoring Rules

Every question score is 0-100.

For `story_sequence_drag`:

- Use weighted position-distance scoring.
- Important anchor scenes should have higher weight.
- Adjacent placement may receive partial credit.
- Far placement should receive little or no credit.

For `setting_slot_drag`:

- Give full credit for exact slot-card match.
- Give partial credit when the card belongs to the same category but is not the best answer.
- Give 0 for wrong category.

For fixed-option questions:

- Each option has its own score.
- Correct option is 100.
- Plausible distractors may receive partial scores.
- Implausible or reversed understanding receives low or 0 score.

For `scene_word_unscramble`:

- Use exact-position weighted scoring.
- Do not give distance-based partial credit; word order errors should show sentence-structure weakness.
- Heavier weights should go to the actor/action/result words.

## Diagnostics

For each incorrect or partial option, include a short Korean diagnostic.
Diagnostics should explain the likely comprehension gap, not only say "wrong".

## Reporting

The report uses only the 6 Story Grammar axes.
Overall score is:

`overall = average(setting, initiating_event, attempt, reaction, internal_response, consequence)`

Parent feedback should be Korean and actionable.

## Output

Return a single JSON object with:

- `schemaVersion`: `quiz-v3.0`
- `story`
- `assets`
- `storyGrammarAxes`
- `questions`
- `reporting`
- `generation`
