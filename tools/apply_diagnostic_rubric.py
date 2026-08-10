from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML_GLOB = "v3/*/*_ReadingQuiz.html"

LEVELS = [
    {
        "level": 3,
        "score": 100,
        "key": "full",
        "labelEn": "Full understanding",
        "labelKo": "정확한 이해",
        "definitionKo": "문항이 요구하는 핵심 Story Element와 관계를 정확히 이해한 증거가 있습니다.",
    },
    {
        "level": 2,
        "score": 67,
        "key": "partial",
        "labelEn": "Partial understanding",
        "labelKo": "부분 이해",
        "definitionKo": "핵심 정보는 파악했지만 순서·관계·세부 단서 일부가 불완전합니다.",
    },
    {
        "level": 1,
        "score": 33,
        "key": "related",
        "labelEn": "Related but misunderstood",
        "labelKo": "관련 정보 인식·관계 오해",
        "definitionKo": "이야기의 관련 요소는 인식했지만 질문이 요구한 핵심 관계를 잘못 연결했습니다.",
    },
    {
        "level": 0,
        "score": 0,
        "key": "none",
        "labelEn": "No evidence",
        "labelKo": "이해 증거 없음",
        "definitionKo": "응답하지 않았거나 문항의 핵심 이해를 뒷받침하는 증거가 없습니다.",
    },
]

QUESTION_META = {
    "story_sequence_drag": {
        "storyElement": "Consequence / Event sequence",
        "cognitiveTarget": "Integrate and Interpret",
        "operationalSkill": "Sequence",
        "skillTags": ["Story Structure", "Sequence", "Cause & Effect"],
        "misconceptions": {67: "local_sequence_gap", 33: "event_relation_confusion", 0: "no_sequence_evidence"},
        "actions": {
            100: "다음 이야기로 이동하거나 사건의 원인과 결과를 말로 설명합니다.",
            67: "처음과 마지막 장면을 고정하고, 흔들린 중간 장면 두 개의 앞뒤를 다시 확인합니다.",
            33: "Story Map에서 처음-문제-행동-결과를 연결한 뒤 다시 배열합니다.",
            0: "이야기를 다시 읽고 핵심 장면을 한 장씩 말한 뒤 재시도합니다.",
        },
    },
    "setting_slot_drag": {
        "storyElement": "Setting",
        "cognitiveTarget": "Locate and Recall",
        "operationalSkill": "Identify",
        "skillTags": ["Story Structure", "Setting", "Locate & Recall"],
        "misconceptions": {67: "one_setting_element_gap", 33: "setting_element_confusion", 0: "no_setting_evidence"},
        "actions": {
            100: "첫 장면의 인물·장소·처음 상황을 한 문장으로 설명합니다.",
            67: "틀린 한 요소를 첫 장면에서 다시 찾아 표시합니다.",
            33: "Who / Where / At first를 색으로 나누어 Story Map에 적습니다.",
            0: "첫 장면을 다시 보고 인물부터 함께 찾은 뒤 장소와 상황으로 확장합니다.",
        },
    },
    "listen_scene_mcq": {
        "storyElement": "Initiating Event / Problem",
        "cognitiveTarget": "Integrate and Interpret",
        "operationalSkill": "Connect",
        "skillTags": ["Story Structure", "Problem", "Cause & Effect", "Listening"],
        "misconceptions": {67: "partial_problem_relation", 33: "story_phase_confusion", 0: "no_problem_evidence"},
        "actions": {
            100: "문제가 시작된 까닭과 다음 사건을 연결해 말합니다.",
            67: "문제의 단서는 찾았으므로, 그 단서가 어떤 변화를 일으켰는지 확인합니다.",
            33: "배경·문제 시작·결과·해결 장면을 네 칸으로 나누어 비교합니다.",
            0: "오디오를 다시 듣고 ‘처음 큰 변화’가 생기는 장면을 함께 찾습니다.",
        },
    },
    "scene_word_unscramble": {
        "storyElement": "Attempt",
        "cognitiveTarget": "Integrate and Interpret",
        "operationalSkill": "Sequence",
        "skillTags": ["Story Structure", "Attempt", "Sequence"],
        "misconceptions": {67: "local_action_order_gap", 33: "action_relation_confusion", 0: "no_action_evidence"},
        "actions": {
            100: "인물의 행동이 문제 해결에 어떻게 연결되는지 말합니다.",
            67: "유지된 문장 덩어리는 그대로 두고, 흔들린 어절의 위치만 다시 확인합니다.",
            33: "그림을 보고 ‘누가-무엇을 했다’를 먼저 말한 뒤 문장을 다시 배열합니다.",
            0: "핵심 인물과 행동어를 먼저 찾고 짧은 구로 묶어 재시도합니다.",
        },
    },
    "emotion_mcq": {
        "storyElement": "Reaction",
        "cognitiveTarget": "Integrate and Interpret",
        "operationalSkill": "Infer",
        "skillTags": ["Character State", "Emotion", "Inference"],
        "misconceptions": {67: "emotion_specificity_confusion", 33: "story_phase_emotion_confusion", 0: "no_emotion_evidence"},
        "actions": {
            100: "감정을 뒷받침하는 장면 단서를 한 가지 말합니다.",
            67: "감정의 방향은 맞았으므로 표정·사건 단서로 정확한 감정어를 구분합니다.",
            33: "현재 장면과 다른 장면의 감정을 비교하고, 언제 감정이 바뀌었는지 찾습니다.",
            0: "현재 장면의 사건과 표정을 다시 보고 긍정·부정 감정부터 구분합니다.",
        },
    },
    "internal_response_mcq": {
        "storyElement": "Internal Response / Motivation",
        "cognitiveTarget": "Integrate and Interpret",
        "operationalSkill": "Infer",
        "skillTags": ["Character State", "Motivation", "Inference"],
        "misconceptions": {67: "partial_internal_inference", 33: "related_inference_misconnection", 0: "opposite_or_no_inference"},
        "actions": {
            100: "생각이나 깨달음을 뒷받침하는 행동·말을 한 가지 설명합니다.",
            67: "핵심 생각은 잡았으므로 장면 근거와 더 정확히 연결합니다.",
            33: "인물의 말·행동과 속마음을 ‘그래서’로 연결해 다시 추론합니다.",
            0: "결말 장면을 다시 읽고 인물이 이전과 달라진 점부터 찾습니다.",
        },
    },
}


def extract_quiz(html: str) -> dict:
    match = re.search(r"const QUIZ = (\{.*?\});\r?\nconst bg", html, re.S)
    if not match:
        raise ValueError("Embedded QUIZ JSON was not found")
    return json.loads(match.group(1))


def level_rule(question_type: str, score: int) -> str:
    if question_type == "story_sequence_drag":
        return {100: "LCS=5/5", 67: "LCS=4/5", 33: "LCS=2–3/5", 0: "LCS=0–1/5 또는 무응답"}[score]
    if question_type == "setting_slot_drag":
        return {100: "3/3 요소 정확", 67: "2/3 요소 정확", 33: "1/3 요소 정확", 0: "0/3 요소 정확 또는 무응답"}[score]
    if question_type == "scene_word_unscramble":
        return {
            100: "전체 어절 순서 정확",
            67: "정답과의 최장 공통 순서가 전체의 75% 이상",
            33: "정답과의 최장 공통 순서가 전체의 40% 이상",
            0: "공통 순서가 40% 미만 또는 무응답",
        }[score]
    return "선택지에 사전 코딩된 Story Element·관계 이해 수준"


def feedback_for(question_type: str, score: int) -> tuple[str, str]:
    meta = QUESTION_META[question_type]
    if score == 100:
        student = "핵심 정보와 관계를 정확히 이해했어요."
        parent = "문항의 핵심 Story Element와 관계를 정확히 연결했습니다."
    elif score == 67:
        student = "핵심은 이해했어요. 한 가지 단서를 더 확인해 보세요."
        parent = "핵심 정보는 파악했으나 일부 순서·관계·세부 단서가 불완전합니다."
    elif score == 33:
        student = "관련 장면은 찾았어요. 질문이 묻는 관계를 다시 연결해 보세요."
        parent = "관련 이야기 요소는 인식했지만 질문이 요구한 핵심 관계를 잘못 연결했습니다."
    else:
        student = "장면의 핵심 단서를 함께 다시 찾아보세요."
        parent = "현재 응답만으로는 문항의 핵심 이해를 뒷받침하는 증거가 부족합니다."
    return student, f"{parent} 다음 활동: {meta['actions'][score]}"


def classify_option(question_type: str, old_score: int, is_correct: bool, existing_level: int | None = None) -> int:
    if existing_level is not None and old_score in {0, 33, 67, 100}:
        return old_score
    if is_correct:
        return 100
    if question_type == "listen_scene_mcq":
        return 33 if old_score >= 20 else 0
    if question_type == "emotion_mcq":
        return 67 if old_score >= 30 else (33 if old_score > 0 else 0)
    if question_type == "internal_response_mcq":
        return 33 if old_score >= 20 else 0
    raise ValueError(f"Unexpected option question type: {question_type}")


def response_rubric(question_type: str) -> list[dict]:
    meta = QUESTION_META[question_type]
    rows = []
    for level in LEVELS:
        score = level["score"]
        student, parent = feedback_for(question_type, score)
        rows.append(
            {
                **level,
                "evidenceRuleKo": level_rule(question_type, score),
                "misconceptionType": "none" if score == 100 else meta["misconceptions"][score],
                "studentFeedbackKo": student,
                "parentFeedbackKo": parent,
                "recommendedActionKo": meta["actions"][score],
            }
        )
    return rows


def update_question(q: dict) -> None:
    qtype = q["type"]
    meta = QUESTION_META[qtype]
    q["assessmentMetadata"] = {
        "storyElement": meta["storyElement"],
        "cognitiveTarget": meta["cognitiveTarget"],
        "operationalSkill": meta["operationalSkill"],
        "skillTags": meta["skillTags"],
    }
    q["responseRubric"] = response_rubric(qtype)

    if qtype in {"story_sequence_drag", "scene_word_unscramble"}:
        q["scoring"] = {
            "type": "ordered_lcs_level",
            "maxScore": 100,
            "evidenceFormula": "evidence_raw = round(LCS(submitted_order, correct_order) / item_count * 100)",
            "reportingFormula": "exact -> 100; LCS ratio >= .75 -> 67; LCS ratio >= .40 -> 33; otherwise -> 0",
            "components": [
                {
                    "key": item,
                    "weight": 1,
                    "rule": "ordered_evidence",
                    "correctValue": idx + 1,
                    "rationale": "All ordered elements contribute equally; no unvalidated positional premium.",
                }
                for idx, item in enumerate(q["interaction"]["correct"])
            ],
        }
    elif qtype == "setting_slot_drag":
        q["scoring"] = {
            "type": "exact_slot_count_level",
            "maxScore": 100,
            "evidenceFormula": "evidence_raw = round(exact_slots / 3 * 100)",
            "reportingFormula": "3 exact -> 100; 2 exact -> 67; 1 exact -> 33; 0 exact -> 0",
            "components": [
                {
                    "key": slot["key"],
                    "weight": 1,
                    "rule": "exact_slot_match",
                    "correctValue": slot["correct"],
                    "rationale": "Who, Where, and At first are equally weighted Story Setting elements.",
                }
                for slot in q["interaction"]["slots"]
            ],
        }
    else:
        for option in q["interaction"]["options"]:
            new_score = classify_option(
                qtype,
                int(option.get("score", 0)),
                bool(option.get("isCorrect")),
                option.get("responseLevel"),
            )
            option["score"] = new_score
            option["responseLevel"] = {100: 3, 67: 2, 33: 1, 0: 0}[new_score]
            option["misconceptionType"] = "none" if new_score == 100 else meta["misconceptions"][new_score]
            option["recommendedActionKo"] = meta["actions"][new_score]
        q["scoring"] = {
            "type": "ordered_option_level",
            "maxScore": 100,
            "formula": "score = selected_option.score; allowed values = 100, 67, 33, 0",
            "components": [
                {
                    "key": option["key"],
                    "weight": option["score"],
                    "rule": "preclassified_response_level",
                    "correctValue": bool(option.get("isCorrect")),
                    "responseLevel": option["responseLevel"],
                    "misconceptionType": option["misconceptionType"],
                    "rationale": option.get("diagnostic") or "Correct response.",
                }
                for option in q["interaction"]["options"]
            ],
        }

    for diagnostic in q.get("diagnostics", []):
        diagnostic["threshold"] = 67
    fields = q.setdefault("lrs", {}).setdefault("resultFields", [])
    for field in ["evidence_raw", "response_level", "misconception_type", "skill_tags", "recommended_action"]:
        if field not in fields:
            fields.append(field)


def update_quiz(quiz: dict) -> None:
    quiz["schemaVersion"] = "quiz-v3.1-diagnostic"
    quiz["assessmentFramework"] = {
        "name": "Story Comprehension Assessment & Rubric",
        "version": "1.0",
        "scoreInterpretation": "criterion_referenced_ordered_categories",
        "responseLevels": LEVELS,
        "designAxes": ["Story Element", "Cognitive Process", "Response Quality"],
        "principles": [
            "Story Grammar structures what is assessed but is not treated as the sole model of reading comprehension.",
            "Scores reflect evidence of Story Element and relationship understanding, not lexical or semantic similarity alone.",
            "100/67/33/0 are operational reporting values; they are not empirically calibrated IRT ability estimates.",
            "Overall feedback must be combined with the lowest skill profile and selected misconception.",
        ],
    }
    for q in quiz["questions"]:
        update_question(q)
    quiz["reporting"] = {
        "overallFormula": "overall = round(average(the six ordered question scores))",
        "masteryBands": [
            {"key": "strong", "min": 80, "max": 100, "labelKo": "통합적 이해", "labelEn": "Strong"},
            {"key": "developing", "min": 60, "max": 79, "labelKo": "주요 내용 이해·관계 보완", "labelEn": "Developing"},
            {"key": "emerging", "min": 40, "max": 59, "labelKo": "부분적 이해", "labelEn": "Emerging"},
            {"key": "foundation", "min": 0, "max": 39, "labelKo": "기초 지원 필요", "labelEn": "Foundation"},
        ],
        "profileRule": "Use overall band only as a summary. Generate feedback from the lowest operational skill and the misconception selected for each question.",
        "skillProfiles": {
            "Story Structure": [1, 2, 3, 4],
            "Cause & Effect": [1, 3, 4],
            "Character State & Motivation": [5, 6],
        },
        "studentDisplay": ["What you did well", "What to practice", "What to do next"],
        "validationStatus": "provisional_criterion_referenced_rules_pending_student_data_review",
    }
    quiz.setdefault("generation", {})["scoringRubricVersion"] = "diagnostic-4-level-v1"


OLD_CHECK_BLOCK = re.compile(r"function check\(i\)\{.*?function restart\(\)\{", re.S)

NEW_CHECK_BLOCK = r'''function lcsLength(a,b){const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let x=1;x<=a.length;x++){for(let y=1;y<=b.length;y++){dp[x][y]=a[x-1]===b[y-1]?dp[x-1][y-1]+1:Math.max(dp[x-1][y],dp[x][y-1])}}return dp[a.length][b.length]}
function levelByScore(score){return score===100?3:score===67?2:score===33?1:0}
function rubricRow(q,score){return (q.responseRubric||[]).find(r=>Number(r.score)===Number(score))||null}
function scoreOrdered(submitted,correct){const clean=(submitted||[]).filter(x=>x!=null),n=correct.length,lcs=lcsLength(clean,correct),ratio=n?lcs/n:0;const score=lcs===n&&clean.length===n?100:ratio>=.75?67:ratio>=.40?33:0;return {score,evidenceRaw:Math.round(ratio*100),lcs,itemCount:n}}
function check(i){if(scores[i]!=null)return;const q=QUIZ.questions[i];let score=0,evidenceRaw=0,detail={};if(q.type==='story_sequence_drag'){const result=scoreOrdered(answers[i],q.interaction.correct);score=result.score;evidenceRaw=result.evidenceRaw;detail={...result,order:[...answers[i]]};}
else if(q.type==='setting_slot_drag'){const exact=q.scoring.components.filter(c=>answers[i][c.key]===c.correctValue).length,total=q.scoring.components.length;score=exact===total?100:exact===2?67:exact===1?33:0;evidenceRaw=Math.round(exact/total*100);detail={score,evidenceRaw,exact,total,slots:{...answers[i]}};}
else if(q.type==='scene_word_unscramble'){const result=scoreOrdered(answers[i],q.interaction.correct);score=result.score;evidenceRaw=result.evidenceRaw;document.querySelectorAll(`#answer${i} .word`).forEach((n,idx)=>{n.classList.add(answers[i][idx]===q.interaction.correct[idx]?'correct':'wrong')});detail={...result,words:[...answers[i]]};}
else{const o=q.interaction.options.find(x=>x.key===answers[i]);score=o?Number(o.score):0;evidenceRaw=score;document.querySelectorAll(`#body${i} [data-opt]`).forEach(n=>{const opt=q.interaction.options.find(x=>x.key===n.dataset.opt);if(opt&&opt.isCorrect)n.classList.add('correct');else if(n.dataset.opt===answers[i])n.classList.add('wrong');});detail={score,evidenceRaw,selected:answers[i],selectedOption:o||null};}
const row=rubricRow(q,score);answerDetails[i]={...detail,responseLevel:levelByScore(score),misconceptionType:row?row.misconceptionType:'no_response',skillTags:(q.assessmentMetadata||{}).skillTags||[],recommendedAction:row?row.recommendedActionKo:''};scores[i]=score;lockQuestion(i);const fb=el('fb'+i);fb.className='feedback show '+(score>=67?'ok':'no');fb.textContent=`${row?row.labelEn:'No evidence'} · ${score}/100${row?' — '+row.studentFeedbackKo:''}`;el('next'+i).classList.add('show');updateNav();}
function retry(i){scores[i]=null;answers[i]=null;answerDetails[i]=null;renderBody(QUIZ.questions[i],i);el('fb'+i).className='feedback';el('next'+i).classList.remove('show');updateNav()}
function averageScore(){return Math.round(scores.reduce((sum,v)=>sum+(v??0),0)/scores.length)}
function overallBand(){const avg=averageScore();return (QUIZ.reporting.masteryBands||[]).find(b=>avg>=b.min&&avg<=b.max)||QUIZ.reporting.masteryBands.at(-1)}
function showStudent(){allScreens().forEach(s=>s.classList.remove('active'));el('student').classList.add('active');el('bookey').classList.remove('show');const avg=averageScore(),band=overallBand();el('studentSummary').textContent=`Overall ${avg}/100 · ${band.labelEn}. ${avg>=80?'You connected the important story information well.':avg>=60?'You understood the main events. Now check why events happened.':avg>=40?'You remember some parts. Review the important events and characters.':'Read the story again and find the important parts together.'}`;el('oxGrid').innerHTML=QUIZ.questions.map((q,i)=>{const row=rubricRow(q,scores[i]??0);return `<div class="ox ${scores[i]>=67?'ok':'no'}">Q${i+1}<br>${scores[i]??0}<br><small>${row?row.labelEn:''}</small></div>`}).join('')}
function sgScores(){const out={};QUIZ.questions.forEach((q,i)=>out[q.storyGrammar]=scores[i]??0);return out}
function parentComment(q,i){const score=scores[i]??0,detail=answerDetails[i]||{},row=rubricRow(q,score);let selected='';if(detail.selectedOption&&!detail.selectedOption.isCorrect&&detail.selectedOption.diagnostic)selected=` 선택 오답 진단: ${detail.selectedOption.diagnostic}`;return row?`${row.parentFeedbackKo}${selected}`:`${sgNames[q.storyGrammar]} 영역에서 추가 확인이 필요합니다.`}
function overallParentComment(){const avg=averageScore(),band=overallBand();const weakest=scores.reduce((best,v,i)=>v<(scores[best]??101)?i:best,0),q=QUIZ.questions[weakest],row=rubricRow(q,scores[weakest]??0);return `<div class="score-card" style="grid-column:1/-1"><strong>종합 · ${band.labelKo}</strong><div class="score">${avg} / 100</div><p><b>잘한 점:</b> ${avg>=60?'주요 이야기 정보를 파악했습니다.':'관련 이야기 요소를 일부 인식했습니다.'}<br><b>연습할 점:</b> ${sgNames[q.storyGrammar]} · ${(q.assessmentMetadata||{}).operationalSkill||''}<br><b>다음 활동:</b> ${row?row.recommendedActionKo:'핵심 장면을 다시 읽고 재시도합니다.'}</p></div>`}
function showParent(){allScreens().forEach(s=>s.classList.remove('active'));el('parent').classList.add('active');const s=sgScores();el('scoreList').innerHTML=overallParentComment()+QUIZ.questions.map((q,i)=>`<div class="score-card"><strong>Q${i+1} · ${sgNames[q.storyGrammar]}</strong><div class="score">${scores[i]??0} / 100 · L${levelByScore(scores[i]??0)}</div><p>${parentComment(q,i)}</p></div>`).join('');drawRadar(s)}
function drawRadar(s){const c=el('radar'),ctx=c.getContext('2d'),cx=180,cy=150,r=105;ctx.clearRect(0,0,360,300);ctx.strokeStyle='#DDD6FE';ctx.fillStyle='#7C3AED';ctx.font='12px Arial';for(let level=1;level<=4;level++){ctx.beginPath();sgOrder.forEach((k,i)=>{const a=-Math.PI/2+i*Math.PI*2/6;const rr=r*level/4;const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.stroke();}ctx.beginPath();sgOrder.forEach((k,i)=>{const a=-Math.PI/2+i*Math.PI*2/6;const rr=r*((s[k]??0)/100);const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fillStyle='rgba(124,58,237,.35)';ctx.fill();ctx.strokeStyle='#7C3AED';ctx.stroke();sgOrder.forEach((k,i)=>{const a=-Math.PI/2+i*Math.PI*2/6;ctx.fillStyle='#374151';ctx.fillText(k.split('_')[0],cx+Math.cos(a)*(r+28)-24,cy+Math.sin(a)*(r+28)+4)})}
function restart(){'''


def update_html(path: Path) -> None:
    html = path.read_text(encoding="utf-8")
    json_path = path.with_name(path.name.replace("_ReadingQuiz.html", ".quiz.json"))
    try:
        quiz = extract_quiz(html)
    except (ValueError, json.JSONDecodeError):
        quiz = json.loads(json_path.read_text(encoding="utf-8"))
    update_quiz(quiz)
    quiz_json = json.dumps(quiz, ensure_ascii=False, separators=(",", ":"))
    html = re.sub(
        r"const QUIZ = \{.*?\};\r?\nconst bg",
        lambda _: f"const QUIZ = {quiz_json};\nconst bg",
        html,
        count=1,
        flags=re.S,
    )
    html = html.replace(
        '<p class="instruction">You finished the quiz.</p><div class="ox-grid" id="oxGrid"></div>',
        '<p class="instruction">You finished the quiz.</p><p class="instruction" id="studentSummary"></p><div class="ox-grid" id="oxGrid"></div>',
    )
    html = re.sub(r'<div id="parent" class="screen"><div class="result-card"><h1>.*?</h1>', '<div id="parent" class="screen"><div class="result-card"><h1>학부모 리포트</h1>', html, count=1)
    html, count = OLD_CHECK_BLOCK.subn(NEW_CHECK_BLOCK, html, count=1)
    if count != 1:
        raise ValueError(f"Scoring JS block was not replaced in {path}")
    path.write_text(html, encoding="utf-8", newline="\n")

    json_path.write_text(json.dumps(quiz, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def main() -> None:
    paths = sorted(ROOT.glob(HTML_GLOB))
    if not paths:
        raise SystemExit("No deployed quiz HTML files were found")
    for path in paths:
        if "const QUIZ = " not in path.read_text(encoding="utf-8"):
            continue
        update_html(path)
        print(f"updated {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
