# Quiz Studio

Quiz Studio is a local/static authoring surface for Story Grammar reading quizzes.

## What it does now

- Loads the canonical OG0021 Quiz v3 JSON sample.
- Lets you paste a new story and generate a rule-based draft.
- Lets you load a batch XLSX/JSON file with many stories.
- Generates rule-based draft quiz JSON for each batch row.
- Lets reviewers move through a batch queue, edit one quiz at a time, and mark items `Needs Review` or `Approved`.
- Lets you edit instructions, hints, interactions, scoring, diagnostics, and assets.
- Exports:
  - Quiz JSON
  - Batch JSON
  - Reading Quiz XLSX
  - Dev Spec XLSX
  - standalone preview HTML
  - Approved ZIP containing JSON, Reading Quiz XLSX, Dev Spec XLSX, and preview HTML per approved story

## Static use

Open `index.html` from the `studio` folder, or open it through GitHub Pages.
Static mode supports sample loading, batch input loading, manual editing, rule-based draft generation, review status updates, and exports.

## Batch input format

Use the `Batch Template XLSX` button in the Studio UI.

The `INPUT` sheet supports these columns:

- `story_id`
- `title`
- `level`
- `story_text`
- `image_base_path`
- `audio_base_path`
- `cover_base_path`
- `background_image`
- `hint_character`
- `status`
- `notes`

Each row becomes one quiz draft. The Studio keeps JSON as the working source of truth, then exports the required XLSX files from that JSON.

## Local AI use

AI generation should run through the local server so API keys are not exposed in the browser.

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` or `GEMINI_API_KEY`.
2. Run:

```powershell
python app.py
```

3. Open:

```text
http://127.0.0.1:5177/
```

The local server accepts OpenAI or Gemini as the provider and returns quiz JSON in the same `quiz-v3.0` format.
