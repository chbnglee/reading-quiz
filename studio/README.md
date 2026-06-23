# Quiz Studio

Quiz Studio is a local/static authoring surface for Story Grammar reading quizzes.

## What it does now

- Loads the canonical OG0021 Quiz v3 JSON sample.
- Lets you paste a new story and generate a rule-based draft.
- Lets you edit instructions, hints, interactions, scoring, diagnostics, and assets.
- Exports:
  - Quiz JSON
  - Reading Quiz XLSX
  - Dev Spec XLSX
  - standalone preview HTML

## Static use

Open `index.html` from the `studio` folder, or open it through GitHub Pages.
Static mode supports sample loading, manual editing, rule-based draft generation, and exports.

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
