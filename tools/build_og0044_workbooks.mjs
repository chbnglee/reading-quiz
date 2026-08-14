import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const quizDir = path.join(root, "v3", "OG0044");
const quiz = JSON.parse(await fs.readFile(path.join(quizDir, "OG0044.quiz.json"), "utf8"));
const previewDir = path.join(root, ".codex-artifact-runtime", "og0044");
await fs.mkdir(previewDir, { recursive: true });

const C = { purple: "#4C1D95", violet: "#6D28D9", lavender: "#EDE9FE", white: "#FFFFFF", ink: "#1F2937", line: "#D8D4E5", green: "#D1FAE5", blue: "#DBEAFE", amber: "#FEF3C7", red: "#FEE2E2", pale: "#F8F7FC" };
const qColor = score => score === 100 ? C.green : score === 67 ? C.blue : score === 33 ? C.amber : C.red;
function col(n) { let v = ""; while (n) { n--; v = String.fromCharCode(65 + n % 26) + v; n = Math.floor(n / 26); } return v; }
function sheet(wb, name) { const s = wb.worksheets.add(name); s.showGridLines = false; return s; }
function title(s, text, subtitle, lastCol) {
  s.getRange(`A1:${lastCol}1`).merge(); s.getRange("A1").values = [[text]];
  s.getRange("A1").format = { fill: C.purple, font: { bold: true, color: C.white, size: 18 }, verticalAlignment: "center" }; s.getRange("A1").format.rowHeight = 34;
  s.getRange(`A2:${lastCol}2`).merge(); s.getRange("A2").values = [[subtitle]];
  s.getRange("A2").format = { fill: C.lavender, font: { italic: true, color: C.purple }, wrapText: true, verticalAlignment: "center" }; s.getRange("A2").format.rowHeight = 32;
}
function table(s, row, headers, rows) {
  const last = col(headers.length);
  s.getRange(`A${row}:${last}${row}`).values = [headers];
  s.getRange(`A${row}:${last}${row}`).format = { fill: C.violet, font: { bold: true, color: C.white }, wrapText: true, verticalAlignment: "center", borders: { preset: "all", style: "thin", color: C.line } };
  if (rows.length) {
    s.getRange(`A${row + 1}:${last}${row + rows.length}`).values = rows;
    s.getRange(`A${row + 1}:${last}${row + rows.length}`).format = { wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: C.line } };
  }
  s.freezePanes.freezeRows(row);
}
function widths(s, list, rows = 80) { list.forEach((w, i) => s.getRangeByIndexes(0, i, rows, 1).format.columnWidthPx = w); }
function styleAll(s, range) { s.getRange(range).format.font = { name: "Aptos", color: C.ink }; }

async function buildReadingWorkbook() {
  const wb = Workbook.create();
  {
    const s = sheet(wb, "QUIZ_LIST"); title(s, "OG0044 Reading Quiz", "The Midnight Visitor · Pre-A1 · Quiz v3 · 6 questions", "H");
    table(s, 4, ["Story ID", "Title", "Level", "Questions", "Scoring", "Response Quality", "Source", "Status"], [["OG0044", quiz.story.title, quiz.story.level, 6, "100 / 67 / 33 / 0", "Accurate / Partial / Related / Unrelated", "Supplied OG0044 story, images, and audio", "Ready"]]);
    s.getRange("A7:H7").merge(); s.getRange("A7").values = [["Fixed v3 blueprint"]]; s.getRange("A7").format = { fill: C.violet, font: { bold: true, color: C.white } };
    const flow = quiz.questions.map(q => [`Q${q.number}`, q.storyGrammar, q.type, q.instruction, q.resources.scene || q.resources.audio?.sceneId || q.resources.images.map(x => x.sceneId).join(" → "), q.assessmentMetadata.cognitiveTarget, q.assessmentMetadata.operationalSkill, q.hint]);
    table(s, 8, ["Question", "Story Grammar", "Question Type", "Instruction", "Scene(s)", "Cognitive Target", "Skill", "Hint"], flow);
    widths(s, [70, 125, 190, 220, 200, 170, 105, 260], 20); styleAll(s, "A1:H14");
  }
  {
    const s = sheet(wb, "QUESTIONS"); title(s, "Question Blueprint", "문항 유형은 기존 v3와 동일하며, OG0044의 실제 장면과 문장을 적용했습니다.", "L");
    const rows = quiz.questions.map(q => {
      const correct = Array.isArray(q.interaction.correct) ? q.interaction.correct.join(" → ") : typeof q.interaction.correct === "object" ? Object.entries(q.interaction.correct).map(([k,v]) => `${k}: ${v}`).join(" / ") : q.interaction.correct;
      const choices = q.interaction.options?.map(o => `${o.key}. ${o.text} [${o.score}]`).join("\n") || q.interaction.items?.map(item => typeof item === "object" ? `${item.slot}: ${item.text}` : item).join("\n") || "";
      return [`Q${q.number}`, q.storyGrammar, q.assessmentMetadata.storyElement, q.assessmentMetadata.cognitiveTarget, q.assessmentMetadata.operationalSkill, q.type, q.instruction, q.hint, q.resources.scene || q.resources.audio?.sceneId || "multiple", choices, correct, q.scoring.reportingFormula || q.scoring.formula];
    });
    table(s, 4, ["Q", "Story Grammar", "Story Element", "Cognitive Target", "Skill", "Type", "Instruction", "Hint", "Scene", "Items / Options [Score]", "Correct", "Scoring Rule"], rows);
    widths(s, [50, 115, 185, 165, 90, 190, 220, 240, 80, 300, 235, 260], 14); styleAll(s, "A1:L10");
  }
  {
    const s = sheet(wb, "ANSWER_SCORING"); title(s, "Answer & Response Quality", "선택형 오답은 의미 유사도가 아니라 이야기 단계, 감정 구체성, 내면 추론 관계에 따라 분류합니다.", "K");
    const rows = [];
    for (const q of quiz.questions) {
      if (q.interaction.options) for (const o of q.interaction.options) rows.push([`Q${q.number}`, q.storyGrammar, o.key, o.text, o.isCorrect ? "Correct" : "Distractor", o.responseQuality, o.score, o.misconceptionType, o.diagnostic || "정확한 이해", o.recommendedActionKo, q.assessmentMetadata.skillTags.join(", ")]);
      else for (const r of q.responseRubric) rows.push([`Q${q.number}`, q.storyGrammar, "—", Array.isArray(q.interaction.correct) ? q.interaction.correct.join(" → ") : JSON.stringify(q.interaction.correct), r.score === 100 ? "Correct" : "Constructed response", r.responseQuality, r.score, r.misconceptionType, r.evidenceRuleKo, r.recommendedActionKo, q.assessmentMetadata.skillTags.join(", ")]);
    }
    table(s, 4, ["Q", "Story Grammar", "Option", "Response", "Role", "Response Quality", "Score", "Misconception", "Evidence / Diagnostic", "Recommended Action", "Skill Tags"], rows);
    rows.forEach((r,i) => { s.getRange(`A${5+i}:K${5+i}`).format.fill = qColor(r[6]); s.getRange(`F${5+i}:G${5+i}`).format.font = { bold: true, color: C.ink }; });
    widths(s, [45, 115, 55, 280, 115, 130, 55, 215, 335, 330, 220], 45); styleAll(s, `A1:K${rows.length+4}`); s.freezePanes.freezeColumns(3);
  }
  {
    const s = sheet(wb, "FEEDBACK"); title(s, "Story Grammar Feedback Matrix", "학생용 피드백과 학부모용 관찰 문장은 문항별 Story Grammar에 맞춰 구분됩니다.", "I");
    const rows = [];
    for (const q of quiz.questions) for (const r of q.responseRubric) rows.push([`Q${q.number}`, q.storyGrammar, q.assessmentMetadata.storyElement, q.assessmentMetadata.operationalSkill, r.responseQuality, r.score, r.studentFeedbackKo, r.parentFeedbackKo, r.recommendedActionKo]);
    table(s, 4, ["Q", "Story Grammar", "Story Element", "Skill", "Response Quality", "Score", "Student Feedback", "Parent Feedback", "Next Action"], rows);
    rows.forEach((r,i) => { s.getRange(`A${5+i}:I${5+i}`).format.fill = qColor(r[5]); s.getRange(`E${5+i}:F${5+i}`).format.font = { bold: true, color: C.ink }; });
    widths(s, [45, 115, 190, 90, 130, 55, 330, 430, 330], 35); styleAll(s, `A1:I${rows.length+4}`); s.freezePanes.freezeColumns(6);
  }
  const file = path.join(quizDir, "OG0044_ReadingQuiz.xlsx"); const out = await SpreadsheetFile.exportXlsx(wb); await out.save(file); return { wb, file, sheets: ["QUIZ_LIST", "QUESTIONS", "ANSWER_SCORING", "FEEDBACK"] };
}

async function buildDevWorkbook() {
  const wb = Workbook.create();
  {
    const s = sheet(wb, "METADATA"); title(s, "OG0044 v3 Development Specification", "Implementation metadata for The Midnight Visitor", "F");
    const rows = [["schemaVersion", quiz.schemaVersion, "Quiz data schema"], ["storyId", quiz.story.storyId, "Stable content ID"], ["title", quiz.story.title, "Display title"], ["level", quiz.story.level, "Curriculum level"], ["questionCount", quiz.questions.length, "Fixed v3 blueprint"], ["scoringRubricVersion", quiz.generation.scoringRubricVersion, "Response Quality rubric"], ["overallFormula", quiz.reporting.overallFormula, "Summary only"], ["validationStatus", quiz.reporting.validationStatus, "Criterion-referenced rules pending empirical review"]];
    table(s, 4, ["Field", "Value", "Purpose"], rows); widths(s, [190, 430, 420], 18); styleAll(s, "A1:F14");
  }
  {
    const s = sheet(wb, "QUESTION_SPEC"); title(s, "Question Implementation Spec", "Interaction, evidence scoring, and LRS mapping", "M");
    const rows = quiz.questions.map(q => [`Q${q.number}`, q.qId, q.type, q.storyGrammar, q.interaction.promptMode, q.resources.scene || q.resources.audio?.sceneId || "multiple", q.resources.audio?.sentenceId || q.resources.sourceSentenceId || "—", q.scoring.type, q.scoring.evidenceFormula || q.scoring.formula, q.lrs.objectId, q.lrs.verb, q.lrs.resultFields.join(", "), q.diagnostics[0].code]);
    table(s, 4, ["Q", "Question ID", "Type", "Story Grammar", "Prompt Mode", "Scene", "Sentence ID", "Scoring Type", "Formula", "LRS Object ID", "Verb", "Result Fields", "Diagnostic Code"], rows);
    widths(s, [45, 145, 190, 120, 145, 75, 150, 220, 310, 240, 75, 360, 210], 14); styleAll(s, "A1:M10");
  }
  {
    const s = sheet(wb, "ASSETS"); title(s, "Asset Manifest", "All paths are relative to the OG0044 quiz directory.", "G");
    const rows = [];
    rows.push(["cover", quiz.assets.coverImage, "Story cover", "webp", "HTML cover screen", "Required", "Present"]);
    rows.push(["background", quiz.assets.backgroundImage, "Quiz background", "webp", "Quiz screen", "Required", "Present"]);
    rows.push(["character", quiz.assets.hintCharacter, "Bookey hint character", "png", "Hint overlay", "Required", "Present"]);
    for (const q of quiz.questions) for (const img of q.resources.images || []) rows.push([`Q${q.number} image`, `Image/${img.path}`, img.sceneId, "webp", q.type, "Required", "Present"]);
    for (const q of quiz.questions) if (q.resources.audio) rows.push([`Q${q.number} audio`, `Audio/${q.resources.audio.path}`, q.resources.audio.sentenceId, "mp3", q.type, "Required", "Present"]);
    table(s, 4, ["Asset Role", "Relative Path", "Scene / Sentence", "Format", "Used By", "Requirement", "Status"], rows);
    widths(s, [120, 300, 160, 70, 210, 100, 85], 30); styleAll(s, `A1:G${rows.length+4}`);
  }
  {
    const s = sheet(wb, "RESPONSE_QUALITY"); title(s, "Response Quality Contract", "The values are operational reporting categories, not calibrated IRT ability estimates.", "H");
    const rows = quiz.assessmentFramework.responseQualities.map(r => [r.responseQuality, r.score, r.key, r.labelKo, r.definitionKo, quiz.assessmentFramework.scoreInterpretation, "Story Element + relationship evidence", "Provisional"]);
    table(s, 4, ["Response Quality", "Score", "Key", "Korean Label", "Definition", "Interpretation", "Classification Basis", "Status"], rows);
    rows.forEach((r,i) => s.getRange(`A${5+i}:H${5+i}`).format.fill = qColor(r[1])); widths(s, [145, 65, 95, 190, 390, 260, 270, 100], 14); styleAll(s, "A1:H10");
  }
  const file = path.join(quizDir, "OG0044_DevSpec.xlsx"); const out = await SpreadsheetFile.exportXlsx(wb); await out.save(file); return { wb, file, sheets: ["METADATA", "QUESTION_SPEC", "ASSETS", "RESPONSE_QUALITY"] };
}

const builds = [await buildReadingWorkbook(), await buildDevWorkbook()];
const reports = [];
for (const build of builds) {
  for (const name of build.sheets) {
    const png = await build.wb.render({ sheetName: name, autoCrop: "all", scale: 0.7, format: "png" });
    const key = `${path.basename(build.file, ".xlsx")}_${name}.png`;
    await fs.writeFile(path.join(previewDir, key), new Uint8Array(await png.arrayBuffer()));
  }
  const sheets = await build.wb.inspect({ kind: "sheet", include: "id,name", maxChars: 4000 });
  const errors = await build.wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, maxChars: 4000 });
  reports.push({ file: build.file, sheets: sheets.ndjson, errors: errors.ndjson });
}
console.log(JSON.stringify({ previewDir, reports }, null, 2));
