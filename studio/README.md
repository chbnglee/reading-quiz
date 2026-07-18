# Quiz Studio

Quiz Studio is a static/local authoring surface for one Story Grammar reading quiz at a time.

## Current workflow

1. Upload one story resource folder in `Story Resource`.
2. Check how Studio classified the files.
3. Replace individual files if a TXT, cover, background, scene image, or audio file was misread.
4. Enter an API key and run `AI Generate Quiz`.
5. Review the generated quiz in `Preview` and `Quiz Editor`.
6. Export:
   - Quiz JSON
   - Reading Quiz XLSX
   - Dev Spec XLSX
   - Reading Quiz HTML

AI generation fills the fixed v3 template. It should not change the six-question
order, question types, or Story Grammar mapping:
Q1 Consequence sequencing, Q2 Setting slots, Q3 Initiating Event listening,
Q4 Attempt unscramble, Q5 Reaction emotion, Q6 Internal Response choice.

## Expected resource folder

The recommended folder structure matches the v3 production workflow:

```text
OGxxxx/
  OGxxxx_storytitle.txt
  OGxxxx_Cover_L_I_1920x1080.webp
  OGxxxx_Talking_BG_I.webp
  1080p/
    OGxxxx_SC01_I_1920x1080.webp
    OGxxxx_SC02_I_1920x1080.webp
  OGxxxx_Audio_N_A/
    OGxxxx_SC02_ST01_N_A.mp3
```

`CSxxxx` story codes are also supported.

Studio classifies files by filename pattern:

- Story TXT: `.txt`
- Cover: `{storyId}_Cover_L_I...` or `{storyId}_Cover_P_I...`
- Background: `{storyId}_Talking_BG_I...`
- Scene image: `{storyId}_SC##_I...`
- Audio: `{storyId}_SC##_ST##_N_A.mp3`

Images may be `.webp`, `.png`, `.jpg`, or `.jpeg`. Studio matches assets by normalized filename stem, so `OG0021_SC01_I.webp` and `OG0021_SC01_I_1920x1080.webp` are treated as the same scene asset for preview and export.

## Web/static use

Open `index.html` from the `studio` folder, or open it through GitHub Pages.

On GitHub Pages, AI generation runs directly in the browser using the API key typed into the UI. The key is not stored by Studio, but it is still a client-side call. For production use with shared users, move this behind a server/API proxy.

## Local AI use

AI generation can also run through the local server so API keys are not exposed in the browser.

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
