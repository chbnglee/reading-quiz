let quiz = null;
let currentQuestionIndex = 0;

const SG_LABELS = {
  setting: 'Setting',
  initiating_event: 'Initiating Event',
  attempt: 'Attempt',
  reaction: 'Reaction',
  internal_response: 'Internal Response',
  consequence: 'Consequence'
};

const SG_KO = {
  setting: '배경 이해',
  initiating_event: '사건 시작',
  attempt: '해결 행동',
  reaction: '감정 반응',
  internal_response: '내면 추론',
  consequence: '결과 이해'
};

const $ = (id) => document.getElementById(id);

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeJsonParse(value, label) {
  try {
    return JSON.parse(value || 'null');
  } catch (error) {
    throw new Error(`${label} JSON 형식을 확인해 주세요.`);
  }
}

async function loadSample() {
  try {
    const res = await fetch('samples/OG0021_v3.quiz.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    quiz = await res.json();
  } catch (error) {
    toast('샘플 파일을 읽지 못했습니다.');
    console.error(error);
    return;
  }
  syncStoryInputs();
  currentQuestionIndex = 0;
  renderAll();
  toast('OG0021 샘플을 불러왔습니다.');
}

function syncStoryInputs() {
  if (!quiz) return;
  $('story-id').value = quiz.story.storyId || '';
  $('story-title').value = quiz.story.title || '';
  $('story-level').value = quiz.story.level || '';
  $('story-text').value = quiz.story.text || '';
}

function renderAll() {
  if (!quiz) return;
  $('schema-pill').textContent = quiz.schemaVersion || 'quiz-v3.0';
  renderQuestionNav();
  renderQuestionSelect();
  renderPreview();
  renderEditor();
}

function renderQuestionNav() {
  const nav = $('preview-nav');
  nav.innerHTML = '';
  quiz.questions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.className = `q-dot${idx === currentQuestionIndex ? ' active' : ''}`;
    btn.textContent = q.number || idx + 1;
    btn.onclick = () => {
      currentQuestionIndex = idx;
      renderAll();
    };
    nav.appendChild(btn);
  });
}

function renderQuestionSelect() {
  const select = $('question-select');
  const previous = select.value;
  select.innerHTML = '';
  quiz.questions.forEach((q, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `Q${q.number || idx + 1} · ${SG_LABELS[q.storyGrammar] || q.storyGrammar}`;
    select.appendChild(opt);
  });
  select.value = quiz.questions[Number(previous)] ? previous : String(currentQuestionIndex);
}

function assetUrl(path, kind = 'image') {
  if (!quiz || !path) return '';
  if (/^(https?:|data:|blob:|\/)/.test(path)) return path;
  const base = kind === 'audio' ? quiz.assets.audioBasePath : quiz.assets.imageBasePath;
  return `${base || ''}${path}`;
}

function imageHtml(resource, className = '') {
  const url = assetUrl(resource?.path, 'image');
  const scene = resource?.sceneId || resource?.id || 'Scene';
  return `<div class="scene-card ${className}">
    <img src="${escapeAttr(url)}" alt="${escapeAttr(scene)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div class="scene-fallback" style="display:none">${escapeHtml(scene)}</div>
  </div>`;
}

function renderPreview() {
  const stage = $('preview-stage');
  const bg = quiz.assets?.backgroundImage;
  stage.style.setProperty('--preview-bg', bg ? `url("${bg}")` : 'linear-gradient(140deg,#F7F4FF,#EBF7FF)');
  const q = quiz.questions[currentQuestionIndex];
  const images = q.resources?.images || [];
  const hintAvatar = quiz.assets?.hintCharacter || '../v3/Assets/BKTK_Characters_Bookey.png';
  const parts = [];
  parts.push(`<article class="quiz-card">`);
  parts.push(`<div class="quiz-meta"><span class="q-badge">Q${q.number || currentQuestionIndex + 1}</span><span class="sg-tag">${escapeHtml(SG_LABELS[q.storyGrammar] || q.storyGrammar)}</span></div>`);
  parts.push(`<div class="instruction">${escapeHtml(q.instruction || '')}</div>`);
  const hintHtml = `<div class="hint-row"><img class="hint-avatar" src="${escapeAttr(hintAvatar)}" alt="Bookey"><span>${escapeHtml(q.hint || '')}</span></div>`;

  if (q.type === 'story_sequence_drag') {
    parts.push(`<div class="scene-grid">${images.map(img => imageHtml(img)).join('')}</div>`);
    parts.push(`<div class="sequence-slots">${(q.interaction?.correct || []).map((_, i) => `<div class="slot">Scene ${i + 1}</div>`).join('')}</div>`);
  } else if (q.type === 'setting_slot_drag') {
    parts.push(`<div class="scene-grid">${images.slice(0, 1).map(img => imageHtml(img)).join('')}</div>`);
    parts.push(`<div class="setting-slots">${(q.interaction?.slots || []).map(slot => `<div class="setting-row"><div class="slot">${escapeHtml(slot.label)}</div><div class="word-chip">${escapeHtml(slot.correct)}</div></div>`).join('')}</div>`);
    parts.push(`<div class="word-row">${(q.interaction?.items || []).map(item => `<div class="word-chip">${escapeHtml(item.text || item.key)}</div>`).join('')}</div>`);
  } else if (q.type === 'listen_scene_mcq') {
    const audio = q.resources?.audio;
    parts.push(`<div class="audio-chip">Listen · ${escapeHtml(audio?.path || 'audio file')}</div>`);
    parts.push(`<div class="scene-grid">${images.map(img => imageHtml(img)).join('')}</div>`);
  } else if (q.type === 'scene_word_unscramble') {
    parts.push(`<div class="scene-grid">${images.slice(0, 1).map(img => imageHtml(img)).join('')}</div>`);
    parts.push(`<div class="word-row">${(q.interaction?.items || []).map(word => `<div class="word-chip">${escapeHtml(word)}</div>`).join('')}</div>`);
  } else {
    parts.push(`<div class="scene-grid">${images.slice(0, 1).map(img => imageHtml(img)).join('')}</div>`);
    parts.push(`<div class="option-grid">${(q.interaction?.options || []).map(opt => `<div class="option-chip">${escapeHtml(opt.text || opt.key)} <small>(${opt.score ?? 0})</small></div>`).join('')}</div>`);
  }

  parts.push(hintHtml);
  parts.push(`</article>`);
  stage.innerHTML = parts.join('');
}

function renderEditor() {
  const q = quiz.questions[currentQuestionIndex];
  $('question-select').value = String(currentQuestionIndex);
  $('sg-select').value = q.storyGrammar;
  $('type-select').value = q.type;
  $('instruction-input').value = q.instruction || '';
  $('hint-input').value = q.hint || '';
  $('resources-json').value = JSON.stringify(q.resources || {}, null, 2);
  $('interaction-json').value = JSON.stringify(q.interaction || {}, null, 2);
  $('scoring-json').value = JSON.stringify(q.scoring || {}, null, 2);
  $('diagnostics-json').value = JSON.stringify(q.diagnostics || [], null, 2);
}

function applyEditorChanges() {
  if (!quiz) return;
  const q = quiz.questions[currentQuestionIndex];
  try {
    q.storyGrammar = $('sg-select').value;
    q.type = $('type-select').value;
    q.instruction = $('instruction-input').value.trim();
    q.hint = $('hint-input').value.trim();
    q.resources = safeJsonParse($('resources-json').value, 'Resources') || {};
    q.interaction = safeJsonParse($('interaction-json').value, 'Interaction') || {};
    q.scoring = safeJsonParse($('scoring-json').value, 'Scoring') || {};
    q.diagnostics = safeJsonParse($('diagnostics-json').value, 'Diagnostics') || [];
    renderAll();
    toast('변경을 반영했습니다.');
  } catch (error) {
    toast(error.message);
  }
}

function updateStoryFromInputs() {
  const storyText = $('story-text').value;
  const storyId = $('story-id').value.trim() || 'OG0000';
  const title = $('story-title').value.trim() || 'Untitled Story';
  const level = $('story-level').value.trim() || 'Draft Level';
  if (!quiz) quiz = blankQuiz(storyId, title, level, storyText);
  quiz.story.storyId = storyId;
  quiz.story.title = title;
  quiz.story.level = level;
  quiz.story.text = storyText;
}

async function generateRuleDraft() {
  updateStoryFromInputs();
  const payload = {
    storyId: $('story-id').value.trim(),
    title: $('story-title').value.trim(),
    level: $('story-level').value.trim(),
    storyText: $('story-text').value
  };
  try {
    const res = await fetch('/api/generate-rule-based', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('local api unavailable');
    const data = await res.json();
    quiz = data.quiz;
  } catch {
    quiz = buildRuleDraft(payload);
  }
  currentQuestionIndex = 0;
  renderAll();
  toast('초안을 생성했습니다. 오른쪽에서 검수해 주세요.');
}

async function generateAiDraft() {
  updateStoryFromInputs();
  const apiKey = $('api-key').value.trim();
  const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
  if (apiKey && !isLocal) {
    toast('API Key는 로컬 서버에서만 보낼 수 있습니다.');
    return;
  }
  const payload = {
    provider: $('ai-provider').value,
    input: {
      storyId: $('story-id').value.trim(),
      title: $('story-title').value.trim(),
      level: $('story-level').value.trim(),
      storyText: $('story-text').value,
      assetNaming: {
        image: '{storyId}_SC##_I.png',
        audio: '{storyId}_SC##_ST##_N_A.mp3'
      }
    }
  };
  if (apiKey) payload.apiKey = apiKey;
  try {
    const res = await fetch('/api/generate-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'AI generation failed.');
    quiz = data.quiz;
    currentQuestionIndex = 0;
    renderAll();
    toast(`${payload.provider} 초안을 생성했습니다.`);
  } catch (error) {
    toast(`로컬 AI 서버가 필요합니다: ${error.message}`);
  }
}

function parseStory(storyText) {
  const scenes = new Map();
  storyText.split(/\r?\n/).forEach(line => {
    const match = line.trim().match(/^(SC\d{2})_(ST\d{2})_N\s*=\s*(.+)$/);
    if (!match) return;
    const [, sceneId, st, text] = match;
    if (!scenes.has(sceneId)) scenes.set(sceneId, []);
    scenes.get(sceneId).push({ sentenceId: `${sceneId}_${st}_N`, text: text.replace(/^["“]|["”]$/g, '').trim() });
  });
  return [...scenes.entries()].map(([sceneId, sentences]) => ({ sceneId, sentences }));
}

function buildRuleDraft(payload) {
  const storyId = payload.storyId || 'OG0000';
  const title = payload.title || 'Untitled Story';
  const level = payload.level || 'Draft Level';
  const storyText = payload.storyText || '';
  const scenes = parseStory(storyText);
  const ids = scenes.map(s => s.sceneId);
  const usable = ids.length ? ids : ['SC01','SC02','SC03','SC04','SC05'];
  const sceneAt = (ratio) => usable[Math.max(0, Math.min(usable.length - 1, Math.round((usable.length - 1) * ratio)))];
  const first = usable[0];
  const event = usable[1] || first;
  const attempt = sceneAt(.35);
  const reaction = sceneAt(.62);
  const sequence = [...new Set([first, event, attempt, reaction, usable[usable.length - 1]])];
  while (sequence.length < 5) sequence.push(usable[Math.min(sequence.length, usable.length - 1)]);
  const image = scene => ({ id: scene, path: `${storyId}_${scene}_I.png`, kind: 'image', sceneId: scene });
  const findSentence = scene => (scenes.find(s => s.sceneId === scene)?.sentences?.[0]) || { sentenceId: `${scene}_ST01_N`, text: 'Put the words in order.' };
  const attemptSentence = findSentence(attempt);
  const words = (attemptSentence.text.match(/[A-Za-z']+[,\.!?]?/g) || ['Put','the','words','in','order.']).slice(0, 7);
  const mkQ = (number, type, axis, instruction, hint, resources, interaction, scoring, diagnostics) => ({
    qId: `${storyId}_V3_Q${String(number).padStart(2, '0')}`,
    number, type, storyGrammar: axis, instruction, hint, resources, interaction, scoring,
    diagnostics: diagnostics || [{ code: `${axis}_gap`, threshold: 70, messageKo: `${SG_KO[axis]} 항목을 다시 확인할 필요가 있습니다.` }],
    lrs: { verb: 'answered', objectId: `quiz_${storyId}_v3_Q${String(number).padStart(2, '0')}_${axis}`, resultFields: ['score_raw', 'hint_used'] }
  });
  return {
    schemaVersion: 'quiz-v3.0',
    story: { storyId, title, level, text: storyText, scenes },
    assets: {
      imageBasePath: `../v3/${storyId}/Image/`,
      audioBasePath: `../v3/${storyId}/Audio/`,
      coverBasePath: `../v3/${storyId}/Cover/`,
      backgroundImage: `../v3/${storyId}/Image/${storyId}_Talking_BG_I.png`,
      hintCharacter: '../v3/Assets/BKTK_Characters_Bookey.png'
    },
    storyGrammarAxes: Object.keys(SG_LABELS).map(key => ({ key, labelEn: SG_LABELS[key], labelKo: SG_KO[key], descriptionKo: '' })),
    questions: [
      mkQ(1, 'story_sequence_drag', 'consequence', 'Put the story scenes in order.', 'Think about the story from start to end.', { images: sequence.map(image) }, { promptMode: 'drag_sequence', items: sequence, correct: sequence }, weightedPosition(sequence)),
      mkQ(2, 'setting_slot_drag', 'setting', 'Look at the first scene. Fill in the boxes.', 'Who is there? Where are they?', { images: [image(first)], scene: first }, settingInteraction(), settingScoring()),
      mkQ(3, 'listen_scene_mcq', 'initiating_event', 'Listen. Which scene starts the problem?', 'Listen for the first big change.', { images: sequence.slice(0, 4).map(image), audio: { id: `${event}_ST01_N_A`, path: `${storyId}_${event}_ST01_N_A.mp3`, kind: 'audio', sceneId: event, sentenceId: `${event}_ST01_N` } }, imageOptions(sequence.slice(0, 4), event), fixedScoring()),
      mkQ(4, 'scene_word_unscramble', 'attempt', 'Put the story words in order.', 'Find who. Then find the action.', { images: [image(attempt)], scene: attempt, sentenceId: attemptSentence.sentenceId }, { promptMode: 'word_unscramble', items: [...words].reverse(), correct: words }, wordScoring(words)),
      mkQ(5, 'emotion_mcq', 'reaction', 'How does the character feel here?', 'Look at the face and the scene.', { images: [image(reaction)], scene: reaction }, emotionOptions(), fixedScoring()),
      mkQ(6, 'internal_response_mcq', 'internal_response', 'What is the character thinking?', 'Think about the character’s heart.', { images: [image(reaction)], scene: reaction }, internalOptions(), fixedScoring())
    ],
    reporting: defaultReporting(),
    generation: { provider: 'rule_based', model: 'browser-heuristic', promptVersion: 'story_grammar_v3', createdAt: new Date().toISOString().slice(0, 10), notes: 'Draft generated locally. Human review required.' }
  };
}

function weightedPosition(sequence) {
  return {
    type: 'weighted_position',
    maxScore: 100,
    formula: 'score = round(sum(weight_i * max(0, 1 - abs(placed_pos_i - correct_pos_i) * 0.5)) / sum(weights) * 100)',
    components: sequence.map((sc, idx) => ({ key: sc, weight: idx === 0 || idx === sequence.length - 1 ? 2.5 : 1.5, rule: 'position_distance', correctValue: idx + 1, rationale: 'Story sequence diagnostic point.' }))
  };
}

function settingInteraction() {
  return {
    promptMode: 'slot_drag',
    slots: [
      { key: 'who', label: 'Who?', correct: 'main_character', weight: 2.5 },
      { key: 'where', label: 'Where?', correct: 'main_place', weight: 2 },
      { key: 'what', label: 'At first...', correct: 'opening_state', weight: 1.5 }
    ],
    items: [
      { key: 'main_place', text: 'story place', slot: 'where' },
      { key: 'other_character', text: 'other character', slot: 'who', diagnostic: '주변 인물을 주인공으로 혼동함' },
      { key: 'opening_state', text: 'first action', slot: 'what' },
      { key: 'main_character', text: 'main character', slot: 'who' },
      { key: 'other_place', text: 'other place', slot: 'where', diagnostic: '다른 장소를 시작 배경으로 혼동함' },
      { key: 'later_problem', text: 'later problem', slot: 'what', diagnostic: '문제 장면을 처음 상황으로 혼동함' }
    ],
    correct: { who: 'main_character', where: 'main_place', what: 'opening_state' }
  };
}

function settingScoring() {
  return {
    type: 'weighted_slot_match',
    maxScore: 100,
    formula: 'full slot weight if exact target; 35% slot credit if same category but wrong card; 0 for wrong category',
    components: [
      { key: 'who', weight: 2.5, rule: 'slot_match', correctValue: 'main_character', partialCredit: .35, rationale: 'Identifies the main character.' },
      { key: 'where', weight: 2, rule: 'slot_match', correctValue: 'main_place', partialCredit: .35, rationale: 'Identifies the story place.' },
      { key: 'what', weight: 1.5, rule: 'slot_match', correctValue: 'opening_state', partialCredit: .35, rationale: 'Identifies the opening state.' }
    ]
  };
}

function imageOptions(scenes, correctScene) {
  return {
    promptMode: 'image_mcq',
    options: scenes.map((sc, idx) => ({ key: String.fromCharCode(65 + idx), text: sc, score: sc === correctScene ? 100 : Math.max(0, 30 - idx * 5), isCorrect: sc === correctScene, diagnostic: '사건 시작 장면과 다른 장면을 혼동함' })),
    correct: String.fromCharCode(65 + Math.max(0, scenes.indexOf(correctScene)))
  };
}

function wordScoring(words) {
  return {
    type: 'weighted_word_position',
    maxScore: 100,
    formula: 'score = round(sum(weight[word] if submitted_pos == correct_pos) / sum(weights) * 100)',
    components: words.map((word, idx) => ({ key: word, weight: idx <= 1 || idx === words.length - 1 ? 2.5 : 1, rule: 'exact_position', correctValue: idx + 1, rationale: 'Sentence structure diagnostic point.' }))
  };
}

function fixedScoring() {
  return { type: 'fixed_option_score', maxScore: 100, formula: 'score = selected_option.score', components: [{ key: 'correct', weight: 100, rule: 'option_score', correctValue: true, rationale: 'Correct option receives 100.' }] };
}

function emotionOptions() {
  return { promptMode: 'text_mcq', options: [
    { key: 'A', text: 'Happy', score: 20, isCorrect: false, diagnostic: '장면의 감정을 반대로 이해함' },
    { key: 'B', text: 'Sad', score: 100, isCorrect: true },
    { key: 'C', text: 'Angry', score: 40, isCorrect: false, diagnostic: '비슷한 부정 감정을 혼동함' },
    { key: 'D', text: 'Surprised', score: 20, isCorrect: false, diagnostic: '갑작스러운 반응과 감정을 혼동함' }
  ], correct: 'B' };
}

function internalOptions() {
  return { promptMode: 'text_mcq', options: [
    { key: 'A', text: 'I understand something now.', score: 100, isCorrect: true },
    { key: 'B', text: 'I want a new toy.', score: 0, isCorrect: false, diagnostic: '이야기와 무관한 생각을 선택함' },
    { key: 'C', text: 'The place is pretty.', score: 40, isCorrect: false, diagnostic: '표면 정보에 머무름' },
    { key: 'D', text: 'I want to go away.', score: 20, isCorrect: false, diagnostic: '행동과 내면의 이유를 혼동함' }
  ], correct: 'A' };
}

function defaultReporting() {
  return {
    overallFormula: 'overall = average(setting, initiating_event, attempt, reaction, internal_response, consequence)',
    masteryBands: [
      { key: 'stable', min: 85, max: 100, labelKo: '안정' },
      { key: 'developing', min: 70, max: 84, labelKo: '발달 중' },
      { key: 'shaky', min: 50, max: 69, labelKo: '흔들림' },
      { key: 'focus', min: 0, max: 49, labelKo: '집중 보완' }
    ],
    parentFeedback: Object.fromEntries(Object.keys(SG_LABELS).map(key => [key, {
      stable: `${SG_KO[key]} 항목을 안정적으로 이해했습니다.`,
      developing: `${SG_KO[key]} 항목은 대체로 이해하고 있습니다.`,
      shaky: `${SG_KO[key]} 항목의 근거를 더 확인할 필요가 있습니다.`,
      focus: `${SG_KO[key]} 항목을 짧은 문장과 장면으로 다시 연습하세요.`
    }]))
  };
}

function blankQuiz(storyId, title, level, storyText) {
  return buildRuleDraft({ storyId, title, level, storyText });
}

function downloadBlob(filename, mime, content) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJson() {
  updateStoryFromInputs();
  downloadBlob(`${quiz.story.storyId}_quiz_v3.json`, 'application/json;charset=utf-8', JSON.stringify(quiz, null, 2));
}

function exportWorkbook(kind) {
  if (!window.XLSX) {
    toast('XLSX 라이브러리를 불러오지 못했습니다.');
    return;
  }
  updateStoryFromInputs();
  const wb = XLSX.utils.book_new();
  if (kind === 'dev') buildDevWorkbook(wb);
  else buildReadingWorkbook(wb);
  const filename = kind === 'dev' ? `${quiz.story.storyId}_DevSpec.xlsx` : `${quiz.story.storyId}_ReadingQuiz.xlsx`;
  XLSX.writeFile(wb, filename);
}

function aoaSheet(wb, name, rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  return ws;
}

function buildReadingWorkbook(wb) {
  aoaSheet(wb, 'QUIZ_LIST', [
    ['Story ID', quiz.story.storyId],
    ['Title', quiz.story.title],
    ['Level', quiz.story.level],
    [],
    ['Q_ID','No','Story Grammar','Question Type','Instruction','Hint','Scoring Formula'],
    ...quiz.questions.map(q => [q.qId, q.number, q.storyGrammar, q.type, q.instruction, q.hint, q.scoring?.formula || ''])
  ]);
  quiz.questions.forEach(q => {
    const rows = [
      [`Q${String(q.number).padStart(2, '0')} — ${q.storyGrammar}`],
      ['Q_ID', q.qId],
      ['Type', q.type],
      ['Instruction', q.instruction],
      ['Hint', q.hint],
      [],
      ['SECTION A — Resources'],
      ['Kind','ID','Path','Scene ID','Sentence ID'],
      ...resourceRows(q),
      [],
      ['SECTION B — Interaction'],
      ['JSON', JSON.stringify(q.interaction || {}, null, 2)],
      [],
      ['SECTION C — Scoring Components'],
      ['Key','Weight','Rule','Correct Value','Partial Credit','Rationale'],
      ...(q.scoring?.components || []).map(c => [c.key, c.weight, c.rule, c.correctValue, c.partialCredit ?? '', c.rationale || '']),
      [],
      ['SECTION D — Diagnostics'],
      ['Code','Threshold','Message'],
      ...(q.diagnostics || []).map(d => [d.code, d.threshold, d.messageKo])
    ];
    aoaSheet(wb, `Q${String(q.number).padStart(2, '0')}_${q.storyGrammar}`.toUpperCase(), rows);
  });
  aoaSheet(wb, 'SG_SCORING', [
    ['Axis','Question','Score Source','Formula'],
    ...quiz.questions.map(q => [q.storyGrammar, q.qId, 'question_score', q.scoring?.formula || '']),
    [],
    ['Overall', '', '', quiz.reporting?.overallFormula || '']
  ]);
  aoaSheet(wb, 'LRS_MAPPING', [
    ['Q_ID','Verb','Object ID','Result Fields'],
    ...quiz.questions.map(q => [q.qId, q.lrs?.verb || 'answered', q.lrs?.objectId || '', (q.lrs?.resultFields || []).join(', ')])
  ]);
}

function buildDevWorkbook(wb) {
  aoaSheet(wb, 'QUESTIONS', [
    ['q_id','story_id','number','story_grammar','question_type','instruction','hint','max_score','formula'],
    ...quiz.questions.map(q => [q.qId, quiz.story.storyId, q.number, q.storyGrammar, q.type, q.instruction, q.hint, q.scoring?.maxScore || 100, q.scoring?.formula || ''])
  ]);
  aoaSheet(wb, 'RESOURCES', [
    ['q_id','resource_kind','resource_id','path','scene_id','sentence_id'],
    ...quiz.questions.flatMap(q => resourceRows(q).map(r => [q.qId, ...r]))
  ]);
  aoaSheet(wb, 'OPTIONS', [
    ['q_id','option_key','option_text','score','is_correct','diagnostic'],
    ...quiz.questions.flatMap(q => (q.interaction?.options || []).map(o => [q.qId, o.key, o.text, o.score, !!o.isCorrect, o.diagnostic || '']))
  ]);
  aoaSheet(wb, 'SCORING_RULES', [
    ['q_id','component_key','weight','rule','correct_value','partial_credit','rationale'],
    ...quiz.questions.flatMap(q => (q.scoring?.components || []).map(c => [q.qId, c.key, c.weight, c.rule, c.correctValue, c.partialCredit ?? '', c.rationale || '']))
  ]);
  aoaSheet(wb, 'LRS_MAPPING', [
    ['q_id','verb','object_id','result_fields'],
    ...quiz.questions.map(q => [q.qId, q.lrs?.verb || 'answered', q.lrs?.objectId || '', (q.lrs?.resultFields || []).join('|')])
  ]);
}

function resourceRows(q) {
  const rows = [];
  (q.resources?.images || []).forEach(img => rows.push(['image', img.id || '', img.path || '', img.sceneId || '', img.sentenceId || '']));
  if (q.resources?.audio) {
    const a = q.resources.audio;
    rows.push(['audio', a.id || '', a.path || '', a.sceneId || '', a.sentenceId || '']);
  }
  if (q.resources?.scene) rows.push(['scene', q.resources.scene, '', q.resources.scene, q.resources.sentenceId || '']);
  return rows;
}

function exportPreviewHtml() {
  updateStoryFromInputs();
  const data = JSON.stringify(quiz).replace(/</g, '\\u003c');
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(quiz.story.title)} Preview</title><style>body{font-family:Arial,sans-serif;background:#f7f4ff;margin:0;padding:24px;color:#263148}.wrap{max-width:900px;margin:auto}.card{background:#fff;border-radius:22px;padding:22px;margin:16px 0;box-shadow:0 12px 30px rgba(0,0,0,.08)}img{max-width:160px;border-radius:14px;margin:6px}.pill{display:inline-block;background:#ede9fe;color:#6d28d9;border-radius:99px;padding:5px 10px;font-weight:bold}</style></head><body><main class="wrap"><h1>${escapeHtml(quiz.story.title)}</h1><div id="app"></div></main><script>const quiz=${data};const app=document.getElementById('app');const asset=(p)=>/^(https?:|data:|\\/)/.test(p)?p:(quiz.assets.imageBasePath+p);app.innerHTML=quiz.questions.map(q=>'<section class="card"><span class="pill">Q'+q.number+' '+q.storyGrammar+'</span><h2>'+q.instruction+'</h2><p>'+q.hint+'</p><div>'+((q.resources.images||[]).map(i=>'<img src="'+asset(i.path)+'" alt="'+(i.sceneId||i.id)+'">').join(''))+'</div><pre>'+JSON.stringify(q.interaction,null,2)+'</pre></section>').join('');</script></body></html>`;
  downloadBlob(`${quiz.story.storyId}_Preview.html`, 'text/html;charset=utf-8', html);
}

function loadJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      quiz = JSON.parse(reader.result);
      currentQuestionIndex = 0;
      syncStoryInputs();
      renderAll();
      toast('JSON을 불러왔습니다.');
    } catch {
      toast('JSON 파일 형식을 확인해 주세요.');
    }
  };
  reader.readAsText(file, 'utf-8');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function bindEvents() {
  $('load-sample-btn').onclick = loadSample;
  $('json-file').onchange = e => loadJsonFile(e.target.files[0]);
  $('generate-rule-btn').onclick = generateRuleDraft;
  $('generate-ai-btn').onclick = generateAiDraft;
  $('apply-btn').onclick = applyEditorChanges;
  $('question-select').onchange = e => {
    currentQuestionIndex = Number(e.target.value);
    renderAll();
  };
  $('export-json-btn').onclick = exportJson;
  $('export-reading-btn').onclick = () => exportWorkbook('reading');
  $('export-dev-btn').onclick = () => exportWorkbook('dev');
  $('export-html-btn').onclick = exportPreviewHtml;
}

bindEvents();
loadSample();
