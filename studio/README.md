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
  - standalone Reading Quiz HTML
  - Approved ZIP containing JSON, Reading Quiz XLSX, Dev Spec XLSX, Reading Quiz HTML, and matched assets per approved story

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
- `notes`

Each row becomes one quiz draft. The Studio keeps JSON as the working source of truth, then exports the required XLSX files from that JSON.

Do not enter local image/audio paths in the batch sheet. The Studio derives resource names from the story ID and scene/sentence IDs, then matches real files after you use the `Assets` button.

Expected asset filenames:

- Image: `OG0021_SC01_I.png`
- Audio: `OG0021_SC02_ST01_N_A.mp3`
- Cover: `OG0021_Cover_L_I.png`

For visual preview in Studio, use the `Assets` button and select the folder that contains images/audio/cover files. The browser can only access files selected by the user, so an XLSX cell containing `C:\...` or another local path is not enough.

For reopening previous work, load `QuizBatch.json` or an individual `*.quiz.json`. XLSX files are final deliverables for teachers/developers, not the preferred editable source.

## Recommended workflow

1. Click `Format` and download `StoryBatch_Input_Template.xlsx`.
2. Fill one story per row: `story_id`, `title`, `level`, `story_text`, and optional `notes`.
3. Load that Batch XLSX in Studio.
4. Load the asset folder with `Assets` so preview can show images/audio by filename.
5. Enter an API key and run `AI Batch Generate`.
6. Review each story in the batch list, edit details in `Quiz Editor`, then mark approved stories as `Approved`.
7. Click `Export` to download a ZIP. Each approved story folder includes:
   - `{storyId}.quiz.json`
   - `{storyId}_ReadingQuiz.xlsx`
   - `{storyId}_DevSpec.xlsx`
   - `{storyId}_ReadingQuiz.html`
   - matched assets

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
