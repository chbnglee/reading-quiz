import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const ids=["CS0003","CS0006","OG0005","OG0021","OG0036","OG0049"];
const expectedTypes=["story_sequence_drag","setting_slot_drag","listen_scene_mcq","scene_word_unscramble","emotion_mcq","internal_response_mcq"];
const allowed=new Set([0,33,67,100]);
const execFile=promisify(execFileCallback);
const git="C:\\Users\\IM_1783\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\git\\cmd\\git.exe";
for(const id of ids){
  const jsonPath=path.join(root,"v3",id,`${id}.quiz.json`);
  const htmlPath=path.join(root,"v3",id,`${id}_ReadingQuiz.html`);
  const quiz=JSON.parse(await fs.readFile(jsonPath,"utf8"));
  const relativeJson=`v3/${id}/${id}.quiz.json`;
  const {stdout:headText}=await execFile(git,["show",`HEAD:${relativeJson}`],{cwd:root,encoding:"utf8",maxBuffer:10_000_000});
  const headQuiz=JSON.parse(headText);
  if(JSON.stringify(quiz.questions.map(q=>q.type))!==JSON.stringify(expectedTypes))throw Error(`${id}: question types changed`);
  const contentShape=q=>({type:q.type,instruction:q.instruction,hint:q.hint,promptMode:q.interaction.promptMode,correct:q.interaction.correct,items:q.interaction.items,slots:q.interaction.slots,options:(q.interaction.options||[]).map(o=>({key:o.key,text:o.text,isCorrect:o.isCorrect,scene:o.scene}))});
  if(JSON.stringify(quiz.questions.map(contentShape))!==JSON.stringify(headQuiz.questions.map(contentShape)))throw Error(`${id}: question content or options changed`);
  if(quiz.questions.length!==6)throw Error(`${id}: expected six questions`);
  for(const q of quiz.questions){
    if(q.responseRubric.map(r=>r.score).join(",")!=="100,67,33,0")throw Error(`${id} Q${q.number}: invalid rubric`);
    if(q.interaction.options)for(const o of q.interaction.options)if(!allowed.has(o.score))throw Error(`${id} Q${q.number}: invalid option score ${o.score}`);
  }
  const html=await fs.readFile(htmlPath,"utf8");
  const embedded=html.match(/const QUIZ = (\{.*?\});\r?\nconst bg/s);
  if(!embedded)throw Error(`${id}: embedded JSON missing`);
  const embeddedQuiz=JSON.parse(embedded[1]);
  if(JSON.stringify(embeddedQuiz)!==JSON.stringify(quiz))throw Error(`${id}: HTML/JSON mismatch`);
  const script=html.match(/<script>([\s\S]*?)<\/script>/);
  if(!script)throw Error(`${id}: script missing`);
  new Function(script[1]);
}
const rubricHtml=await fs.readFile(path.join(root,"rubric.html"),"utf8");
const rubricScript=rubricHtml.match(/<script>([\s\S]*?)<\/script>/);
if(!rubricScript)throw Error("rubric.html: script missing");
new Function(rubricScript[1]);
if(!rubricHtml.includes("reading_quiz_diagnostic_rubric_v2.xlsx"))throw Error("rubric.html: workbook link missing");
await fs.access(path.join(root,"outputs","reading-quiz-rubric-20260810","reading_quiz_diagnostic_rubric_v2.xlsx"));
console.log(`validated ${ids.length} quizzes: question types/content/options unchanged from HEAD, four-level scores, JSON/HTML parity, JavaScript syntax`);
