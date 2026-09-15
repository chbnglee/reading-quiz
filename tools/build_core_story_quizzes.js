const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const quizIds = ['OG0021', 'OG0060'];

const labels = {
  setting: { labelEn: 'Setting', labelKo: '배경' },
  key_situation: { labelEn: 'Key Situation', labelKo: '핵심 상황' },
  key_action: { labelEn: 'Key Action', labelKo: '핵심 행동' },
  story_sequence: { labelEn: 'Story Sequence', labelKo: '전체 흐름' },
};

const childFeedback = {
  setting: {
    100: 'You found who, where, and what happened first!',
    67: 'You found most of the story clues. Check one box again.',
    33: 'You found one story clue. Check where it belongs.',
    0: 'Look at the picture again. Start with “Who?”',
  },
  key_situation: {
    100: 'You found the key situation!',
    67: 'You found a close scene. Listen for what changes the story.',
    33: 'This scene is in the story, but it is not the key situation.',
    0: 'Listen again. Find the scene that changes the story.',
  },
  key_action: {
    100: 'You built the key action correctly!',
    67: 'Almost there! Check the word order.',
    33: 'You found some key words. Start with who, then the action.',
    0: 'Look at the picture and build the action one part at a time.',
  },
  story_sequence: {
    100: 'You put the whole story in order!',
    67: 'You know the story flow. Check the middle scenes again.',
    33: 'You found some story scenes. Connect what happens next.',
    0: 'Start with the first scene and follow the story one step at a time.',
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function updateRubric(question, area) {
  for (const row of question.responseRubric || []) {
    row.studentFeedbackEn = childFeedback[area][row.score];
  }
}

function orderedComponents(tokens) {
  return tokens.map((token, index) => ({
    key: token,
    weight: 1,
    rule: 'ordered_evidence',
    correctValue: index + 1,
    rationale: 'Each word group contributes equally to evidence of the complete action sentence.',
  }));
}

function configureKeyAction(question, id) {
  question.storyGrammar = 'key_action';
  question.instruction = 'Put the words in order.';
  question.diagnostics = [{
    code: 'key_action_gap',
    threshold: 67,
    messageKo: '이야기의 전개나 해결에 중요한 핵심 행동을 문장으로 구성하는 연습이 필요합니다.',
  }];
  question.assessmentMetadata = {
    storyElement: 'Key Action (Attempt / Resolution Action)',
    operationalSkill: 'Build an action sentence',
    skillTags: ['Key Action', 'Story Connection', 'Word Order'],
  };
  question.lrs.objectId = `quiz_${id}_core4_Q03_key_action`;

  if (id === 'OG0021') {
    const correct = ['He', 'takes', 'a deep breath', 'and', 'closes', 'his eyes.'];
    question.hint = 'Look at what Milo does before his colors come back.';
    question.resources = {
      images: [{ id: 'SC08', path: 'OG0021_SC08_I.webp', kind: 'image', sceneId: 'SC08' }],
      scene: 'SC08',
      sourceSentenceId: 'SC08_ST03_N',
    };
    question.interaction = {
      promptMode: 'word_unscramble',
      items: ['his eyes.', 'a deep breath', 'He', 'closes', 'takes', 'and'],
      correct,
    };
    question.scoring.components = orderedComponents(correct);
  } else {
    const correct = ['Pip', 'comes out', 'and', 'flaps', 'his bright orange wings.'];
    question.hint = 'Look at what Pip does when his big change is complete.';
    question.resources = {
      images: [{ id: 'SC13', path: 'OG0060_SC13_I.webp', kind: 'image', sceneId: 'SC13' }],
      scene: 'SC13',
      sourceSentenceIds: ['SC11_ST04_N', 'SC13_ST01_N', 'SC13_ST02_N'],
    };
    question.interaction = {
      promptMode: 'word_unscramble',
      items: ['his bright orange wings.', 'flaps', 'Pip', 'and', 'comes out'],
      correct,
    };
    question.scoring.components = orderedComponents(correct);
  }

  const rubricText = {
    100: {
      studentFeedbackKo: '이야기의 전개나 해결에 중요한 핵심 행동을 정확한 문장으로 만들었어요.',
      parentFeedbackKo: '이야기의 핵심 상황과 이후 결과를 연결하는 주요 행동을 정확한 어순으로 구성했습니다.',
      recommendedActionKo: '이 행동이 다음 장면의 결과로 어떻게 이어지는지 말합니다.',
    },
    67: {
      studentFeedbackKo: '핵심 행동은 대부분 이해했어요. 헷갈린 말의 위치를 다시 확인해 보세요.',
      parentFeedbackKo: '핵심 행동은 파악했으나 일부 어절의 순서가 불안정합니다.',
      recommendedActionKo: '그림을 보고 행동 문장을 소리 내어 말한 뒤 어순을 다시 확인합니다.',
    },
    33: {
      studentFeedbackKo: '몇몇 핵심 단어는 찾았어요. 누가 무엇을 했는지 순서로 다시 묶어보세요.',
      parentFeedbackKo: '관련 단어는 인식하지만 인물과 핵심 행동의 관계를 완전한 문장으로 구성하는 데 어려움이 있습니다.',
      recommendedActionKo: '인물과 행동어를 먼저 찾고 짧은 말 덩어리로 연결합니다.',
    },
    0: {
      studentFeedbackKo: '그림에서 인물과 중요한 행동을 먼저 찾아 한 부분씩 만들어봐요.',
      parentFeedbackKo: '현재 응답에서는 핵심 행동을 문장으로 구성한 이해 증거가 확인되지 않습니다.',
      recommendedActionKo: '해당 장면을 다시 읽고 인물과 행동어부터 찾습니다.',
    },
  };
  for (const row of question.responseRubric || []) Object.assign(row, rubricText[row.score]);
}

function buildCoreQuiz(original, id) {
  const setting = clone(original.questions[1]);
  const situation = clone(original.questions[2]);
  const action = clone(original.questions[3]);
  const sequence = clone(original.questions[0]);
  const questions = [setting, situation, action, sequence];
  const areas = ['setting', 'key_situation', 'key_action', 'story_sequence'];

  questions.forEach((q, index) => {
    q.number = index + 1;
    q.qId = `${id}_CORE4_Q${String(index + 1).padStart(2, '0')}`;
    q.storyGrammar = areas[index];
    updateRubric(q, areas[index]);
  });

  setting.lrs.objectId = `quiz_${id}_core4_Q01_setting`;
  setting.assessmentMetadata = {
    storyElement: 'Setting',
    operationalSkill: 'Identify story anchors',
    skillTags: ['Setting', 'Character', 'Place', 'Initial State'],
  };

  situation.instruction = id === 'OG0021'
    ? 'Listen. What happens to Milo?'
    : 'Listen. What happens to Pip?';
  situation.hint = id === 'OG0021'
    ? 'Listen for the change that gives Milo his problem.'
    : 'Listen for the change that leads to Pip’s big change.';
  situation.lrs.objectId = `quiz_${id}_core4_Q02_key_situation`;
  situation.diagnostics = [{
    code: 'key_situation_gap',
    threshold: 67,
    messageKo: '이야기에 방향을 만드는 핵심 문제·목표·변화를 다른 장면과 구분하는 연습이 필요합니다.',
  }];
  situation.assessmentMetadata = {
    storyElement: 'Key Situation (Problem / Goal / Change)',
    operationalSkill: 'Connect the key situation to the story',
    skillTags: ['Key Situation', 'Problem or Change', 'Listening'],
  };
  const situationRubricText = {
    100: {
      studentFeedbackKo: '이야기에 방향을 만드는 핵심 문제·목표·변화를 정확히 찾았어요.',
      parentFeedbackKo: '배경과 핵심 상황을 구분하고, 이 상황이 이후 전개를 이끄는 관계를 정확히 이해합니다.',
      recommendedActionKo: '핵심 상황 이후에 일어난 행동을 연결해 말합니다.',
    },
    67: {
      studentFeedbackKo: '핵심 상황과 가까운 장면을 찾았어요. 이야기가 움직이기 시작한 지점을 다시 확인해 보세요.',
      parentFeedbackKo: '핵심 전개와 관련된 장면은 파악했으나 원인이 되는 상황과 뒤따르는 과정의 구분이 일부 불완전합니다.',
      recommendedActionKo: '선택한 장면 바로 앞에서 어떤 문제·목표·변화가 생겼는지 확인합니다.',
    },
    33: {
      studentFeedbackKo: '이야기 속 장면은 찾았지만 핵심 상황과 다른 단계가 섞였어요.',
      parentFeedbackKo: '관련 사건은 인식하지만 배경·중간 행동·결과를 이야기에 방향을 만드는 핵심 상황과 혼동합니다.',
      recommendedActionKo: '처음 상황과 달라진 점을 나란히 비교합니다.',
    },
    0: {
      studentFeedbackKo: '이야기가 움직이기 시작한 문제나 변화를 다시 찾아봐요.',
      parentFeedbackKo: '현재 선택에서는 이야기의 핵심 상황을 다른 단계와 구분한 증거가 확인되지 않습니다.',
      recommendedActionKo: '오디오를 다시 듣고 처음 상황에서 달라진 점을 함께 찾습니다.',
    },
  };
  for (const row of situation.responseRubric || []) Object.assign(row, situationRubricText[row.score]);

  configureKeyAction(action, id);

  sequence.instruction = 'Put the whole story in order.';
  sequence.lrs.objectId = `quiz_${id}_core4_Q04_story_sequence`;
  sequence.assessmentMetadata = {
    storyElement: 'Story Sequence',
    operationalSkill: 'Connect the story from beginning to end',
    skillTags: ['Story Sequence', 'Beginning to End', 'Story Flow'],
  };

  const quiz = clone(original);
  quiz.schemaVersion = 'quiz-core-story-v1';
  quiz.storyGrammarAxes = Object.entries(labels).map(([key, value]) => ({ key, ...value }));
  quiz.questions = questions;
  quiz.generation = {
    provider: 'codex',
    model: 'manual-core-story-logic',
    promptVersion: 'core_story_v1',
    createdAt: '2026-09-15',
    notes: 'Four-question pilot derived from the existing v3 quiz. The original six-question quiz remains unchanged.',
    scoringRubricVersion: 'diagnostic-response-quality-v2',
  };
  quiz.assessmentFramework = {
    name: 'Core Story Comprehension Check',
    version: 'pilot-1.0',
    theoreticalBasis: 'Story Grammar-informed; operationalized for a four-question, story-specific comprehension check.',
    areas: Object.entries(labels).map(([key, value]) => ({ key, ...value })),
    designAxes: ['Story Area', 'Response Quality'],
    interpretationBoundary: 'Results describe evidence from this story and these four tasks; they are not a Story Grammar proficiency score.',
  };
  quiz.reporting = {
    ...quiz.reporting,
    overallFormula: 'Internal summary only: average the four ordered question scores.',
    profileRule: 'Use the response pattern and lowest story area to select feedback; do not interpret the average as Story Grammar proficiency.',
    skillProfiles: {
      'Story Anchors': [1],
      'Story Direction': [2, 3],
      'Story Flow': [4],
    },
  };
  return quiz;
}

function buildHtml(sourceHtml, quiz, id) {
  let html = sourceHtml;
  html = html.replace(/<title>.*?<\/title>/, `<title>${quiz.story.title} – Core Story Quiz</title>`);
  html = html.replace('<h1>Reading Quiz</h1>', `<h1>Core Story Quiz</h1><p class="cover-subtitle">${quiz.story.title}</p>`);
  html = html.replace(/const QUIZ = .*?;\r?\nconst bg =/s, `const QUIZ = ${JSON.stringify(quiz)};\nconst bg =`);
  html = html.replace(
    'const sgOrder = ["consequence","setting","initiating_event","attempt","reaction","internal_response"];',
    'const sgOrder = ["setting","key_situation","key_action","story_sequence"];'
  );
  html = html.replace(
    "const sgNames = {consequence:'Consequence',setting:'Setting',initiating_event:'Initiating Event',attempt:'Attempt',reaction:'Reaction',internal_response:'Internal Response'};",
    "const sgNames = {setting:'Setting',key_situation:'Key Situation',key_action:'Key Action',story_sequence:'Story Sequence'};"
  );
  html = html.replace("${q.storyGrammar.replace('_',' ')}", "${sgNames[q.storyGrammar]}");

  html = html.replace(
    "else if(q.type==='setting_slot_drag'){const first=q.resources.images[0];b.innerHTML=`<div class=\"scene-grid single-grid\"><div class=\"scene-card image-only\"><img src=\"${img(first.path)}\"></div></div><div class=\"slots\">${q.interaction.slots.map(s=>`<div class=\"slot\" data-slot=\"${s.key}\" ondragover=\"allowDrop(event)\" ondrop=\"dropSetting(event,${i},'${s.key}')\" onclick=\"placeSetting(${i},'${s.key}')\">${s.label}</div>`).join('')}</div><div class=\"bank setting-bank\" id=\"bank${i}\"></div>`;q.interaction.items.forEach(item=>addMiniCard(i,item));answers[i]={};}",
    "else if(q.type==='setting_slot_drag'){const first=q.resources.images[0];b.innerHTML=`<div class=\"setting-layout\"><div class=\"scene-grid single-grid\"><div class=\"scene-card image-only\"><img src=\"${img(first.path)}\"></div></div><div class=\"setting-rows\">${q.interaction.slots.map(s=>`<div class=\"setting-row\"><div class=\"setting-label\">${s.label}</div><div class=\"slot\" data-slot=\"${s.key}\" ondragover=\"allowDrop(event)\" ondrop=\"dropSetting(event,${i},'${s.key}')\" onclick=\"placeSetting(${i},'${s.key}')\"></div></div>`).join('')}</div></div><div class=\"bank setting-bank\" id=\"bank${i}\"></div>`;q.interaction.items.forEach(item=>addMiniCard(i,item));answers[i]={};}"
  );

  html = html.replace(
    "fb.textContent=`${row?row.responseQuality:'Unrelated'} · ${score}/100${row?' — '+row.studentFeedbackKo:''}`;",
    "fb.textContent=row?(row.studentFeedbackEn||row.labelEn):'Let’s try together!';"
  );
  html = html.replace(
    /function showStudent\(\)\{.*?\}\r?\nfunction sgScores/s,
    "function childResult(){const strong=scores.filter(v=>v>=67).length;if(strong===scores.length)return 'Ready for the next story!';if(strong>=2)return 'One more look!';return 'Let’s look again together!'}\nfunction showStudent(){allScreens().forEach(s=>s.classList.remove('active'));el('student').classList.add('active');el('bookey').classList.remove('show');el('studentSummary').textContent=childResult();el('oxGrid').innerHTML=QUIZ.questions.map((q,i)=>{const row=rubricRow(q,scores[i]??0);return `<div class=\"ox ${scores[i]>=67?'ok':'no'}\"><strong>${sgNames[q.storyGrammar]}</strong><br><small>${row?(row.studentFeedbackEn||row.labelEn):''}</small></div>`}).join('')}\nfunction sgScores"
  );
  html = html.replace(
    /function overallParentComment\(\)\{.*?\}\r?\nfunction showParent\(\)\{.*?\}\r?\nfunction drawRadar/s,
    "function overallParentComment(){const weakest=scores.reduce((best,v,i)=>v<(scores[best]??101)?i:best,0),q=QUIZ.questions[weakest],row=rubricRow(q,scores[weakest]??0);return `<div class=\"score-card\" style=\"grid-column:1/-1\"><strong>이번 이야기 결과</strong><p><b>확인한 영역:</b> Setting · Key Situation · Key Action · Story Sequence<br><b>우선 연습:</b> ${sgNames[q.storyGrammar]}<br><b>다음 활동:</b> ${row?row.recommendedActionKo:'핵심 장면을 다시 읽고 재시도합니다.'}</p></div>`}\nfunction showParent(){allScreens().forEach(s=>s.classList.remove('active'));el('parent').classList.add('active');el('scoreList').innerHTML=overallParentComment()+QUIZ.questions.map((q,i)=>{const row=rubricRow(q,scores[i]??0);return `<div class=\"score-card\"><strong>Q${i+1} · ${sgNames[q.storyGrammar]}</strong><div class=\"quality\">${row?row.labelKo:'추가 확인 필요'}</div><p>${parentComment(q,i)}</p></div>`}).join('')}\nfunction drawRadar"
  );
  html = html.replaceAll('i*Math.PI*2/6', 'i*Math.PI*2/sgOrder.length');
  html = html.replace('<canvas id="radar" width="360" height="300"></canvas>', '<div class="framework-panel"><strong>4 Story Areas</strong><span>Setting</span><span>Key Situation</span><span>Key Action</span><span>Story Sequence</span></div>');
  html = html.replace(/\n<div class="download-box".*?<\/div><\/div>\r?\n<script>/s, '\n<script>');

  const extraCss = `
<style>
.cover-subtitle{margin:0;color:#6B7280;font-size:18px}
.setting-layout{display:grid;grid-template-columns:minmax(260px,420px) minmax(320px,1fr);gap:28px;align-items:center;max-width:850px;margin:0 auto}
.setting-rows{display:grid;gap:14px}
.setting-row{display:grid;grid-template-columns:110px minmax(190px,1fr);align-items:stretch}
.setting-label{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;margin-right:-10px;border:2px solid #C7D2FE;border-radius:16px 8px 8px 16px;background:#EEF2FF;color:#4C1D95;font-family:'Nunito',sans-serif;font-weight:900;box-shadow:0 7px 0 #C4B5FD,0 10px 20px rgba(76,29,149,.12)}
.setting-row .slot{min-height:74px;border:1px solid #E5E7EB;border-radius:8px 16px 16px 8px;background:#F3F4F6;color:#4C1D95;box-shadow:inset 0 3px 7px rgba(31,41,55,.14);padding-left:18px}
.setting-row .slot.filled{background:white;border-color:#C4B5FD;box-shadow:inset 0 2px 5px rgba(31,41,55,.08),0 0 0 3px #F5F3FF}
.framework-panel{border:2px solid #EDE9FE;border-radius:20px;padding:18px;background:#F9FAFB;display:grid;gap:10px;align-content:center}
.framework-panel strong{color:#4C1D95;font-family:'Nunito',sans-serif;font-size:20px}
.framework-panel span{background:white;border:1px solid #DDD6FE;border-radius:999px;padding:9px 12px;color:#5B21B6;font-weight:800}
.quality{font-family:'Nunito',sans-serif;font-weight:900;font-size:18px;color:#5B21B6;margin-bottom:6px}
.ox-grid{grid-template-columns:repeat(2,1fr)}
@media(max-width:760px){.setting-layout{grid-template-columns:1fr;gap:12px}.setting-row{grid-template-columns:96px 1fr}}
</style>`;
  html = html.replace('</head>', `${extraCss}\n</head>`);
  return html;
}

for (const id of quizIds) {
  const dir = path.join(root, 'v3', id);
  const jsonPath = path.join(dir, `${id}.quiz.json`);
  const htmlPath = path.join(dir, `${id}_ReadingQuiz.html`);
  const original = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const sourceHtml = fs.readFileSync(htmlPath, 'utf8');
  const quiz = buildCoreQuiz(original, id);
  fs.writeFileSync(path.join(dir, `${id}.core4.quiz.json`), JSON.stringify(quiz, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, `${id}_CoreStoryQuiz.html`), buildHtml(sourceHtml, quiz, id));
}

console.log('Built core story quizzes for ' + quizIds.join(', '));
