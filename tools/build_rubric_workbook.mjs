import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outputDir = path.join(root, "outputs", "reading-quiz-rubric-20260810");
const outputFile = path.join(outputDir, "reading_quiz_diagnostic_rubric_v3.xlsx");
const previewDir = path.join(outputDir, "previews-v3");
const ids = ["CS0003", "CS0006", "OG0005", "OG0021", "OG0036", "OG0049"];
const quizzes = await Promise.all(ids.map(async id => JSON.parse(await fs.readFile(path.join(root, "v3", id, `${id}.quiz.json`), "utf8"))));

if (process.argv.includes("--inspect-existing")) {
  const input = await FileBlob.load(outputFile);
  const existing = await SpreadsheetFile.importXlsx(input);
  const qaDir = path.join(root, ".codex-artifact-runtime", "current-workbook");
  await fs.mkdir(qaDir, { recursive: true });
  const sheetNames = ["Overview", "Response Quality", "Question Rubric", "Feedback Matrix", "Option Diagnostics", "Profile Calculator", "LRS & Validation"];
  for (const name of sheetNames) {
    const png = await existing.render({ sheetName: name, autoCrop: "all", scale: .75, format: "png" });
    await fs.writeFile(path.join(qaDir, `${name.replaceAll(" ", "_")}.png`), new Uint8Array(await png.arrayBuffer()));
  }
  const summary = await existing.inspect({ kind: "sheet", include: "id,name", maxChars: 4000 });
  const feedback = await existing.inspect({ kind: "region", sheetId: "Feedback Matrix", range: "A1:J12", maxChars: 6000 });
  console.log(JSON.stringify({ qaDir, summary: summary.ndjson, feedback: feedback.ndjson }, null, 2));
  process.exit(0);
}

const wb = Workbook.create();
const COLORS = { purple: "#4C1D95", violet: "#6D28D9", lavender: "#EDE9FE", line: "#D9D9E3", green: "#D1FAE5", blue: "#DBEAFE", amber: "#FEF3C7", red: "#FEE2E2", white: "#FFFFFF", ink: "#1F2937", muted: "#6B7280" };

function addSheet(name) {
  const s = wb.worksheets.add(name);
  s.showGridLines = false;
  return s;
}
function title(s, text, subtitle, lastCol) {
  s.getRange(`A1:${lastCol}1`).merge();
  s.getRange("A1").values = [[text]];
  s.getRange("A1").format = { fill: COLORS.purple, font: { bold: true, color: COLORS.white, size: 18 }, verticalAlignment: "center" };
  s.getRange("A1").format.rowHeight = 34;
  s.getRange(`A2:${lastCol}2`).merge();
  s.getRange("A2").values = [[subtitle]];
  s.getRange("A2").format = { fill: COLORS.lavender, font: { color: COLORS.purple, italic: true }, wrapText: true, verticalAlignment: "center" };
  s.getRange("A2").format.rowHeight = 34;
}
function writeTable(s, startRow, headers, rows) {
  const lastCol = colName(headers.length);
  s.getRange(`A${startRow}:${lastCol}${startRow}`).values = [headers];
  s.getRange(`A${startRow}:${lastCol}${startRow}`).format = { fill: COLORS.violet, font: { bold: true, color: COLORS.white }, wrapText: true, verticalAlignment: "center", borders: { preset: "all", style: "thin", color: COLORS.line } };
  if (rows.length) {
    s.getRange(`A${startRow + 1}:${lastCol}${startRow + rows.length}`).values = rows;
    s.getRange(`A${startRow + 1}:${lastCol}${startRow + rows.length}`).format = { wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: COLORS.line } };
  }
  s.freezePanes.freezeRows(startRow);
}
function colName(n) { let out = ""; while (n) { n--; out = String.fromCharCode(65 + n % 26) + out; n = Math.floor(n / 26); } return out; }
function qualityColor(score) { return score === 100 ? COLORS.green : score === 67 ? COLORS.blue : score === 33 ? COLORS.amber : COLORS.red; }
function qualityName(score) { return score === 100 ? "Accurate" : score === 67 ? "Partial" : score === 33 ? "Related" : "Unrelated"; }

// 1. Overview
{
  const s = addSheet("Overview");
  title(s, "Story Comprehension Assessment & Rubric", "기존 6개 문항 유형은 유지하고 Response Quality / feedback metadata만 개정 · v2.0", "H");
  s.getRange("A4:H4").merge(); s.getRange("A4").values = [["핵심 원칙"]]; s.getRange("A4").format = { fill: COLORS.violet, font: { bold: true, color: COLORS.white } };
  const principles = [
    ["평가 축", "Story Element × Cognitive Process × Response Quality"],
    ["응답 점수", "100 / 67 / 33 / 0의 4단계 준거참조형 보고점수"],
    ["총점", "6개 문항 보고점수의 산술평균(반올림)"],
    ["피드백", "총점만이 아니라 가장 낮은 기능과 선택 오개념에서 생성"],
    ["제한", "표준화 검사·IRT 능력점수가 아니며, 6문항 1회로 전체 읽기 능력을 확정하지 않음"],
  ];
  s.getRange("A5:B9").values = principles; s.getRange("A5:B9").format = { wrapText: true, verticalAlignment: "top", borders: { preset: "all", style: "thin", color: COLORS.line } };
  for (let row=5; row<=9; row++) s.getRange(`B${row}:H${row}`).merge();
  s.getRange("A11:H11").merge(); s.getRange("A11").values = [["5단계 운영 흐름"]]; s.getRange("A11").format = { fill: COLORS.violet, font: { bold: true, color: COLORS.white } };
  s.getRange("A12:H12").values = [["1. Story Grammar", "→", "2. Cognitive Demand", "→", "3. Response Quality", "→", "4. Skill Profile", "→ Feedback / Action"]];
  s.getRange("A12:H12").format = { fill: "#F5F3FF", font: { bold: true, color: COLORS.purple }, horizontalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: COLORS.line } };
  s.getRange("A14:H14").merge(); s.getRange("A14").values = [["전체 구간(요약값)"]]; s.getRange("A14").format = { fill: COLORS.violet, font: { bold: true, color: COLORS.white } };
  writeTable(s, 15, ["구간", "점수", "해석", "학생 피드백", "학부모 관찰", "다음 활동", "사용 원칙", "주의"], [
    ["통합적 이해", "80–100", "핵심 정보와 관계를 안정적으로 연결", "중요한 이야기 정보를 잘 연결했어요.", "가장 낮은 기능에서도 근거 설명이 가능한지 확인", "근거 말하기 / 다음 이야기", "강점+취약 기능 함께 제시", "총점만으로 상위 능력 확정 금지"],
    ["발달 중", "60–79", "주요 사건 이해, 관계 보완 필요", "주요 사건을 이해했어요. 이제 왜 일어났는지 확인해요.", "원인·결과 또는 내면 추론 확인", "Cause & Effect 활동", "최저 기능 중심", "일괄 재읽기 지시 금지"],
    ["부분적 이해", "40–59", "관련 장면 기억, 구조 연결 불완전", "일부 장면을 기억했어요.", "인물·문제·행동·결과 재구성", "Story Map", "오개념을 구체화", "주의집중·언어 요인도 고려"],
    ["기초 지원", "0–39", "핵심 이해 증거 부족", "중요한 부분을 함께 다시 찾아봐요.", "재읽기 후 반응 변화 확인", "재읽기→핵심어→Story Map→재퀴즈", "지원 후 재평가", "전체 읽기 능력으로 일반화 금지"],
  ]);
  s.getRange("A1:H22").format.font = { name: "Aptos" };
  [150, 130, 170, 230, 220, 210, 180, 220].forEach((w,i)=>s.getRangeByIndexes(0,i,22,1).format.columnWidthPx=w);
}

// 2. Response Quality
{
  const s = addSheet("Response Quality");
  title(s, "공통 4단계 Response Quality", "숫자 Level 대신 이해 증거의 질을 Accurate / Partial / Related / Unrelated로 표시", "H");
  const rows = quizzes[0].assessmentFramework.responseQualities.map(q => [q.responseQuality, q.score, q.key, q.labelKo, q.definitionKo, q.score===100?"핵심 요소+관계 정확":q.score===67?"핵심 보존+일부 불완전":q.score===33?"관련 요소 인식+관계 오해":"무응답·무관·증거 없음", q.score===100?"확장":q.score===67?"단서 확인":q.score===33?"관계 재구성":"재읽기·공동 탐색", "운영 점수(미보정)"]);
  writeTable(s, 4, ["Response Quality", "Score", "Key", "한국어 해석", "정의", "판정 핵심", "후속 원칙", "측정 상태"], rows);
  rows.forEach((r,i)=>{s.getRange(`A${5+i}:H${5+i}`).format.fill=qualityColor(r[1]);s.getRange(`A${5+i}:B${5+i}`).format.font={bold:true,color:COLORS.ink};});
  s.freezePanes.freezeColumns(2);
  [145,70,95,175,330,210,170,160].forEach((w,i)=>s.getRangeByIndexes(0,i,12,1).format.columnWidthPx=w);
}

// 3. Question rubric
{
  const s = addSheet("Question Rubric");
  title(s, "문항별 채점·진단 기준", "문항 유형·질문·선택지는 변경하지 않음", "N");
  const rows=[];
  for (const q of quizzes[0].questions) for (const r of q.responseRubric) { const currentScores=q.interaction.options?new Set(quizzes.flatMap(z=>z.questions[q.number-1].interaction.options.map(o=>o.score))):new Set([0,33,67,100]); rows.push([
    `Q${q.number}`, q.type, q.storyGrammar, q.assessmentMetadata.storyElement, q.assessmentMetadata.cognitiveTarget, q.assessmentMetadata.operationalSkill,
    q.assessmentMetadata.skillTags.join(", "), r.responseQuality, r.score, currentScores.has(r.score)?"현재 가능":"예비 기준(현재 선택지 없음)", r.labelKo, r.evidenceRuleKo, r.misconceptionType, r.recommendedActionKo
  ]); }
  writeTable(s,4,["문항","유형","Story Grammar","Story Element","Cognitive Target","Operational Skill","Skill Tags","Response Quality","Score","현재 적용","해석","증거 규칙","오개념 유형","추천 활동"],rows);
  rows.forEach((r,i)=>{s.getRange(`A${5+i}:N${5+i}`).format.fill=qualityColor(r[8]);s.getRange(`H${5+i}:I${5+i}`).format.font={bold:true,color:COLORS.ink};});
  s.freezePanes.freezeColumns(3);
  [55,170,105,190,150,105,210,130,60,155,160,250,190,310].forEach((w,i)=>s.getRangeByIndexes(0,i,rows.length+5,1).format.columnWidthPx=w);
}

// 4. Feedback matrix
{
  const s=addSheet("Feedback Matrix");
  title(s,"학생·학부모 피드백 매트릭스","각 Story Grammar × Response Quality에 맞춘 대상별 진단 문장과 다음 활동","I");
  s.getRange("A4:I4").values=[["100","67","33","0","색상 범례","학생용","친근하고 행동 중심","학부모용","관찰 가능한 이해 증거 중심"]];
  s.getRange("A4").format.fill=COLORS.green;s.getRange("B4").format.fill=COLORS.blue;s.getRange("C4").format.fill=COLORS.amber;s.getRange("D4").format.fill=COLORS.red;
  s.getRange("A4:I4").format.wrapText=true;s.getRange("A4:I4").format.font={bold:true,color:COLORS.ink};s.getRange("A4:I4").format.verticalAlignment="center";
  const rows=[];
  for(const q of quizzes[0].questions) for(const r of q.responseRubric) rows.push([`Q${q.number}`,q.storyGrammar,q.assessmentMetadata.storyElement,q.assessmentMetadata.operationalSkill,r.responseQuality,r.score,r.studentFeedbackKo,r.parentFeedbackKo,r.recommendedActionKo]);
  writeTable(s,6,["문항","Story Grammar","Story Element","기능","Response Quality","Score","학생 피드백","학부모 피드백","다음 활동"],rows);
  rows.forEach((r,i)=>{const row=7+i;s.getRange(`A${row}:I${row}`).format.fill=qualityColor(r[5]);s.getRange(`E${row}:F${row}`).format.font={bold:true,color:COLORS.ink};if(i%4===0)s.getRange(`A${row}:I${row}`).format.borders={top:{style:"medium",color:COLORS.purple}};});
  s.freezePanes.freezeRows(6);s.freezePanes.freezeColumns(6);
  [55,115,190,95,130,60,330,420,330].forEach((w,i)=>s.getRangeByIndexes(0,i,rows.length+7,1).format.columnWidthPx=w);
}

// 5. Option diagnostics
{
  const s=addSheet("Option Diagnostics");
  title(s,"Q3·Q5·Q6 선택지 진단","어떤 오답을 선택했는지를 오개념과 후속 활동으로 연결","L");
  const rows=[];
  for(const quiz of quizzes) for(const n of [3,5,6]) { const q=quiz.questions[n-1]; for(const o of q.interaction.options) rows.push([quiz.story.storyId,quiz.story.title,`Q${n}`,q.storyGrammar,o.key,o.text,o.isCorrect?"정답":"오답",o.responseQuality,o.score,o.misconceptionType,o.diagnostic||"핵심 요소와 관계를 정확히 연결",o.recommendedActionKo]); }
  writeTable(s,4,["Story ID","Title","문항","영역","선택지","내용","정오","Response Quality","Score","오개념 유형","진단 근거","추천 활동"],rows);
  rows.forEach((r,i)=>{s.getRange(`A${5+i}:L${5+i}`).format.fill=qualityColor(r[8]);s.getRange(`H${5+i}:I${5+i}`).format.font={bold:true,color:COLORS.ink};});
  s.freezePanes.freezeColumns(5);
  [85,210,55,110,55,260,65,130,55,210,340,320].forEach((w,i)=>s.getRangeByIndexes(0,i,rows.length+5,1).format.columnWidthPx=w);
}

// 6. Profile calculator
{
  const s=addSheet("Profile Calculator");
  title(s,"학생 프로파일 계산 예시","노란 셀에 각 문항의 보고점수(0/33/67/100)를 입력하면 전체 구간과 우선 피드백이 계산됩니다.","H");
  writeTable(s,4,["문항","Story Grammar","기능","입력 점수","Response Quality","해석","오개념/메모","추천 활동"],quizzes[0].questions.map(q=>[`Q${q.number}`,q.storyGrammar,q.assessmentMetadata.operationalSkill,100,"", "", "", q.responseRubric[0].recommendedActionKo]));
  s.getRange("D5:D10").format.fill="#FFF2CC";
  s.getRange("D5:D10").dataValidation={rule:{type:"list",values:[0,33,67,100]}};
  s.getRange("E5").formulas=[["=IF(D5=100,\"Accurate\",IF(D5=67,\"Partial\",IF(D5=33,\"Related\",\"Unrelated\")))"]]; s.getRange("E5:E10").fillDown();
  s.getRange("F5").formulas=[["=IF(D5=100,\"정확한 이해\",IF(D5=67,\"부분 이해\",IF(D5=33,\"관련 요소 인식·관계 오해\",\"관련 없는 응답·이해 증거 없음\")))"]]; s.getRange("F5:F10").fillDown();
  s.getRange("A12:C12").values=[["전체 점수","구간","해석 원칙"]]; s.getRange("A12:C12").format={fill:COLORS.violet,font:{bold:true,color:COLORS.white},borders:{preset:"all",style:"thin",color:COLORS.line}};
  s.getRange("A13").formulas=[["=ROUND(AVERAGE(D5:D10),0)"]];
  s.getRange("B13").formulas=[["=IF(A13>=80,\"통합적 이해\",IF(A13>=60,\"발달 중\",IF(A13>=40,\"부분적 이해\",\"기초 지원\")))"]];
  s.getRange("C13").values=[["총점은 요약값입니다. 가장 낮은 기능과 선택 오개념을 함께 확인하세요."]];
  s.getRange("C13:H13").merge();
  s.getRange("A13:C13").format={fill:"#F5F3FF",font:{bold:true,color:COLORS.purple},wrapText:true,borders:{preset:"all",style:"thin",color:COLORS.line}};
  s.freezePanes.freezeColumns(4);
  [70,125,110,85,135,210,250,310].forEach((w,i)=>s.getRangeByIndexes(0,i,16,1).format.columnWidthPx=w);
}

// 7. LRS and sources
{
  const s=addSheet("LRS & Validation");
  title(s,"LRS 데이터·타당도 검토 계획","점수와 진단 정보를 분리해 저장하고, 축적 데이터로 규칙을 검토","H");
  writeTable(s,4,["Field","예시","용도","필수","개인정보 주의","검증 질문","검토 주기","비고"],[
    ["story_id","OG0005","콘텐츠 식별","Y","낮음","콘텐츠 간 난이도 차이?","분기",""],
    ["question_id","OG0005_V3_Q04","문항 식별","Y","낮음","문항별 분포 안정성?","분기",""],
    ["story_element","Attempt","무엇을 평가","Y","낮음","내용 대표성?","연 1회",""],
    ["cognitive_skill","Sequence","어떤 사고 기능","Y","낮음","기능별 충분한 문항 수?","분기",""],
    ["student_answer","word order","원응답","Y","높음","응답 저장 최소화?","상시","가명 ID 권장"],
    ["evidence_raw",75,"구조적 증거","Y","낮음","보고수준과 일관?","월",""],
    ["response_quality","Partial","Accurate/Partial/Related/Unrelated","Y","낮음","교사 판정과 일치?","분기","숫자 Level 미표시"],
    ["weighted_score",67,"보고점수","Y","낮음","경계값 적절성?","분기","미보정 점수"],
    ["misconception_type","local_action_order_gap","오개념","Y","낮음","오답 선택과 실제 사고 일치?","분기","표본 면담 권장"],
    ["recommended_action","Rebuild action sentence","후속 학습","Y","낮음","활동 후 향상?","분기",""],
  ]);
  s.getRange("A17:H17").merge();s.getRange("A17").values=[["권위 자료와 적용 범위"]];s.getRange("A17").format={fill:COLORS.violet,font:{bold:true,color:COLORS.white}};
  writeTable(s,18,["자료","핵심 기여","현재 적용","정당화하지 않는 것","링크","우선순위","검토","메모"],[
    ["Stein & Glenn","이야기 정보 구조·회상","Story Element 구조화","전체 읽기 이해의 단독 설명","https://eric.ed.gov/?id=ED121474","A","연 1회",""],
    ["Black & Wilensky","Story Grammar 한계","단일 기준 사용 금지","Story Grammar 폐기","https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog0303_2","A","연 1회",""],
    ["NAEP 2026","통합·해석·분석 과정","Cognitive Target 태그","현재 점수 경계값","https://www.nagb.gov/naep-subject-areas/reading/framework-archive/2026-reading-framework.html","A","개정 시",""],
    ["AERA/APA/NCME Standards","점수 해석·사용의 타당도","검증 계획·제한 명시","도구 자체의 타당화","https://www.testingstandards.net/open-access-files.html","A","연 1회",""],
    ["ETS Distractor Analysis","오답 선택의 정보성","선택지별 오개념 코딩","특정 오답의 33/67 자동 정당화","https://www.ets.org/research/policy_research_reports/publications/report/2019/kbgc.html","B","분기",""],
    ["Masters PCM","순서형 부분점수 모형","향후 데이터 단계 참고","현 점수의 IRT 보정","https://www.cambridge.org/core/journals/psychometrika/article/abs/rasch-model-for-partial-credit-scoring/D7202CB6D2D1593889B1318DD6297E01","C","데이터 충분 시",""],
  ]);
  [150,190,170,75,170,300,100,180].forEach((w,i)=>s.getRangeByIndexes(0,i,30,1).format.columnWidthPx=w);
}

await fs.mkdir(outputDir,{recursive:true});
await fs.mkdir(previewDir,{recursive:true});
const out=await SpreadsheetFile.exportXlsx(wb);await out.save(outputFile);
for(const name of ["Overview","Response Quality","Question Rubric","Feedback Matrix","Option Diagnostics","Profile Calculator","LRS & Validation"]){const png=await wb.render({sheetName:name,autoCrop:"all",scale:.75,format:"png"});await fs.writeFile(path.join(previewDir,`${name.replaceAll(" ","_")}.png`),new Uint8Array(await png.arrayBuffer()));}
const inspection=await wb.inspect({kind:"sheet",include:"id,name",maxChars:4000});
const formulaCheck=await wb.inspect({kind:"formula",sheetId:"Profile Calculator",range:"A1:H16",maxChars:4000,options:{maxResults:30}});
const errorCheck=await wb.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",options:{useRegex:true,maxResults:100},maxChars:4000});
console.log(JSON.stringify({outputFile,inspection:inspection.ndjson,formulaCheck:formulaCheck.ndjson,errorCheck:errorCheck.ndjson},null,2));
