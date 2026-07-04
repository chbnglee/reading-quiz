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

## Required JSON Shape

Every question object MUST include all of these fields:

- `qId`
- `number`
- `type`
- `storyGrammar`
- `instruction`
- `hint`
- `resources`
- `interaction`
- `scoring`
- `diagnostics`
- `lrs`

Do not return hint-only questions. A question is incomplete if it does not have an instruction, resources, interaction items/options, and scoring components.

Use this shape for each question:

```json
{
  "qId": "OG0000_V3_Q01",
  "number": 1,
  "type": "story_sequence_drag",
  "storyGrammar": "consequence",
  "instruction": "Put the story scenes in order.",
  "hint": "Think about the story from start to end.",
  "resources": {
    "images": [
      { "id": "SC01", "path": "OG0000_SC01_I.png", "kind": "image", "sceneId": "SC01" }
    ]
  },
  "interaction": {
    "promptMode": "drag_sequence",
    "items": ["SC01", "SC02", "SC03", "SC04", "SC05"],
    "correct": ["SC01", "SC02", "SC03", "SC04", "SC05"]
  },
  "scoring": {
    "type": "weighted_position",
    "maxScore": 100,
    "formula": "score = round(sum(weight_i * max(0, 1 - abs(placed_pos_i - correct_pos_i) * 0.5)) / sum(weights) * 100)",
    "components": [
      { "key": "SC01", "weight": 2.5, "rule": "position_distance", "correctValue": 1, "rationale": "Opening anchor scene." }
    ]
  },
  "diagnostics": [
    { "code": "sequence_gap", "threshold": 70, "messageKo": "사건의 흐름을 다시 확인하는 연습이 필요합니다." }
  ],
  "lrs": {
    "verb": "answered",
    "objectId": "quiz_OG0000_v3_Q01_consequence",
    "resultFields": ["score_raw", "hint_used"]
  }
}
```

For multiple-choice questions, `interaction.options` MUST contain at least 4 options. Each option MUST include:

- `key`
- `text`
- `score`
- `isCorrect`
- `diagnostic` for incorrect or partial options

For slot/drag/unscramble questions, `interaction.items` and `interaction.correct` or `interaction.slots` MUST be filled.

For every question, `scoring.components` MUST contain the weights and rules needed to calculate the score.
