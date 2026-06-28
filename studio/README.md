# Quiz Studio

Quiz Studio is a local/static authoring surface for Story Grammar reading quizzes.

## What it does now

- Loads the canonical OG0021 Quiz v3 JSON sample.
- Lets you load a batch XLSX/JSON file with many stories.
- Generates AI draft quiz JSON for each batch row through the local server.
- Lets you load local image/audio folders so previews can show real assets by filename.
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
Static mode supports sample loading, batch input loading, manual editing, review status updates, local asset preview mapping, and exports.

AI batch generation requires the local server because API keys should not be sent from a public GitHub Pages page.

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

Asset path columns are used for exported metadata. They do not grant browser access to local files by themselves.
For visual preview in Studio, use the `Assets` button and select the folder that contains images/audio.
Studio matches files by filename, for example `OG0021_SC01_I.png` or `OG0021_SC02_ST01_N_A.mp3`.

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
