let quiz = null;
let currentQuestionIndex = 0;
let batchItems = [];
let batchInputRows = [];
let batchGeneratedItems = [];
let currentBatchIndex = -1;
let assetFiles = new Map();
let assetObjectUrls = [];
let currentStoryPackage = null;
let pendingResourceReplaceKind = '';
let pendingResourceReplaceKey = '';

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
const OPENAI_MODEL = 'gpt-4.1-mini';
const GEMINI_MODEL = 'gemini-2.5-flash';

const QUESTION_BLUEPRINT = [
  { number: 1, storyGrammar: 'consequence', type: 'story_sequence_drag', instruction: 'Put the story scenes in order.', promptMode: 'drag_sequence' },
  { number: 2, storyGrammar: 'setting', type: 'setting_slot_drag', instruction: 'Look at the picture. Fill in the boxes.', promptMode: 'slot_drag' },
  { number: 3, storyGrammar: 'initiating_event', type: 'listen_scene_mcq', instruction: 'Listen. Which scene starts the problem?', promptMode: 'image_mcq' },
  { number: 4, storyGrammar: 'attempt', type: 'scene_word_unscramble', instruction: 'Put the story words in order.', promptMode: 'word_unscramble' },
  { number: 5, storyGrammar: 'reaction', type: 'emotion_mcq', instruction: 'How does the character feel here?', promptMode: 'text_mcq' },
  { number: 6, storyGrammar: 'internal_response', type: 'internal_response_mcq', instruction: 'What is the character thinking?', promptMode: 'text_mcq' }
];

const BATCH_COLUMNS = [
  'story_id',
  'title',
  'level',
  'story_text',
  'notes'
];

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

function isLocalOrigin() {
  return ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
}

async function loadGenerationPrompt() {
  const res = await fetch('prompts/story_grammar_v3.md', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Prompt file not found: HTTP ${res.status}`);
  return res.text();
}

function extractJsonFromText(text) {
  let raw = String(text || '').trim();
  if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  return JSON.parse(raw);
}

function aiInputFromRow(row, index = 0) {
  const storyId = row.story_id || row.storyId || `STORY_${String(index + 1).padStart(3, '0')}`;
  return {
    storyId,
    title: row.title || row.Title || storyId,
    level: row.level || row.Level || 'Draft Level',
    storyText: row.story_text || row.storyText || row['Story Text'] || '',
    assetNaming: {
      image: '{storyId}_SC##_I.webp or {storyId}_SC##_I_1920x1080.webp',
      audio: '{storyId}_SC##_ST##_N_A.mp3',
      cover: '{storyId}_Cover_L_I.webp or {storyId}_Cover_L_I_1920x1080.webp',
      background: '{storyId}_Talking_BG_I.webp'
    },
    questionBlueprint: QUESTION_BLUEPRINT
  };
}

function applyDefaultAssetsToQuiz(sourceQuiz, row = {}) {
  const qz = sourceQuiz.quiz || sourceQuiz;
  const input = aiInputFromRow(row);
  qz.schemaVersion = qz.schemaVersion || 'quiz-v3.0';
  qz.story = qz.story || {};
  qz.story.storyId = qz.story.storyId || input.storyId;
  qz.story.title = qz.story.title || input.title;
  qz.story.level = qz.story.level || input.level;
  qz.story.text = qz.story.text || input.storyText;
  qz.assets = qz.assets || {};
  qz.assets.imageBasePath = row.image_base_path || qz.assets.imageBasePath || `../v3/${qz.story.storyId}/Image/`;
  qz.assets.audioBasePath = row.audio_base_path || qz.assets.audioBasePath || `../v3/${qz.story.storyId}/Audio/`;
  qz.assets.coverBasePath = row.cover_base_path || qz.assets.coverBasePath || `../v3/${qz.story.storyId}/Cover/`;
  qz.assets.backgroundImage = row.background_image || qz.assets.backgroundImage || `../v3/${qz.story.storyId}/Image/${qz.story.storyId}_Talking_BG_I.webp`;
  qz.assets.coverImage = row.cover_image || qz.assets.coverImage || `../v3/${qz.story.storyId}/Cover/${qz.story.storyId}_Cover_L_I.webp`;
  qz.assets.hintCharacter = row.hint_character || qz.assets.hintCharacter || `../v3/${qz.story.storyId}/Assets/BKTK_Characters_Bookey.png`;
  return qz;
}

function hasMeaningfulInteraction(q) {
  const i = q?.interaction || {};
  if (Array.isArray(i.options) && i.options.length >= 2) return true;
  if (Array.isArray(i.items) && i.items.length >= 2) return true;
  if (Array.isArray(i.slots) && i.slots.length >= 1) return true;
  if (Array.isArray(i.correct) && i.correct.length >= 1) return true;
  if (i.correct && typeof i.correct === 'object' && Object.keys(i.correct).length) return true;
  return false;
}

function hasMeaningfulScoring(q) {
  return !!(q?.scoring?.formula && Array.isArray(q.scoring.components) && q.scoring.components.length);
}

function hasImageResources(q) {
  return Array.isArray(q?.resources?.images) && q.resources.images.length > 0;
}

function hasMcqOptions(q) {
  return Array.isArray(q?.interaction?.options) && q.interaction.options.length >= 2;
}

function isTemplateCompatible(baseQ, aiQ) {
  if (!aiQ) return false;
  const promptMode = aiQ.interaction?.promptMode || '';
  if (baseQ.type === 'story_sequence_drag') {
    return Array.isArray(aiQ.interaction?.correct)
      && aiQ.interaction.correct.length >= 4
      && aiQ.interaction.correct.every(value => /^SC\d{2}$/i.test(String(value)))
      && hasImageResources(aiQ);
  }
  if (baseQ.type === 'setting_slot_drag') {
    return Array.isArray(aiQ.interaction?.slots)
      && aiQ.interaction.slots.length >= 3
      && (
        (Array.isArray(aiQ.interaction?.items) && aiQ.interaction.items.length >= 3)
        || (Array.isArray(aiQ.interaction?.options) && aiQ.interaction.options.length >= 3)
      );
  }
  if (baseQ.type === 'listen_scene_mcq') {
    return hasMcqOptions(aiQ) && hasImageResources(aiQ);
  }
  if (baseQ.type === 'scene_word_unscramble') {
    return Array.isArray(aiQ.interaction?.correct)
      && aiQ.interaction.correct.length >= 3
      && hasImageResources(aiQ);
  }
  if (baseQ.type === 'emotion_mcq' || baseQ.type === 'internal_response_mcq') {
    return hasMcqOptions(aiQ);
  }
  return promptMode === baseQ.interaction?.promptMode;
}

function isInstructionCompatible(baseQ, instruction) {
  const value = String(instruction || '').trim();
  if (!value) return false;
  if (baseQ.type === 'emotion_mcq') return /^How does .+ feel here\?$/i.test(value);
  if (baseQ.type === 'internal_response_mcq') return /^What is .+ thinking\?$/i.test(value);
  return value === baseQ.instruction;
}

function matchingQuestionScore(baseQ, aiQ) {
  if (!aiQ) return 0;
  let score = 0;
  if (Number(aiQ.number) === Number(baseQ.number)) score += 40;
  if (aiQ.storyGrammar === baseQ.storyGrammar) score += 35;
  if (aiQ.type === baseQ.type) score += 20;
  if ((aiQ.interaction?.promptMode || '') === (baseQ.interaction?.promptMode || '')) score += 10;
  if (isTemplateCompatible(baseQ, aiQ)) score += 40;
  return score;
}

function bestAiQuestionForTemplate(baseQ, incomingQuestions) {
  return [...(incomingQuestions || [])]
    .map(q => ({ q, score: matchingQuestionScore(baseQ, q) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.q || null;
}

function templateScoringForQuestion(q) {
  if (q.type === 'story_sequence_drag') {
    const sequence = Array.isArray(q.interaction?.correct) && q.interaction.correct.length
      ? q.interaction.correct
      : (q.interaction?.items || []);
    return weightedPosition(sequence);
  }
  if (q.type === 'setting_slot_drag') return settingScoring(q.interaction?.correct);
  if (q.type === 'scene_word_unscramble') {
    const words = Array.isArray(q.interaction?.correct) ? q.interaction.correct : [];
    return wordScoring(words);
  }
  if (hasMcqOptions(q)) {
    return {
      type: 'fixed_option_score',
      maxScore: 100,
      formula: 'score = selected_option.score',
      components: q.interaction.options.map(opt => ({
        key: opt.key,
        weight: Number(opt.score) || 0,
        rule: 'option_score',
        correctValue: !!opt.isCorrect,
        rationale: opt.diagnostic || (opt.isCorrect ? 'Correct option.' : 'Distractor option.')
      }))
    };
  }
  return q.scoring || fixedScoring();
}

function mergeQuestionDraft(baseQ, aiQ) {
  if (!aiQ) return baseQ;
  const merged = deepClone(baseQ);
  const compatible = isTemplateCompatible(baseQ, aiQ);
  merged.qId = baseQ.qId;
  merged.number = baseQ.number;
  merged.storyGrammar = baseQ.storyGrammar;
  merged.type = baseQ.type;
  merged.instruction = isInstructionCompatible(baseQ, aiQ.instruction) ? aiQ.instruction : baseQ.instruction;
  if (aiQ.hint) merged.hint = aiQ.hint;
  if (compatible && aiQ.resources && (aiQ.resources.images || aiQ.resources.audio || aiQ.resources.scene)) merged.resources = aiQ.resources;
  if (compatible && hasMeaningfulInteraction(aiQ)) merged.interaction = aiQ.interaction;
  if (Array.isArray(aiQ.diagnostics) && aiQ.diagnostics.length) merged.diagnostics = aiQ.diagnostics;
  merged.scoring = templateScoringForQuestion(merged);
  merged.lrs = baseQ.lrs;
  return merged;
}

function slugKey(value, fallback) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || fallback;
}

function normalizeSettingItem(item, index) {
  if (typeof item === 'string') {
    return { key: slugKey(item, `item_${index + 1}`), text: item, slot: '' };
  }
  const text = item?.text || item?.label || item?.value || item?.key || `item ${index + 1}`;
  return {
    ...item,
    key: item?.key || slugKey(text, `item_${index + 1}`),
    text,
    slot: item?.slot || item?.category || ''
  };
}

function normalizeSettingInteraction(interaction = {}) {
  const aiSlots = Array.isArray(interaction.slots) ? interaction.slots : [];
  const fixedSlots = [
    { key: 'who', label: 'Who?', weight: 2.5 },
    { key: 'where', label: 'Where?', weight: 2 },
    { key: 'at_first', label: 'At first...', weight: 1.5 }
  ];
  const sourceItems = Array.isArray(interaction.items) && interaction.items.length
    ? interaction.items
    : (Array.isArray(interaction.options) ? interaction.options : []);
  const items = sourceItems.map(normalizeSettingItem);
  const itemByKey = new Map(items.map(item => [String(item.key), item]));
  const correct = {};
  const slots = fixedSlots.map(slot => {
    const aiSlot = aiSlots.find(s => s.key === slot.key || s.label === slot.label) || {};
    let correctValue = interaction.correct?.[slot.key] || aiSlot.correct || slot.correct;
    if (correctValue && !itemByKey.has(String(correctValue))) {
      const matchedItem = items.find(item => String(item.text || '').toLowerCase() === String(correctValue).toLowerCase());
      if (matchedItem) {
        correctValue = matchedItem.key;
      }
    }
    if (correctValue && !itemByKey.has(String(correctValue))) {
      const text = String(correctValue);
      const key = `${slot.key}_${slugKey(text, 'correct')}`;
      const newItem = { key, text, slot: slot.key, diagnostic: aiSlot.diagnostic || '' };
      items.push(newItem);
      itemByKey.set(key, newItem);
      correctValue = key;
    }
    correct[slot.key] = correctValue || slot.correct || `${slot.key}_correct`;
    return { ...slot, ...aiSlot, key: slot.key, label: slot.label, correct: correct[slot.key], weight: slot.weight };
  });
  return {
    ...interaction,
    promptMode: 'slot_drag',
    slots,
    items,
    correct
  };
}

function storySentenceTextById(storyText, sentenceId) {
  if (!sentenceId) return '';
  for (const scene of parseStory(storyText || '')) {
    const found = (scene.sentences || []).find(sentence => sentence.sentenceId === sentenceId);
    if (found) return found.text;
  }
  return '';
}

function normalizeQuestionForTemplate(q, storyText = '') {
  const normalized = deepClone(q);
  if (normalized.type === 'setting_slot_drag') {
    normalized.interaction = normalizeSettingInteraction(normalized.interaction || {});
    normalized.scoring = settingScoring(normalized.interaction.correct);
  }
  if (normalized.type === 'scene_word_unscramble') {
    const sentence = storySentenceTextById(storyText, normalized.resources?.sentenceId);
    const source = sentence || (Array.isArray(normalized.interaction?.correct) ? normalized.interaction.correct.join(' ') : '');
    const tokens = storyWordTokens(source);
    if (tokens.length >= 3) {
      normalized.interaction = {
        ...(normalized.interaction || {}),
        promptMode: 'word_unscramble',
        correct: tokens,
        items: [...tokens].reverse()
      };
      normalized.scoring = wordScoring(tokens);
    }
  }
  return normalized;
}

function placeholderText(value) {
  const text = String(value || '').trim().toLowerCase();
  return !text
    || ['main_character', 'main character', 'main_place', 'main place', 'story place', 'other character', 'first action', 'later problem', 'other place', 'opening_state', 'opening state'].includes(text)
    || /^item \d+$/.test(text);
}

function contaminatedHint(value, storyText = '') {
  const text = String(value || '').trim();
  const lower = text.toLowerCase();
  if (!text) return true;
  if (text.length > 120) return true;
  if (/(wait|example|specific for this story|let's make|do not|a1-level|prompt|template|instruction)/i.test(text)) return true;
  if (/milo/i.test(text) && !/milo/i.test(storyText || '')) return true;
  if (/podo|didi/i.test(text) && !/podo|didi/i.test(storyText || '')) return true;
  return false;
}

function contaminatedVisibleText(value, storyText = '') {
  const text = String(value || '').trim();
  if (!text) return true;
  if (text.length > 140) return true;
  if (/(wait|example|specific for this story|let's make|do not|a1-level|prompt|template|json|schema|instruction)/i.test(text)) return true;
  if (/milo/i.test(text) && !/milo/i.test(storyText || '')) return true;
  return false;
}

function firstSceneText(storyText = '') {
  const scenes = parseStory(storyText || '');
  return (scenes[0]?.sentences || []).map(sentence => sentence.text).join(' ');
}

function storyNamesFromText(text = '') {
  const cleaned = String(text || '').replace(/["“”]/g, ' ');
  const namedMatch = cleaned.match(/\bnamed\s+([A-Z][a-z]+)(?:\s+and\s+([A-Z][a-z]+))?/);
  if (namedMatch) return [namedMatch[1], namedMatch[2]].filter(Boolean).join(' and ');
  const objectName = cleaned.match(/\b(the\s+[A-Z][a-z]+(?:\s+[a-z]+)?)/i);
  if (objectName) return objectName[1].replace(/\s+/g, ' ').replace(/^The\b/, 'the');
  const names = [...cleaned.matchAll(/\b[A-Z][a-z]{2,}\b/g)]
    .map(match => match[0])
    .filter(word => !['The','A','An','On','In','At','One','Once','Long','Deep','Suddenly','But'].includes(word));
  return [...new Set(names)].slice(0, 2).join(' and ') || 'the character';
}

function storyPlaceFromText(text = '') {
  const match = String(text || '').match(/\b(in|at|on|near|inside|into|under|over)\s+(the\s+|a\s+|an\s+)?([a-z]+(?:\s+[a-z]+){0,3})/i);
  if (!match) return 'the story place';
  return `${match[1].toLowerCase()} ${match[2] || ''}${match[3]}`.replace(/\s+/g, ' ').trim();
}

function openingStateFromText(text = '') {
  const sentence = String(text || '').split(/[.!?]/)[0] || '';
  const namedSubject = storyNamesFromText(sentence);
  if (namedSubject && namedSubject !== 'the character') {
    const escaped = namedSubject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const subjectMatch = sentence.match(new RegExp(`^\\s*${escaped}\\s+(.+)$`, 'i'));
    if (subjectMatch?.[1]) return subjectMatch[1].trim().replace(/^[A-Z]/, ch => ch.toLowerCase());
  }
  const afterComma = sentence.includes(',') ? sentence.split(',').slice(1).join(',').trim() : sentence.trim();
  const words = afterComma.split(/\s+/).filter(Boolean);
  if (words.length <= 4) return afterComma.toLowerCase() || 'starts the story';
  return words.slice(Math.max(0, words.length - 4)).join(' ').replace(/^[A-Z]/, ch => ch.toLowerCase());
}

function fallbackSettingInteraction(storyText = '') {
  const opening = firstSceneText(storyText);
  const who = storyNamesFromText(opening);
  const where = storyPlaceFromText(opening);
  const atFirst = openingStateFromText(opening);
  const distractors = [
    { key: 'other_character', text: who.includes(' and ') ? 'one friend' : 'another character', slot: 'who' },
    { key: 'other_place', text: 'another place', slot: 'where' },
    { key: 'later_event', text: 'the problem starts', slot: 'at_first' }
  ];
  return normalizeSettingInteraction({
    promptMode: 'slot_drag',
    slots: [
      { key: 'who', label: 'Who?', correct: 'setting_who' },
      { key: 'where', label: 'Where?', correct: 'setting_where' },
      { key: 'at_first', label: 'At first...', correct: 'setting_first' }
    ],
    items: [
      { key: 'setting_who', text: who, slot: 'who' },
      { key: 'setting_where', text: where, slot: 'where' },
      { key: 'setting_first', text: atFirst, slot: 'at_first' },
      ...distractors
    ],
    correct: { who: 'setting_who', where: 'setting_where', at_first: 'setting_first' }
  });
}

function fallbackHint(q, storyText = '') {
  const opening = firstSceneText(storyText);
  const who = storyNamesFromText(opening);
  if (q.type === 'story_sequence_drag') return 'Think about what happens first and last.';
  if (q.type === 'setting_slot_drag') {
    const plural = /\sand\s/.test(who);
    return plural ? 'Who is there? Where are they?' : 'Who is there? Where does the story start?';
  }
  if (q.type === 'listen_scene_mcq') return 'Listen for the first problem.';
  if (q.type === 'scene_word_unscramble') return 'Start with who. Then find the action.';
  if (q.type === 'emotion_mcq') return 'Look at the face and the scene.';
  if (q.type === 'internal_response_mcq') return 'Think about what the character learns.';
  return 'Look at the story clues.';
}

function reconcileQuizResourcesWithPackage(qz) {
  if (!qz || !currentStoryPackage) return qz;
  qz.assets = qz.assets || {};
  if (currentStoryPackage.backgroundFile) qz.assets.backgroundImage = currentStoryPackage.backgroundFile.name;
  if (currentStoryPackage.coverFiles?.[0]) qz.assets.coverImage = currentStoryPackage.coverFiles[0].name;
  (qz.questions || []).forEach(q => {
    q.resources = q.resources || {};
    if (Array.isArray(q.resources.images)) {
      q.resources.images.forEach(img => {
        const scene = (img.sceneId || img.id || sceneIdFromPath(img.path) || '').toUpperCase();
        const file = packageImageFileForScene(scene);
        if (file) {
          img.path = file.name;
          img.sceneId = scene;
          img.id = img.id || scene;
        }
      });
    }
    const scene = q.resources.scene || sceneIdFromPath(q.resources?.images?.[0]?.path);
    if ((!q.resources.images || !q.resources.images.length) && scene) {
      const file = packageImageFileForScene(scene);
      if (file) q.resources.images = [{ id: scene, path: file.name, kind: 'image', sceneId: scene }];
    }
    const audio = q.resources.audio;
    if (audio) {
      const audioId = (audio.id || sentenceAudioIdFromPath(audio.path) || `${audio.sceneId || ''}_${audio.sentenceId || ''}_A`).toUpperCase();
      const file = packageAudioFileForId(audioId);
      if (file) audio.path = file.name;
    }
  });
  return qz;
}

function sanitizeGeneratedQuiz(qz) {
  if (!qz) return qz;
  const storyText = qz.story?.text || '';
  (qz.questions || []).forEach(q => {
    if (contaminatedHint(q.hint, storyText)) q.hint = fallbackHint(q, storyText);
    if (q.type === 'setting_slot_drag') {
      const items = q.interaction?.items || [];
      const placeholderCount = items.filter(item => placeholderText(item.text || item.key)).length;
      const dirtyItem = items.some(item => contaminatedVisibleText(item.text || item.key, storyText));
      if (items.length < 6 || placeholderCount >= Math.ceil(items.length / 2) || dirtyItem) {
        q.interaction = fallbackSettingInteraction(storyText);
        q.scoring = settingScoring(q.interaction.correct);
      }
    }
    if ((q.type === 'emotion_mcq' || q.type === 'internal_response_mcq') && Array.isArray(q.interaction?.options)) {
      const dirtyOption = q.interaction.options.some(opt => contaminatedVisibleText(opt.text || opt.key, storyText));
      if (dirtyOption) {
        q.interaction = q.type === 'emotion_mcq' ? emotionOptions() : internalOptions();
        q.scoring = templateScoringForQuestion(q);
      }
    }
  });
  return reconcileQuizResourcesWithPackage(qz);
}

function completeGeneratedQuiz(generatedQuiz, row = {}) {
  const base = quizFromBatchRow(normalizeBatchRow(row, 0));
  const incoming = applyDefaultAssetsToQuiz(generatedQuiz, row);
  const incomingQuestions = incoming.questions || [];
  const completed = deepClone(base);
  completed.schemaVersion = incoming.schemaVersion || base.schemaVersion;
  completed.story = { ...base.story, ...(incoming.story || {}) };
  completed.assets = { ...base.assets, ...(incoming.assets || {}) };
  completed.storyGrammarAxes = Array.isArray(incoming.storyGrammarAxes) && incoming.storyGrammarAxes.length ? incoming.storyGrammarAxes : base.storyGrammarAxes;
  completed.questions = base.questions.map(baseQ => {
    const aiQ = bestAiQuestionForTemplate(baseQ, incomingQuestions);
    return mergeQuestionDraft(baseQ, aiQ);
  }).map(q => normalizeQuestionForTemplate(q, completed.story?.text || row.story_text || ''));
  completed.reporting = incoming.reporting || base.reporting;
  completed.generation = incoming.generation || base.generation;
  return sanitizeGeneratedQuiz(applyDefaultAssetsToQuiz(completed, row));
}

async function callOpenAiInBrowser(prompt, userPayload, apiKey) {
  if (!apiKey) throw new Error('OpenAI API Key를 입력해 주세요.');
  const body = {
    model: OPENAI_MODEL,
    input: [
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify(userPayload) }
    ],
    text: { format: { type: 'json_object' } }
  };
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `OpenAI HTTP ${res.status}`);
  let text = data.output_text || '';
  if (!text && Array.isArray(data.output)) {
    text = data.output.flatMap(item => item.content || [])
      .filter(content => content.type === 'output_text' || content.type === 'text')
      .map(content => content.text || '')
      .join('');
  }
  return extractJsonFromText(text);
}

async function callGeminiInBrowser(prompt, userPayload, apiKey) {
  if (!apiKey) throw new Error('Gemini API Key를 입력해 주세요.');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: `${prompt}\n\nINPUT:\n${JSON.stringify(userPayload)}` }]
    }],
    generationConfig: { responseMimeType: 'application/json' }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Gemini HTTP ${res.status}`);
  const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
  return extractJsonFromText(text);
}

async function callAiInBrowser(provider, prompt, userPayload, apiKey) {
  return provider === 'gemini'
    ? callGeminiInBrowser(prompt, userPayload, apiKey)
    : callOpenAiInBrowser(prompt, userPayload, apiKey);
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
  currentStoryPackage = null;
  renderResourceSummary(null);
  if ($('package-status')) $('package-status').textContent = 'Sample loaded. Upload a story folder to replace it.';
  currentBatchIndex = -1;
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
  renderBatchList();
  renderReviewPanel();
}

function showLeftSection(mode = 'generate') {
  const isGenerate = mode === 'generate';
  $('left-tab-generate')?.classList.toggle('active', isGenerate);
  $('left-tab-open')?.classList.toggle('active', !isGenerate);
  $('left-section-generate')?.classList.toggle('active', isGenerate);
  $('left-section-open')?.classList.toggle('active', !isGenerate);
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
  const localAsset = findLocalAssetUrl(path);
  if (localAsset) return localAsset;
  if (/^(https?:|data:|blob:|\/)/.test(path)) return path;
  const base = kind === 'audio' ? quiz.assets.audioBasePath : quiz.assets.imageBasePath;
  const joined = `${base || ''}${path}`;
  return findLocalAssetUrl(joined) || joined;
}

function fileName(pathValue) {
  return String(pathValue || '').split(/[\\/]/).pop();
}

function basename(pathValue) {
  return fileName(pathValue).toLowerCase();
}

function assetStem(pathValue) {
  return basename(pathValue)
    .replace(/\.(png|jpe?g|webp|gif|mp3|wav|m4a|ogg)$/i, '')
    .replace(/_(?:\d{3,4}x\d{3,4}|[0-9]+p)$/i, '');
}

function assetCount() {
  return new Set([...assetFiles.values()].map(value => value.file)).size;
}

function findLocalAsset(pathValue) {
  if (!pathValue || !assetFiles.size) return '';
  const normalized = String(pathValue).replace(/\\/g, '/').toLowerCase();
  const name = basename(normalized);
  const stem = assetStem(normalized);
  if (assetFiles.has(normalized)) return assetFiles.get(normalized);
  if (assetFiles.has(name)) return assetFiles.get(name);
  if (stem && assetFiles.has(`stem:${stem}`)) return assetFiles.get(`stem:${stem}`);
  for (const [key, value] of assetFiles.entries()) {
    if (key.startsWith('stem:')) continue;
    if (key.endsWith('/' + name) || normalized.endsWith('/' + key)) return value;
    if (stem && assetStem(key) === stem) return value;
  }
  return null;
}

function findLocalAssetUrl(pathValue) {
  return findLocalAsset(pathValue)?.url || '';
}

function findLocalAssetFile(pathValue) {
  return findLocalAsset(pathValue)?.file || null;
}

function resolvedAssetFileName(pathValue) {
  return findLocalAssetFile(pathValue)?.name || fileName(pathValue);
}

function sceneIdFromPath(pathValue) {
  const match = String(pathValue || '').match(/(SC\d{2})/i);
  return match ? match[1].toUpperCase() : '';
}

function sentenceAudioIdFromPath(pathValue) {
  const match = String(pathValue || '').match(/(SC\d{2}_ST\d{2}_N_A)/i);
  return match ? match[1].toUpperCase() : '';
}

function packageImageFileForScene(sceneId) {
  if (!sceneId || !currentStoryPackage?.sceneImages) return null;
  return currentStoryPackage.sceneImages.get(String(sceneId).toUpperCase()) || null;
}

function packageAudioFileForId(audioId) {
  if (!audioId || !currentStoryPackage?.audioFiles) return null;
  return currentStoryPackage.audioFiles.get(String(audioId).toUpperCase()) || null;
}

function imagesForQuestion(q) {
  const images = Array.isArray(q?.resources?.images) ? q.resources.images : [];
  if (images.length) return images;
  const scene = q?.resources?.scene;
  const storyId = quiz?.story?.storyId || 'OG0000';
  if (scene) return [{ id: scene, path: `${storyId}_${scene}_I.webp`, kind: 'image', sceneId: scene }];
  return [];
}

function imageHtml(resource, className = '') {
  const scene = resource?.sceneId || resource?.id || sceneIdFromPath(resource?.path) || 'Scene';
  const packageFile = packageImageFileForScene(scene);
  const url = packageFile ? findLocalAssetUrl(packageFile.name) : assetUrl(resource?.path, 'image');
  return `<div class="scene-card ${className}">
    <img src="${escapeAttr(url)}" alt="${escapeAttr(scene)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div class="scene-fallback" style="display:none">${escapeHtml(scene)}</div>
  </div>`;
}

function playPreviewAudio(pathValue) {
  const audioId = sentenceAudioIdFromPath(pathValue);
  const packageFile = packageAudioFileForId(audioId);
  const url = packageFile ? findLocalAssetUrl(packageFile.name) : assetUrl(pathValue, 'audio');
  if (!url) {
    toast('Audio file is missing.');
    return;
  }
  const audio = new Audio(url);
  audio.play().catch(error => {
    console.error(error);
    toast('Audio could not play. Check the audio file.');
  });
}

function renderPreview() {
  const stage = $('preview-stage');
  const bg = quiz.assets?.backgroundImage;
  const bgUrl = findLocalAssetUrl(bg) || bg;
  stage.style.setProperty('--preview-bg', bgUrl ? `url("${bgUrl}")` : 'linear-gradient(140deg,#F7F4FF,#EBF7FF)');
  const q = quiz.questions[currentQuestionIndex];
  const images = imagesForQuestion(q);
  const hintAvatarPath = quiz.assets?.hintCharacter || `../v3/${quiz.story?.storyId || 'OG0021'}/Assets/BKTK_Characters_Bookey.png`;
  const hintAvatar = findLocalAssetUrl(hintAvatarPath) || hintAvatarPath;
  const parts = [];
  parts.push(`<article class="quiz-card">`);
  parts.push(`<div class="quiz-meta"><span class="q-badge">Q${q.number || currentQuestionIndex + 1}</span><span class="sg-tag">${escapeHtml(SG_LABELS[q.storyGrammar] || q.storyGrammar)}</span></div>`);
  parts.push(`<div class="instruction">${escapeHtml(q.instruction || '')}</div>`);
  const hintHtml = `<div class="hint-row"><img class="hint-avatar" src="${escapeAttr(hintAvatar)}" alt="Bookey"><span>${escapeHtml(q.hint || '')}</span></div>`;

  if (q.type === 'story_sequence_drag') {
    parts.push(`<div class="scene-grid">${images.map(img => imageHtml(img)).join('')}</div>`);
    parts.push(`<div class="sequence-slots">${(q.interaction?.correct || []).map((_, i) => `<div class="slot">Scene ${i + 1}</div>`).join('')}</div>`);
  } else if (q.type === 'setting_slot_drag') {
    parts.push(`<div class="scene-grid single">${images.slice(0, 1).map(img => imageHtml(img)).join('')}</div>`);
    parts.push(`<div class="setting-slots">${(q.interaction?.slots || []).map(slot => `<div class="setting-row"><div class="setting-label">${escapeHtml(slot.label)}</div><div class="slot">Drop here</div></div>`).join('')}</div>`);
    parts.push(`<div class="word-row">${(q.interaction?.items || []).map(item => `<div class="word-chip">${escapeHtml(item.text || item.key)}</div>`).join('')}</div>`);
  } else if (q.type === 'listen_scene_mcq') {
    const audio = q.resources?.audio;
    parts.push(`<button type="button" class="audio-chip" onclick="playPreviewAudio('${escapeAttr(audio?.path || '')}')">Listen</button>`);
    parts.push(`<div class="scene-grid">${images.map(img => imageHtml(img)).join('')}</div>`);
  } else if (q.type === 'scene_word_unscramble') {
    parts.push(`<div class="scene-grid single">${images.slice(0, 1).map(img => imageHtml(img)).join('')}</div>`);
    parts.push(`<div class="word-row">${(q.interaction?.items || []).map(word => `<div class="word-chip">${escapeHtml(word)}</div>`).join('')}</div>`);
  } else {
    parts.push(`<div class="scene-grid single">${images.slice(0, 1).map(img => imageHtml(img)).join('')}</div>`);
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
    syncCurrentBatchItem();
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
  if (currentBatchIndex >= 0 && batchItems[currentBatchIndex]) {
    const item = batchItems[currentBatchIndex];
    item.row.story_id = storyId;
    item.row.title = title;
    item.row.level = level;
    item.row.story_text = storyText;
    item.quiz = deepClone(quiz);
  }
}

function currentStoryRow() {
  const row = {
    story_id: $('story-id')?.value.trim() || currentStoryPackage?.storyId || 'OG0000',
    title: $('story-title')?.value.trim() || currentStoryPackage?.title || 'Untitled Story',
    level: $('story-level')?.value.trim() || 'Draft Level',
    story_text: $('story-text')?.value || currentStoryPackage?.storyText || '',
    notes: ''
  };
  if (currentStoryPackage?.backgroundFile) row.background_image = currentStoryPackage.backgroundFile.name;
  if (currentStoryPackage?.coverFiles?.[0]) row.cover_image = currentStoryPackage.coverFiles[0].name;
  return row;
}

async function generateRuleDraft() {
  syncCurrentBatchItem();
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
  currentBatchIndex = -1;
  currentQuestionIndex = 0;
  renderAll();
  toast('초안을 생성했습니다. 오른쪽에서 검수해 주세요.');
}

async function generateAiDraft() {
  syncCurrentBatchItem();
  updateStoryFromInputs();
  const apiKey = $('api-key').value.trim();
  const row = currentStoryRow();
  if (!row.story_text.trim()) {
    toast('Upload a story TXT file or paste story text first.');
    return;
  }
  const payload = {
    provider: $('ai-provider').value,
    input: {
      storyId: row.story_id,
      title: row.title,
      level: row.level,
      storyText: row.story_text,
      assetNaming: {
        image: '{storyId}_SC##_I.webp or {storyId}_SC##_I_1920x1080.webp',
        audio: '{storyId}_SC##_ST##_N_A.mp3',
        cover: '{storyId}_Cover_L_I.webp or {storyId}_Cover_L_I_1920x1080.webp',
        background: '{storyId}_Talking_BG_I.webp'
      },
      questionBlueprint: QUESTION_BLUEPRINT
    }
  };
  if (apiKey) payload.apiKey = apiKey;
  const btn = $('generate-ai-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  try {
    if (isLocalOrigin()) {
      const res = await fetch('/api/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'AI generation failed.');
      quiz = completeGeneratedQuiz(data.quiz, row);
    } else {
      const prompt = await loadGenerationPrompt();
      const generated = await callAiInBrowser(payload.provider, prompt, payload.input, apiKey);
      quiz = completeGeneratedQuiz(generated, row);
    }
    const hintCount = (quiz.questions || []).filter(q => String(q.hint || '').trim()).length;
    currentBatchIndex = -1;
    currentQuestionIndex = 0;
    renderAll();
    toast(`Quiz generated with ${payload.provider}. ${hintCount}/6 hints ready.`);
  } catch (error) {
    toast(`AI generation failed: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
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

function storyWordTokens(sentence) {
  const raw = String(sentence || '').match(/[A-Za-z']+[,\.!?]?/g) || [];
  const compoundPairs = new Set([
    'plastic bag',
    'rainbow cloud',
    'crystal box',
    'dark canyon',
    'ocean floor',
    'lost light',
    'tiny rock',
    'youngest son',
    'youngest man'
  ]);
  const modifierWords = new Set([
    'plastic', 'rainbow', 'crystal', 'dark', 'deep', 'little', 'big', 'quiet',
    'lost', 'youngest', 'oldest', 'middle', 'bright', 'gray', 'grey', 'clear'
  ]);
  const clean = token => String(token || '').replace(/[,\.\!?]+$/g, '').toLowerCase();
  const isCompoundPair = (a, b) => compoundPairs.has(`${clean(a)} ${clean(b)}`);
  const shouldGroupThree = (article, first, second) => {
    if (!/^(a|an|the)$/i.test(article) || !first || !second) return false;
    return isCompoundPair(first, second) || modifierWords.has(clean(first));
  };
  const grouped = [];
  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i];
    if (shouldGroupThree(token, raw[i + 1], raw[i + 2])) {
      grouped.push(`${token} ${raw[i + 1]} ${raw[i + 2]}`);
      i += 2;
    } else if (/^(a|an|the)$/i.test(token) && raw[i + 1]) {
      grouped.push(`${token} ${raw[i + 1]}`);
      i += 1;
    } else if (raw[i + 1] && isCompoundPair(token, raw[i + 1])) {
      grouped.push(`${token} ${raw[i + 1]}`);
      i += 1;
    } else {
      grouped.push(token);
    }
  }
  return grouped;
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
  const image = scene => ({ id: scene, path: `${storyId}_${scene}_I.webp`, kind: 'image', sceneId: scene });
  const findSentence = scene => (scenes.find(s => s.sceneId === scene)?.sentences?.[0]) || { sentenceId: `${scene}_ST01_N`, text: 'Put the words in order.' };
  const attemptSentence = findSentence(attempt);
  const words = (storyWordTokens(attemptSentence.text).length ? storyWordTokens(attemptSentence.text) : ['Put','the words','in','order.']).slice(0, 8);
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
      backgroundImage: `../v3/${storyId}/Image/${storyId}_Talking_BG_I.webp`,
      coverImage: `../v3/${storyId}/Cover/${storyId}_Cover_L_I.webp`,
      hintCharacter: `../v3/${storyId}/Assets/BKTK_Characters_Bookey.png`
    },
    storyGrammarAxes: Object.keys(SG_LABELS).map(key => ({ key, labelEn: SG_LABELS[key], labelKo: SG_KO[key], descriptionKo: '' })),
    questions: [
      mkQ(1, 'story_sequence_drag', 'consequence', 'Put the story scenes in order.', 'Think about the story from start to end.', { images: sequence.map(image) }, { promptMode: 'drag_sequence', items: sequence, correct: sequence }, weightedPosition(sequence)),
      mkQ(2, 'setting_slot_drag', 'setting', 'Look at the picture. Fill in the boxes.', 'Who is there? Where are they?', { images: [image(first)], scene: first }, settingInteraction(), settingScoring()),
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
      { key: 'at_first', label: 'At first...', correct: 'opening_state', weight: 1.5 }
    ],
    items: [
      { key: 'main_place', text: 'story place', slot: 'where' },
      { key: 'other_character', text: 'other character', slot: 'who', diagnostic: '주변 인물을 주인공으로 혼동함' },
      { key: 'opening_state', text: 'first action', slot: 'at_first' },
      { key: 'main_character', text: 'main character', slot: 'who' },
      { key: 'other_place', text: 'other place', slot: 'where', diagnostic: '다른 장소를 시작 배경으로 혼동함' },
      { key: 'later_problem', text: 'later problem', slot: 'at_first', diagnostic: '문제 장면을 처음 상황으로 혼동함' }
    ],
    correct: { who: 'main_character', where: 'main_place', at_first: 'opening_state' }
  };
}

function settingScoring(correct = {}) {
  return {
    type: 'weighted_slot_match',
    maxScore: 100,
    formula: 'full slot weight if exact target; 35% slot credit if same category but wrong card; 0 for wrong category',
    components: [
      { key: 'who', weight: 2.5, rule: 'slot_match', correctValue: correct.who || 'main_character', partialCredit: .35, rationale: 'Identifies the main character.' },
      { key: 'where', weight: 2, rule: 'slot_match', correctValue: correct.where || 'main_place', partialCredit: .35, rationale: 'Identifies the story place.' },
      { key: 'at_first', weight: 1.5, rule: 'slot_match', correctValue: correct.at_first || 'opening_state', partialCredit: .35, rationale: 'Identifies the opening state.' }
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

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (['approved', 'approve', '승인'].includes(value)) return 'Approved';
  if (['needs review', 'needs_review', 'review', '검수 필요'].includes(value)) return 'Needs Review';
  if (['generated', '생성'].includes(value)) return 'Generated';
  return 'Input';
}

function statusClass(status) {
  return `status-${normalizeStatus(status).toLowerCase().replace(/\s+/g, '-')}`;
}

function normalizeBatchRow(raw, index) {
  const read = (...keys) => {
    for (const key of keys) {
      if (raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== '') return String(raw[key]).trim();
    }
    return '';
  };
  const storyId = read('story_id', 'storyId', 'Story ID', 'StoryID', '스토리ID', '스토리 코드') || `STORY_${String(index + 1).padStart(3, '0')}`;
  return {
    story_id: storyId,
    title: read('title', 'Title', 'story_title', 'Story Title', '제목') || storyId,
    level: read('level', 'Level', '레벨') || 'Draft Level',
    story_text: read('story_text', 'storyText', 'Story Text', 'text', 'Text', '스토리 전문', '본문'),
    image_base_path: read('image_base_path', 'imageBasePath', 'Image Base Path', 'image_folder', 'Image Folder'),
    audio_base_path: read('audio_base_path', 'audioBasePath', 'Audio Base Path', 'audio_folder', 'Audio Folder'),
    cover_base_path: read('cover_base_path', 'coverBasePath', 'Cover Base Path', 'cover_folder', 'Cover Folder'),
    background_image: read('background_image', 'backgroundImage', 'Background Image'),
    hint_character: read('hint_character', 'hintCharacter', 'Hint Character'),
    status: normalizeStatus(read('status', 'Status', '상태')),
    notes: read('notes', 'Notes', '메모')
  };
}

function createBatchItem(row, index) {
  return {
    id: row.story_id || `STORY_${String(index + 1).padStart(3, '0')}`,
    row,
    status: normalizeStatus(row.status),
    issues: [],
    quiz: null
  };
}

function updateBatchInputStatus() {
  const status = $('batch-input-status');
  if (!status) return;
  if (!batchInputRows.length) {
    status.textContent = 'No batch format uploaded.';
    return;
  }
  status.textContent = `${batchInputRows.length} stories loaded. Ready for AI Batch Generate.`;
}

function showBatchOutputs(show = true) {
  const box = $('batch-output-box');
  if (box) box.hidden = !show;
}

function quizFromBatchRow(row) {
  const draft = buildRuleDraft({
    storyId: row.story_id,
    title: row.title,
    level: row.level,
    storyText: row.story_text
  });
  draft.assets.imageBasePath = row.image_base_path || draft.assets.imageBasePath;
  draft.assets.audioBasePath = row.audio_base_path || draft.assets.audioBasePath;
  draft.assets.coverBasePath = row.cover_base_path || draft.assets.coverBasePath;
  draft.assets.backgroundImage = row.background_image || draft.assets.backgroundImage;
  draft.assets.coverImage = row.cover_image || draft.assets.coverImage;
  draft.assets.hintCharacter = row.hint_character || draft.assets.hintCharacter;
  draft.generation.notes = row.notes || draft.generation.notes;
  return draft;
}

function validateQuizDraft(sourceQuiz, row = {}) {
  const issues = [];
  const scenes = sourceQuiz.story?.scenes || [];
  if (!row.story_text && !sourceQuiz.story?.text) issues.push('스토리 전문이 비어 있습니다.');
  if (scenes.length < 5) issues.push('장면이 5개 미만입니다. 시퀀싱 문항 검수가 필요합니다.');
  if ((sourceQuiz.questions || []).length !== 6) issues.push('문항 수가 6개가 아닙니다.');
  const expectedAxes = Object.keys(SG_LABELS);
  const foundAxes = new Set((sourceQuiz.questions || []).map(q => q.storyGrammar));
  expectedAxes.forEach(axis => {
    if (!foundAxes.has(axis)) issues.push(`${SG_LABELS[axis]} 항목이 없습니다.`);
  });
  (sourceQuiz.questions || []).forEach(q => {
    if (!q.instruction) issues.push(`${q.qId}: 지시문이 없습니다.`);
    if (!q.hint) issues.push(`${q.qId}: 힌트가 없습니다.`);
    if (!q.resources || (!q.resources.images && !q.resources.audio && !q.resources.scene)) issues.push(`${q.qId}: 리소스 정보가 없습니다.`);
    if (!hasMeaningfulInteraction(q)) issues.push(`${q.qId}: 선택지/배치 항목 등 interaction 정보가 없습니다.`);
    if (!q.scoring?.formula) issues.push(`${q.qId}: 계산식이 없습니다.`);
    if (!Array.isArray(q.scoring?.components) || !q.scoring.components.length) issues.push(`${q.qId}: 가중치/채점 구성요소가 없습니다.`);
    if ((q.type || '').includes('mcq') && (!Array.isArray(q.interaction?.options) || q.interaction.options.length < 2)) {
      issues.push(`${q.qId}: 객관식 선택지가 부족합니다.`);
    }
    if (q.type === 'scene_word_unscramble') {
      const sentenceId = q.resources?.sentenceId;
      const sentenceFound = scenes.some(scene => (scene.sentences || []).some(s => s.sentenceId === sentenceId));
      if (sentenceId && !sentenceFound) issues.push(`${q.qId}: 언스크램블 sentenceId가 원문에서 확인되지 않습니다.`);
    }
  });
  return issues;
}

function generateBatchDrafts() {
  if (!batchItems.length) {
    toast('먼저 Batch XLSX/JSON을 불러와 주세요.');
    return;
  }
  syncCurrentBatchItem();
  batchItems = batchItems.map((item, index) => {
    const draft = quizFromBatchRow(item.row);
    const issues = validateQuizDraft(draft, item.row);
    return {
      ...item,
      id: item.row.story_id || item.id || `STORY_${String(index + 1).padStart(3, '0')}`,
      quiz: draft,
      issues,
      status: issues.length ? 'Needs Review' : 'Generated'
    };
  });
  selectBatchItem(0, false);
  toast(`${batchItems.length}개 스토리 초안을 생성했습니다.`);
}

function loadAssetFolder(files) {
  assetObjectUrls.forEach(url => URL.revokeObjectURL(url));
  assetObjectUrls = [];
  assetFiles = new Map();
  Array.from(files || []).forEach(file => registerAssetFile(file, file.webkitRelativePath || file.name));
  const status = $('asset-status');
  const count = assetCount();
  if (status) status.textContent = count ? `${count} asset files loaded for preview/export.` : 'No asset folder loaded.';
  renderPreview();
  toast(`${count}개 에셋 파일을 연결했습니다.`);
}

function registerAssetFile(file, relativePath = '') {
  const url = URL.createObjectURL(file);
  assetObjectUrls.push(url);
  const relative = String(relativePath || file.name).replace(/\\/g, '/').toLowerCase();
  const name = file.name.toLowerCase();
  const stem = assetStem(name);
  const relativeStem = assetStem(relative);
  assetFiles.set(relative, { file, url });
  assetFiles.set(name, { file, url });
  if (stem) assetFiles.set(`stem:${stem}`, { file, url });
  if (relativeStem) assetFiles.set(`stem:${relativeStem}`, { file, url });
}

function storyCodeFromPath(pathValue) {
  const match = String(pathValue || '').match(/(?:^|[\\/])?((?:OG|CS)\d{4})(?=[_\\/.-]|$)/i);
  return match ? match[1].toUpperCase() : '';
}

function storyTextIdFromFileName(fileNameValue) {
  const name = fileName(fileNameValue);
  if (!/\.txt$/i.test(name)) return '';
  if (/(^|[_-])processing[_-]?log|_log[_-]?\d|\blog\b/i.test(name)) return '';
  const match = name.match(/^((?:OG|CS)\d{4})_.+\.txt$/i);
  return match ? match[1].toUpperCase() : '';
}

function isStoryTextFile(file, expectedStoryId = '') {
  const storyId = storyTextIdFromFileName(file?.name || '');
  if (!storyId) return false;
  return !expectedStoryId || storyId === String(expectedStoryId).toUpperCase();
}

function titleFromStoryFile(fileNameValue, storyId) {
  const stem = fileName(fileNameValue).replace(/\.[^.]+$/, '');
  const cleaned = stem
    .replace(new RegExp(`^${storyId}[_\\s-]*`, 'i'), '')
    .replace(/[_-]+/g, ' ')
    .replace(/\bstorytitle\b/i, '')
    .trim();
  return cleaned || storyId || 'Untitled Story';
}

function classifyStoryFiles(files) {
  const fileList = Array.from(files || []);
  const pkg = {
    storyId: '',
    title: '',
    storyFile: null,
    storyText: '',
    coverFiles: [],
    backgroundFile: null,
    sceneImages: new Map(),
    audioFiles: new Map(),
    otherFiles: []
  };

  fileList.forEach(file => {
    const rel = file.webkitRelativePath || file.name;
    const storyTextId = storyTextIdFromFileName(file.name);
    const storyId = storyTextId || storyCodeFromPath(rel) || storyCodeFromPath(file.name);
    if (!pkg.storyId && storyId) pkg.storyId = storyId;
  });

  fileList.forEach(file => {
    const rel = file.webkitRelativePath || file.name;
    const name = file.name;
    const storyId = storyCodeFromPath(rel) || storyCodeFromPath(name);

    if (/\.txt$/i.test(name)) {
      if (isStoryTextFile(file, pkg.storyId)) pkg.storyFile = file;
      else pkg.otherFiles.push(file);
      return;
    }

    if (/\.(webp|png|jpe?g|gif)$/i.test(name) && /_cover_[lp]_i(?:_\d{3,4}x\d{3,4})?/i.test(name)) {
      pkg.coverFiles.push(file);
      return;
    }

    if (/\.(webp|png|jpe?g|gif)$/i.test(name) && /_talking_bg_i(?:_\d{3,4}x\d{3,4})?/i.test(name)) {
      pkg.backgroundFile = file;
      return;
    }

    const sceneMatch = name.match(/_(SC\d{2})_I(?:_\d{3,4}x\d{3,4})?\.(webp|png|jpe?g|gif)$/i);
    if (sceneMatch) {
      pkg.sceneImages.set(sceneMatch[1].toUpperCase(), file);
      return;
    }

    const audioMatch = name.match(/_(SC\d{2}_ST\d{2}_N_A)\.(mp3|wav|m4a|ogg)$/i);
    if (audioMatch) {
      pkg.audioFiles.set(audioMatch[1].toUpperCase(), file);
      return;
    }

    pkg.otherFiles.push(file);
  });
  pkg.title = titleFromStoryFile(pkg.storyFile?.name || pkg.storyId, pkg.storyId);
  return pkg;
}

function renderResourceSummary(pkg) {
  const box = $('resource-summary');
  if (!box) return;
  if (!pkg) {
    box.innerHTML = '<div class="resource-empty">Upload one OG/CS story folder to classify its files.</div>';
    return;
  }
  const sceneList = [...pkg.sceneImages.keys()].sort();
  const audioList = [...pkg.audioFiles.keys()].sort();
  const row = (label, value, ok = true, kind = '', key = '') => `
    <button type="button" class="resource-row ${ok ? 'ok' : 'warn'}" onclick="startResourceReplace('${escapeAttr(kind)}','${escapeAttr(key)}')">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <em>${kind === 'story_id' ? 'Edit' : 'Replace'}</em>
    </button>`;
  box.innerHTML = [
    row('Story ID', pkg.storyId || 'Not detected', !!pkg.storyId, 'story_id'),
    row('Story TXT', pkg.storyFile?.name || 'Missing', !!pkg.storyFile, 'story'),
    row('Cover', pkg.coverFiles[0]?.name || 'Missing', !!pkg.coverFiles.length, 'cover'),
    row('Background', pkg.backgroundFile?.name || 'Missing', !!pkg.backgroundFile, 'background'),
    row('Scene Images', `${sceneList.length} files`, sceneList.length > 0, 'scene_any'),
    row('Audio', `${audioList.length} files`, true, 'audio_any')
  ].join('');
}

function replaceInputAccept(kind) {
  if (kind === 'story') return '.txt,text/plain';
  if (kind === 'audio' || kind === 'audio_any') return '.mp3,.wav,.m4a,.ogg,audio/*';
  return '.webp,.png,.jpg,.jpeg,.gif,image/*';
}

function startResourceReplace(kind, key = '') {
  if (kind === 'story_id') {
    const current = $('story-id')?.value.trim() || currentStoryPackage?.storyId || '';
    const next = prompt('Story ID', current);
    if (next === null) return;
    const cleaned = next.trim().toUpperCase();
    if (!/^(OG|CS)\d{4}$/.test(cleaned)) {
      toast('Use a Story ID such as OG0021 or CS0003.');
      return;
    }
    if (!currentStoryPackage) currentStoryPackage = classifyStoryFiles([]);
    currentStoryPackage.storyId = cleaned;
    $('story-id').value = cleaned;
    updateStoryFromInputs();
    renderResourceSummary(currentStoryPackage);
    renderAll();
    toast(`Story ID updated to ${cleaned}.`);
    return;
  }
  pendingResourceReplaceKind = kind;
  pendingResourceReplaceKey = key;
  const input = $('resource-replace-file');
  if (!input) return;
  input.accept = replaceInputAccept(kind);
  input.multiple = kind === 'scene_any' || kind === 'audio_any';
  input.value = '';
  input.click();
}

async function handleResourceReplaceFiles(files) {
  const kind = pendingResourceReplaceKind;
  if (kind === 'scene_any' || kind === 'audio_any') {
    await replaceStoryPackageFiles(files);
    pendingResourceReplaceKind = '';
    pendingResourceReplaceKey = '';
    return;
  }
  await replaceSpecificResourceFile(Array.from(files || [])[0]);
}

async function replaceSpecificResourceFile(file) {
  if (!file || !pendingResourceReplaceKind) return;
  if (!currentStoryPackage) currentStoryPackage = classifyStoryFiles([]);
  const kind = pendingResourceReplaceKind;
  const key = pendingResourceReplaceKey;
  registerAssetFile(file, file.webkitRelativePath || file.name);

  if (kind === 'story') {
    if (!isStoryTextFile(file, currentStoryPackage.storyId || storyTextIdFromFileName(file.name))) {
      toast('Choose a story TXT named like OG0021_Title.txt.');
      return;
    }
    currentStoryPackage.storyFile = file;
    currentStoryPackage.storyId = storyTextIdFromFileName(file.name) || currentStoryPackage.storyId;
    currentStoryPackage.title = titleFromStoryFile(file.name, currentStoryPackage.storyId);
    currentStoryPackage.storyText = await readFileAsText(file);
    $('story-id').value = currentStoryPackage.storyId || $('story-id').value;
    $('story-title').value = currentStoryPackage.title || $('story-title').value;
    $('story-text').value = currentStoryPackage.storyText;
  } else if (kind === 'cover') {
    currentStoryPackage.coverFiles = [file];
    if (quiz) quiz.assets = { ...(quiz.assets || {}), coverImage: file.name };
  } else if (kind === 'background') {
    currentStoryPackage.backgroundFile = file;
    if (quiz) quiz.assets = { ...(quiz.assets || {}), backgroundImage: file.name };
  } else if (kind === 'scene' || kind === 'scene_any') {
    const sceneMatch = file.name.match(/_(SC\d{2})_I(?:_\d{3,4}x\d{3,4})?\.(webp|png|jpe?g|gif)$/i);
    const sceneId = (kind === 'scene' ? key : sceneMatch?.[1] || '').toUpperCase();
    if (!sceneId) {
      toast('Choose an image named like OG0021_SC01_I.webp.');
      return;
    }
    currentStoryPackage.sceneImages.set(sceneId, file);
    if (quiz) {
      (quiz.questions || []).forEach(q => (q.resources?.images || []).forEach(img => {
        if ((img.sceneId || img.id || '').toUpperCase() === sceneId) img.path = file.name;
      }));
    }
  } else if (kind === 'audio' || kind === 'audio_any') {
    const audioMatch = file.name.match(/_(SC\d{2}_ST\d{2}_N_A)\.(mp3|wav|m4a|ogg)$/i);
    const audioId = (kind === 'audio' ? key : audioMatch?.[1] || '').toUpperCase();
    if (!audioId) {
      toast('Choose audio named like OG0021_SC02_ST01_N_A.mp3.');
      return;
    }
    currentStoryPackage.audioFiles.set(audioId, file);
    if (quiz) {
      (quiz.questions || []).forEach(q => {
        const audio = q.resources?.audio;
        if (audio && ((audio.id || '').toUpperCase() === audioId || `${audio.sceneId}_${audio.sentenceId}_A`.toUpperCase().includes(audioId))) {
          audio.path = file.name;
        }
      });
    }
  }

  pendingResourceReplaceKind = '';
  pendingResourceReplaceKey = '';
  updateStoryFromInputs();
  renderResourceSummary(currentStoryPackage);
  renderAll();
  toast(`${file.name} updated.`);
}

async function loadStoryPackage(files) {
  const fileList = Array.from(files || []);
  if (!fileList.length) return;
  showLeftSection('generate');
  assetObjectUrls.forEach(url => URL.revokeObjectURL(url));
  assetObjectUrls = [];
  assetFiles = new Map();
  fileList.forEach(file => registerAssetFile(file, file.webkitRelativePath || file.name));

  const pkg = classifyStoryFiles(fileList);
  if (pkg.storyFile) {
    pkg.storyText = await readFileAsText(pkg.storyFile);
  }
  currentStoryPackage = pkg;

  $('story-id').value = pkg.storyId || $('story-id').value || 'OG0000';
  $('story-title').value = pkg.title || $('story-title').value || pkg.storyId || '';
  if (!$('story-level').value.trim()) $('story-level').value = 'Level 1';
  $('story-text').value = pkg.storyText || $('story-text').value;

  renderResourceSummary(pkg);
  const status = $('package-status');
  if (status) {
    status.textContent = `${assetCount()} files loaded. ${pkg.sceneImages.size} scene images, ${pkg.audioFiles.size} audio files.`;
  }

  const row = currentStoryRow();
  quiz = sanitizeGeneratedQuiz(quizFromBatchRow(row));
  currentQuestionIndex = 0;
  currentBatchIndex = -1;
  renderAll();
  toast(`${row.story_id} resource folder loaded.`);
}

async function replaceStoryPackageFiles(files) {
  const fileList = Array.from(files || []);
  if (!fileList.length) return;
  if (!currentStoryPackage) {
    await loadStoryPackage(fileList);
    return;
  }
  fileList.forEach(file => registerAssetFile(file, file.webkitRelativePath || file.name));
  const incoming = classifyStoryFiles(fileList);
  if (!currentStoryPackage.storyId && incoming.storyId) currentStoryPackage.storyId = incoming.storyId;
  if (incoming.storyFile) {
    currentStoryPackage.storyFile = incoming.storyFile;
    currentStoryPackage.storyText = await readFileAsText(incoming.storyFile);
    $('story-text').value = currentStoryPackage.storyText;
  }
  if (incoming.coverFiles.length) currentStoryPackage.coverFiles = incoming.coverFiles;
  if (incoming.backgroundFile) currentStoryPackage.backgroundFile = incoming.backgroundFile;
  incoming.sceneImages.forEach((file, sceneId) => currentStoryPackage.sceneImages.set(sceneId, file));
  incoming.audioFiles.forEach((file, audioId) => currentStoryPackage.audioFiles.set(audioId, file));
  currentStoryPackage.otherFiles.push(...incoming.otherFiles);

  if (!$('story-id').value.trim() && currentStoryPackage.storyId) $('story-id').value = currentStoryPackage.storyId;
  if (!$('story-title').value.trim()) $('story-title').value = currentStoryPackage.title || currentStoryPackage.storyId || '';
  renderResourceSummary(currentStoryPackage);
  if ($('package-status')) {
    $('package-status').textContent = `${assetCount()} files loaded. ${currentStoryPackage.sceneImages.size} scene images, ${currentStoryPackage.audioFiles.size} audio files.`;
  }
  if (quiz) {
    const row = currentStoryRow();
    quiz.assets = {
      ...(quiz.assets || {}),
      backgroundImage: row.background_image || quiz.assets?.backgroundImage,
      coverImage: row.cover_image || quiz.assets?.coverImage
    };
    renderAll();
  }
  toast(`${fileList.length} resource file(s) updated.`);
}

async function generateBatchAiDrafts() {
  const sourceRows = batchInputRows.length ? batchInputRows : [];
  if (!sourceRows.length) {
    toast('먼저 Story Batch에서 Format XLSX를 업로드해 주세요.');
    return;
  }
  const apiKey = $('api-key').value.trim();
  const provider = $('ai-provider').value;
  syncCurrentBatchItem();
  const btn = $('batch-ai-generate-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  try {
    if (isLocalOrigin()) {
      btn.textContent = 'Generating...';
      const res = await fetch('/api/generate-batch-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey,
          stories: sourceRows
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'AI batch generation failed.');
      batchGeneratedItems = (data.items || []).map((entry, index) => {
        const row = normalizeBatchRow(entry.row || sourceRows[index] || {}, index);
        const qz = completeGeneratedQuiz(entry.quiz || {}, row);
        const issues = [...(entry.issues || []), ...validateQuizDraft(qz, row)];
        return { row, status: issues.length ? 'Needs Review' : normalizeStatus(entry.status || 'Generated'), issues, quiz: qz };
      });
    } else {
      if (!apiKey) throw new Error('웹에서는 API Key를 입력해 주세요.');
      const prompt = await loadGenerationPrompt();
      const generatedItems = [];
      for (let index = 0; index < sourceRows.length; index += 1) {
        const row = sourceRows[index];
        btn.textContent = `Generating ${index + 1}/${sourceRows.length}`;
        try {
          const input = aiInputFromRow(row, index);
          const generated = await callAiInBrowser(provider, prompt, input, apiKey);
          const qz = completeGeneratedQuiz(generated, row);
          const issues = validateQuizDraft(qz, row);
          generatedItems.push({
            row,
            status: issues.length ? 'Needs Review' : 'Generated',
            issues,
            quiz: qz
          });
        } catch (storyError) {
          const fallback = quizFromBatchRow(row);
          generatedItems.push({
            row,
            status: 'Needs Review',
            issues: [`AI generation failed: ${storyError.message}`],
            quiz: fallback
          });
        }
      }
      batchGeneratedItems = generatedItems;
    }
    showBatchOutputs(true);
    toast(`${provider}로 ${batchGeneratedItems.length}개 초안을 생성했습니다. 아래에서 산출물을 다운로드할 수 있습니다.`);
  } catch (error) {
    toast(`AI Batch 실패: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function renderBatchList() {
  const list = $('batch-list');
  const count = $('batch-count');
  if (!list || !count) return;
  count.textContent = `${batchItems.length} stories`;
  if (!batchItems.length) {
    list.innerHTML = '<div class="batch-empty">Story Batch에서 Batch XLSX를 불러오거나, 여기에서 Quiz/Batch JSON을 불러오면 스토리를 선택할 수 있습니다.</div>';
    return;
  }
  list.innerHTML = batchItems.map((item, index) => {
    const row = item.row || {};
    const status = normalizeStatus(item.status);
    return `<button class="batch-item${index === currentBatchIndex ? ' active' : ''}" onclick="selectBatchItem(${index})">
      <div class="batch-title-row">
        <span class="batch-story-id">${escapeHtml(row.story_id || item.id)}</span>
        <span class="status-badge ${statusClass(status)}">${escapeHtml(status)}</span>
      </div>
      <div class="batch-title">${escapeHtml(row.title || 'Untitled Story')}</div>
    </button>`;
  }).join('');
}

function renderReviewPanel() {
  const issueList = $('issue-list');
  if (!issueList) return;
  if (!quiz) {
    issueList.textContent = 'Generate or upload a quiz to see validation notes.';
    return;
  }
  const issues = validateQuizDraft(quiz, currentStoryRow());
  if (!issues.length) {
    issueList.innerHTML = '<strong>Validation passed</strong><br>Review the quiz content and export when ready.';
    return;
  }
  issueList.innerHTML = `<strong>Needs review</strong><ul>${issues.map(issue => `<li>${escapeHtml(issue)}</li>`).join('')}</ul>`;
}

function selectBatchItem(index, saveCurrent = true) {
  if (!batchItems[index]) return;
  if (saveCurrent) syncCurrentBatchItem();
  currentBatchIndex = index;
  const item = batchItems[index];
  if (!item.quiz) {
    item.quiz = quizFromBatchRow(item.row);
    item.issues = validateQuizDraft(item.quiz, item.row);
    item.status = item.issues.length ? 'Needs Review' : 'Generated';
  }
  quiz = deepClone(item.quiz);
  currentQuestionIndex = 0;
  syncStoryInputs();
  renderAll();
}

function syncCurrentBatchItem() {
  if (currentBatchIndex < 0 || !batchItems[currentBatchIndex] || !quiz) return;
  const item = batchItems[currentBatchIndex];
  item.quiz = deepClone(quiz);
  item.row.story_id = quiz.story?.storyId || item.row.story_id;
  item.row.title = quiz.story?.title || item.row.title;
  item.row.level = quiz.story?.level || item.row.level;
  item.row.story_text = quiz.story?.text || item.row.story_text;
  item.issues = validateQuizDraft(item.quiz, item.row);
  if (item.status !== 'Approved') item.status = item.issues.length ? 'Needs Review' : 'Generated';
}

function setCurrentBatchStatus(status) {
  syncCurrentBatchItem();
  if (currentBatchIndex < 0 || !batchItems[currentBatchIndex]) {
    toast('먼저 Batch 항목을 선택해 주세요.');
    return;
  }
  batchItems[currentBatchIndex].status = normalizeStatus(status);
  renderAll();
  toast(`${batchItems[currentBatchIndex].row.story_id} 상태를 ${normalizeStatus(status)}로 바꿨습니다.`);
}

function loadBatchBundle(parsed) {
  const sourceItems = Array.isArray(parsed) ? parsed : (parsed.items || parsed.quizzes || parsed.stories || []);
  batchItems = sourceItems.map((entry, index) => {
    const qz = entry.quiz || (entry.schemaVersion === 'quiz-v3.0' ? entry : null);
    const row = normalizeBatchRow(entry.row || entry.story || entry, index);
    const item = createBatchItem(row, index);
    if (qz) {
      item.quiz = qz;
      item.status = normalizeStatus(entry.status || row.status || 'Generated');
      item.issues = [...(entry.issues || []), ...validateQuizDraft(qz, row)];
    }
    return item;
  });
  currentBatchIndex = -1;
  if (batchItems.length) selectBatchItem(0, false);
  else renderBatchList();
}

function loadBatchFile(file) {
  if (!file) return;
  if (!window.XLSX) {
    toast('XLSX 라이브러리를 불러오지 못했습니다.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const wb = XLSX.read(reader.result, { type: 'array' });
      const sheetName = wb.SheetNames.includes('INPUT') ? 'INPUT' : wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      batchInputRows = rows.map((row, index) => normalizeBatchRow(row, index));
      batchGeneratedItems = [];
      showBatchOutputs(false);
      updateBatchInputStatus();
      toast(`${batchInputRows.length}개 Story Batch 입력을 불러왔습니다.`);
    } catch (error) {
      console.error(error);
      toast('Batch 파일 형식을 확인해 주세요.');
    }
  };
  reader.readAsArrayBuffer(file);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function rowsFromSheet(wb, sheetName) {
  return wb.Sheets[sheetName] ? XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' }) : [];
}

function rowValue(rows, label) {
  const row = rows.find(r => String(r[0] || '').trim().toLowerCase() === label.toLowerCase());
  return row ? row[1] : '';
}

function rowsAfterHeader(rows, headerLabel) {
  const start = rows.findIndex(r => String(r[0] || '').trim() === headerLabel);
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row.some(cell => String(cell || '').trim())) break;
    out.push(row);
  }
  return out;
}

function quizFromReadingWorkbook(wb, fallbackName = 'Uploaded Quiz') {
  const quizRows = rowsFromSheet(wb, 'QUIZ_LIST');
  const storyId = rowValue(quizRows, 'Story ID') || fallbackName.replace(/\.[^.]+$/, '') || 'UPLOADED';
  const title = rowValue(quizRows, 'Title') || storyId;
  const level = rowValue(quizRows, 'Level') || 'Uploaded Level';
  const metaRows = rowsAfterHeader(quizRows, 'Q_ID');
  const metaByQid = new Map(metaRows.map(r => [r[0], {
    qId: r[0],
    number: Number(r[1]) || metaRows.indexOf(r) + 1,
    storyGrammar: r[2],
    type: r[3],
    instruction: r[4],
    hint: r[5],
    formula: r[6]
  }]));
  const questionSheets = wb.SheetNames.filter(name => /^Q\d{2}_/i.test(name));
  const questions = questionSheets.map((sheetName, idx) => {
    const rows = rowsFromSheet(wb, sheetName);
    const qId = rowValue(rows, 'Q_ID') || `${storyId}_V3_Q${String(idx + 1).padStart(2, '0')}`;
    const meta = metaByQid.get(qId) || {};
    const resources = { images: [] };
    rowsAfterHeader(rows, 'Kind').forEach(r => {
      const kind = r[0];
      if (kind === 'image') resources.images.push({ id: r[1], path: r[2], kind: 'image', sceneId: r[3], sentenceId: r[4] });
      if (kind === 'audio') resources.audio = { id: r[1], path: r[2], kind: 'audio', sceneId: r[3], sentenceId: r[4] };
      if (kind === 'scene') resources.scene = r[3] || r[1];
    });
    const interactionText = rowValue(rows, 'JSON');
    let interaction = {};
    try { interaction = interactionText ? JSON.parse(interactionText) : {}; } catch { interaction = {}; }
    const components = rowsAfterHeader(rows, 'Key').map(r => ({
      key: r[0],
      weight: r[1],
      rule: r[2],
      correctValue: r[3],
      partialCredit: r[4],
      rationale: r[5]
    }));
    const diagnostics = rowsAfterHeader(rows, 'Code').map(r => ({ code: r[0], threshold: r[1], messageKo: r[2] }));
    return {
      qId,
      number: meta.number || idx + 1,
      type: rowValue(rows, 'Type') || meta.type || 'text_mcq',
      storyGrammar: meta.storyGrammar || sheetName.replace(/^Q\d{2}_/i, '').toLowerCase(),
      instruction: rowValue(rows, 'Instruction') || meta.instruction || '',
      hint: rowValue(rows, 'Hint') || meta.hint || '',
      resources,
      interaction,
      scoring: {
        type: components[0]?.rule || 'imported',
        maxScore: 100,
        formula: meta.formula || '',
        components
      },
      diagnostics,
      lrs: { verb: 'answered', objectId: `quiz_${storyId}_v3_Q${String(idx + 1).padStart(2, '0')}`, resultFields: ['score_raw'] }
    };
  });
  return applyDefaultAssetsToQuiz({
    schemaVersion: 'quiz-v3.0',
    story: { storyId, title, level, text: '', scenes: [] },
    assets: {},
    storyGrammarAxes: Object.keys(SG_LABELS).map(key => ({ key, labelEn: SG_LABELS[key], labelKo: SG_KO[key], descriptionKo: '' })),
    questions,
    reporting: defaultReporting(),
    generation: { provider: 'imported_xlsx', model: 'xlsx-parser', promptVersion: 'story_grammar_v3', createdAt: new Date().toISOString().slice(0, 10), notes: 'Imported from Reading Quiz XLSX.' }
  }, { story_id: storyId, title, level, story_text: '' });
}

function quizFromDevWorkbook(wb, fallbackName = 'Uploaded Quiz') {
  if (!wb.Sheets.QUESTIONS) return null;
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.QUESTIONS, { defval: '' });
  if (!rows.length) return null;
  const storyId = rows[0].story_id || fallbackName.replace(/\.[^.]+$/, '') || 'UPLOADED';
  const storyLevel = rows[0].story_level || rows[0].level || rows[0].Level || 'Uploaded Level';
  const resources = XLSX.utils.sheet_to_json(wb.Sheets.RESOURCES || {}, { defval: '' });
  const options = XLSX.utils.sheet_to_json(wb.Sheets.OPTIONS || {}, { defval: '' });
  const rules = XLSX.utils.sheet_to_json(wb.Sheets.SCORING_RULES || {}, { defval: '' });
  const questions = rows.map((r, idx) => {
    const qResources = resources.filter(x => x.q_id === r.q_id);
    const qOptions = options.filter(x => x.q_id === r.q_id);
    return {
      qId: r.q_id,
      number: Number(r.number) || idx + 1,
      storyGrammar: r.story_grammar,
      type: r.question_type,
      instruction: r.instruction,
      hint: r.hint,
      resources: {
        images: qResources.filter(x => x.resource_kind === 'image').map(x => ({ id: x.resource_id, path: x.path, kind: 'image', sceneId: x.scene_id, sentenceId: x.sentence_id })),
        audio: (() => {
          const a = qResources.find(x => x.resource_kind === 'audio');
          return a ? { id: a.resource_id, path: a.path, kind: 'audio', sceneId: a.scene_id, sentenceId: a.sentence_id } : undefined;
        })()
      },
      interaction: qOptions.length ? { promptMode: 'text_mcq', options: qOptions.map(o => ({ key: o.option_key, text: o.option_text, score: o.score, isCorrect: !!o.is_correct, diagnostic: o.diagnostic })), correct: qOptions.find(o => o.is_correct)?.option_key || '' } : {},
      scoring: { type: 'imported', maxScore: r.max_score || 100, formula: r.formula, components: rules.filter(x => x.q_id === r.q_id).map(x => ({ key: x.component_key, weight: x.weight, rule: x.rule, correctValue: x.correct_value, partialCredit: x.partial_credit, rationale: x.rationale })) },
      diagnostics: [],
      lrs: { verb: 'answered', objectId: `quiz_${storyId}_v3_Q${String(idx + 1).padStart(2, '0')}`, resultFields: ['score_raw'] }
    };
  });
  return applyDefaultAssetsToQuiz({
    schemaVersion: 'quiz-v3.0',
    story: { storyId, title: storyId, level: storyLevel, text: '', scenes: [] },
    assets: {},
    storyGrammarAxes: Object.keys(SG_LABELS).map(key => ({ key, labelEn: SG_LABELS[key], labelKo: SG_KO[key], descriptionKo: '' })),
    questions,
    reporting: defaultReporting(),
    generation: { provider: 'imported_devspec', model: 'xlsx-parser', promptVersion: 'story_grammar_v3', createdAt: new Date().toISOString().slice(0, 10), notes: 'Imported from Dev Spec XLSX.' }
  }, { story_id: storyId, title: storyId, level: storyLevel, story_text: '' });
}

function quizCompletenessScore(qz) {
  if (!qz?.questions?.length) return 0;
  return qz.questions.reduce((total, q) => {
    const hasImages = (q.resources?.images || []).length > 0 ? 1 : 0;
    const hasAudio = q.resources?.audio ? 1 : 0;
    return total
      + (hasMeaningfulInteraction(q) ? 4 : 0)
      + (hasMeaningfulScoring(q) ? 3 : 0)
      + hasImages
      + hasAudio;
  }, qz.questions.length);
}

function dedupeLoadedQuizItems(items) {
  const byStory = new Map();
  items.forEach((item, idx) => {
    const storyId = item.quiz?.story?.storyId || item.row?.story_id || `uploaded_${idx}`;
    const candidateScore = quizCompletenessScore(item.quiz);
    const current = byStory.get(storyId);
    if (!current || candidateScore > current.score) {
      byStory.set(storyId, { item, score: candidateScore });
    }
  });
  return [...byStory.values()].map(entry => entry.item);
}

async function loadQuizUploadFiles(files) {
  const fileList = Array.from(files || []);
  if (!fileList.length) return;
  showLeftSection('open');
  const loadedItems = [];
  try {
    for (const file of fileList) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.zip')) {
        if (!window.JSZip) throw new Error('ZIP 라이브러리를 불러오지 못했습니다.');
        const zip = await JSZip.loadAsync(await readFileAsArrayBuffer(file));
        const zipEntries = Object.values(zip.files).filter(entry => !entry.dir);
        const jsonEntries = zipEntries.filter(entry => entry.name.toLowerCase().endsWith('.json'));
        const assetEntries = zipEntries.filter(entry => /\.(png|jpe?g|webp|gif|mp3|wav|m4a|ogg)$/i.test(entry.name));
        for (const entry of assetEntries) {
          const blob = await entry.async('blob');
          const assetFile = new File([blob], fileName(entry.name), { type: blob.type || 'application/octet-stream' });
          registerAssetFile(assetFile, entry.name);
        }
        for (const entry of jsonEntries) {
          const parsed = JSON.parse(await entry.async('string'));
          if (parsed.schemaVersion === 'quiz-batch-v1.0' || Array.isArray(parsed.items)) {
            (parsed.items || []).forEach((item, idx) => loadedItems.push({ ...item, row: normalizeBatchRow(item.row || item.quiz?.story || {}, idx) }));
          } else {
            loadedItems.push({ row: normalizeBatchRow(parsed.story || {}, loadedItems.length), status: 'Generated', issues: [], quiz: parsed });
          }
        }
      } else if (lower.endsWith('.json')) {
        const parsed = JSON.parse(await readFileAsText(file));
        if (parsed.schemaVersion === 'quiz-batch-v1.0' || Array.isArray(parsed.items)) {
          (parsed.items || []).forEach((item, idx) => loadedItems.push({ ...item, row: normalizeBatchRow(item.row || item.quiz?.story || {}, idx) }));
        } else {
          loadedItems.push({ row: normalizeBatchRow(parsed.story || {}, loadedItems.length), status: 'Generated', issues: [], quiz: parsed });
        }
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const wb = XLSX.read(await readFileAsArrayBuffer(file), { type: 'array' });
        const qz = wb.SheetNames.includes('QUIZ_LIST')
          ? quizFromReadingWorkbook(wb, file.name)
          : quizFromDevWorkbook(wb, file.name);
        if (qz) loadedItems.push({ row: normalizeBatchRow(qz.story || {}, loadedItems.length), status: 'Generated', issues: validateQuizDraft(qz, qz.story || {}), quiz: qz });
      }
    }
    if (!loadedItems.length) {
      toast('불러올 수 있는 퀴즈 파일이 없습니다.');
      return;
    }
    const uniqueItems = dedupeLoadedQuizItems(loadedItems);
    currentStoryPackage = null;
    renderResourceSummary(null);
    if ($('package-status')) $('package-status').textContent = 'Existing quiz loaded. Upload a story folder to create a new quiz.';
    loadBatchBundle({ schemaVersion: 'quiz-batch-v1.0', items: uniqueItems });
    const status = $('asset-status');
    if (status && assetFiles.size) status.textContent = `${assetCount()} asset files loaded for preview/export.`;
    toast(`${uniqueItems.length}개 Quiz 항목을 불러왔습니다.`);
  } catch (error) {
    console.error(error);
    toast(`Quiz Upload 실패: ${error.message}`);
  }
}

function downloadBatchTemplate() {
  if (!window.XLSX) {
    toast('XLSX 라이브러리를 불러오지 못했습니다.');
    return;
  }
  const wb = XLSX.utils.book_new();
  aoaSheet(wb, 'INPUT', [
    BATCH_COLUMNS,
    [
      'OG0001',
      'Sample Story',
      'Level 1',
      'SC01_ST01_N = The story starts here.\nSC02_ST01_N = A problem begins.\nSC03_ST01_N = The character tries something.\nSC04_ST01_N = The character feels sad.\nSC05_ST01_N = The story ends.',
      'Optional memo'
    ]
  ]);
  aoaSheet(wb, 'README', [
    ['Column', 'Required', 'Description'],
    ['story_id', 'Y', 'Story code such as OG0021'],
    ['title', 'Y', 'Story title'],
    ['level', 'Y', 'Level label'],
    ['story_text', 'Y', 'Use SC##_ST##_N = sentence lines.'],
    ['notes', 'N', 'Internal memo'],
    [],
    ['Asset Rule', 'Description', 'Example'],
    ['Images', 'Do not enter local file paths in this sheet. Studio matches images by filename after you load an Assets folder.', 'OG0021_SC01_I.webp or OG0021_SC01_I_1920x1080.webp'],
    ['Audio', 'Do not enter local file paths in this sheet. Studio matches audio by filename after you load an Assets folder.', 'OG0021_SC02_ST01_N_A.mp3'],
    ['Cover', 'Cover images are matched by filename when included in the selected Assets folder or exported package.', 'OG0021_Cover_L_I.webp or OG0021_Cover_L_I_1920x1080.webp'],
    ['Reopen', 'Use QuizBatch.json or an individual *.quiz.json as the editable source. XLSX files are export deliverables.', 'QuizBatch.json']
  ]);
  XLSX.writeFile(wb, 'StoryBatch_Input_Template.xlsx');
}

function exportBatchJson() {
  syncCurrentBatchItem();
  const items = batchGeneratedItems.length ? batchGeneratedItems : batchItems;
  if (!items.length) {
    toast('다운로드할 생성 결과가 없습니다.');
    return;
  }
  const payload = {
    schemaVersion: 'quiz-batch-v1.0',
    exportedAt: new Date().toISOString(),
    items: items.map(item => ({
      row: item.row,
      status: item.status,
      issues: item.issues || [],
      quiz: item.quiz
    }))
  };
  downloadBlob('QuizBatch.json', 'application/json;charset=utf-8', JSON.stringify(payload, null, 2));
}

function workbookForQuiz(sourceQuiz, kind) {
  const previousQuiz = quiz;
  quiz = sourceQuiz;
  const wb = XLSX.utils.book_new();
  if (kind === 'dev') buildDevWorkbook(wb);
  else buildReadingWorkbook(wb);
  quiz = previousQuiz;
  return wb;
}

function packageQuizForExport(sourceQuiz) {
  const packaged = deepClone(sourceQuiz);
  packaged.assets = packaged.assets || {};
  packaged.assets.imageBasePath = 'Image/';
  packaged.assets.audioBasePath = 'Audio/';
  packaged.assets.coverBasePath = 'Cover/';
  if (packaged.assets.backgroundImage) packaged.assets.backgroundImage = `Image/${resolvedAssetFileName(packaged.assets.backgroundImage)}`;
  if (packaged.assets.coverImage) packaged.assets.coverImage = `Cover/${resolvedAssetFileName(packaged.assets.coverImage)}`;
  if (packaged.assets.hintCharacter) packaged.assets.hintCharacter = `Assets/${resolvedAssetFileName(packaged.assets.hintCharacter)}`;
  (packaged.questions || []).forEach(q => {
    (q.resources?.images || []).forEach(img => {
      if (img.path) img.path = resolvedAssetFileName(img.path);
    });
    if (q.resources?.audio?.path) q.resources.audio.path = resolvedAssetFileName(q.resources.audio.path);
  });
  return packaged;
}

function previewHtmlForQuiz(sourceQuiz) {
  const data = JSON.stringify(sourceQuiz).replace(/</g, '\\u003c');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(sourceQuiz.story.title)} Preview</title><style>body{font-family:Arial,sans-serif;background:#f7f4ff;margin:0;padding:24px;color:#263148}.wrap{max-width:900px;margin:auto}.card{background:#fff;border-radius:22px;padding:22px;margin:16px 0;box-shadow:0 12px 30px rgba(0,0,0,.08)}img{max-width:160px;border-radius:14px;margin:6px}.pill{display:inline-block;background:#ede9fe;color:#6d28d9;border-radius:99px;padding:5px 10px;font-weight:bold}</style></head><body><main class="wrap"><h1>${escapeHtml(sourceQuiz.story.title)}</h1><div id="app"></div></main><script>const quiz=${data};const app=document.getElementById('app');const asset=(p)=>/^(https?:|data:|\\/)/.test(p)?p:(quiz.assets.imageBasePath+p);app.innerHTML=quiz.questions.map(q=>'<section class="card"><span class="pill">Q'+q.number+' '+q.storyGrammar+'</span><h2>'+q.instruction+'</h2><p>'+q.hint+'</p><div>'+((q.resources.images||[]).map(i=>'<img src="'+asset(i.path)+'" alt="'+(i.sceneId||i.id)+'">').join(''))+'</div><pre>'+JSON.stringify(q.interaction,null,2)+'</pre></section>').join('');</script></body></html>`;
}

function collectQuizAssetEntries(sourceQuiz) {
  const entries = [];
  if (sourceQuiz.assets?.backgroundImage) entries.push({ path: sourceQuiz.assets.backgroundImage, folder: 'Image' });
  if (sourceQuiz.assets?.coverImage) entries.push({ path: sourceQuiz.assets.coverImage, folder: 'Cover', optional: true });
  if (sourceQuiz.assets?.hintCharacter) entries.push({ path: sourceQuiz.assets.hintCharacter, folder: 'Assets' });
  (sourceQuiz.questions || []).forEach(q => {
    (q.resources?.images || []).forEach(img => img.path && entries.push({ path: img.path, folder: 'Image' }));
    if (q.resources?.audio?.path) entries.push({ path: q.resources.audio.path, folder: 'Audio' });
  });
  const storyId = sourceQuiz.story?.storyId || '';
  if (storyId) {
    entries.push({ path: `${storyId}_Cover_L_I.webp`, folder: 'Cover', optional: true });
    entries.push({ path: `${storyId}_Cover_L_I_1920x1080.webp`, folder: 'Cover', optional: true });
    entries.push({ path: `${storyId}_Cover_P_I.webp`, folder: 'Cover', optional: true });
    entries.push({ path: `${storyId}_Cover_L_I.png`, folder: 'Cover', optional: true });
    entries.push({ path: `${storyId}_Cover_P_I.png`, folder: 'Cover', optional: true });
  }
  const seen = new Set();
  return entries.filter(entry => {
    const key = `${entry.folder}/${resolvedAssetFileName(entry.path).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function exportApprovedZip() {
  syncCurrentBatchItem();
  if (!window.XLSX) {
    toast('XLSX 라이브러리를 불러오지 못했습니다.');
    return;
  }
  const exportItems = batchGeneratedItems.length
    ? batchGeneratedItems.filter(item => item.quiz)
    : batchItems.filter(item => normalizeStatus(item.status) === 'Approved' && item.quiz);
  if (!exportItems.length) {
    toast(batchGeneratedItems.length ? '다운로드할 생성 결과가 없습니다.' : 'Approved 상태의 Batch 항목이 없습니다.');
    return;
  }
  if (!window.JSZip) {
    toast('ZIP 라이브러리를 불러오지 못했습니다. Batch JSON만 내보냅니다.');
    exportBatchJson();
    return;
  }
  const zip = new JSZip();
  exportItems.forEach(item => {
    const packagedQuiz = packageQuizForExport(item.quiz);
    const storyId = packagedQuiz.story.storyId;
    const folder = zip.folder(storyId);
    folder.file(`${storyId}.quiz.json`, JSON.stringify(packagedQuiz, null, 2));
    folder.file(`${storyId}_ReadingQuiz.html`, previewHtmlForQuiz(packagedQuiz));
    folder.file(`${storyId}_ReadingQuiz.xlsx`, XLSX.write(workbookForQuiz(packagedQuiz, 'reading'), { bookType: 'xlsx', type: 'array' }));
    folder.file(`${storyId}_DevSpec.xlsx`, XLSX.write(workbookForQuiz(packagedQuiz, 'dev'), { bookType: 'xlsx', type: 'array' }));
    collectQuizAssetEntries(item.quiz).forEach(entry => {
      const file = findLocalAssetFile(entry.path);
      if (file) folder.folder(entry.folder).file(file.name, file);
    });
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(batchGeneratedItems.length ? 'Generated_Quiz_Outputs.zip' : 'Approved_Quiz_Exports.zip', 'application/zip', blob);
  toast(`${exportItems.length}개 항목을 ZIP으로 내보냈습니다.`);
}

function exportJson() {
  updateStoryFromInputs();
  downloadBlob(`${quiz.story.storyId}.quiz.json`, 'application/json;charset=utf-8', JSON.stringify(packageQuizForExport(quiz), null, 2));
}

function exportWorkbook(kind) {
  if (!window.XLSX) {
    toast('XLSX 라이브러리를 불러오지 못했습니다.');
    return;
  }
  updateStoryFromInputs();
  const previousQuiz = quiz;
  quiz = packageQuizForExport(quiz);
  try {
    const wb = XLSX.utils.book_new();
    if (kind === 'dev') buildDevWorkbook(wb);
    else buildReadingWorkbook(wb);
    const filename = kind === 'dev' ? `${quiz.story.storyId}_DevSpec.xlsx` : `${quiz.story.storyId}_ReadingQuiz.xlsx`;
    XLSX.writeFile(wb, filename);
  } finally {
    quiz = previousQuiz;
  }
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
    ['q_id','story_id','story_level','number','story_grammar','question_type','instruction','hint','max_score','formula'],
    ...quiz.questions.map(q => [q.qId, quiz.story.storyId, quiz.story.level || '', q.number, q.storyGrammar, q.type, q.instruction, q.hint, q.scoring?.maxScore || 100, q.scoring?.formula || ''])
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
  const packagedQuiz = packageQuizForExport(quiz);
  downloadBlob(`${packagedQuiz.story.storyId}_ReadingQuiz.html`, 'text/html;charset=utf-8', previewHtmlForQuiz(packagedQuiz));
}

function loadJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (parsed.schemaVersion === 'quiz-batch-v1.0' || Array.isArray(parsed.quizzes) || Array.isArray(parsed.items)) {
        loadBatchBundle(parsed);
        toast('Batch JSON을 불러왔습니다.');
      } else {
        syncCurrentBatchItem();
        quiz = parsed;
        currentBatchIndex = -1;
        currentQuestionIndex = 0;
        syncStoryInputs();
        renderAll();
        toast('JSON을 불러왔습니다.');
      }
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
  if ($('left-tab-generate')) $('left-tab-generate').onclick = () => showLeftSection('generate');
  if ($('left-tab-open')) $('left-tab-open').onclick = () => showLeftSection('open');
  if ($('story-package')) $('story-package').onchange = e => loadStoryPackage(e.target.files);
  if ($('story-file-replace')) $('story-file-replace').onchange = e => replaceStoryPackageFiles(e.target.files);
  if ($('resource-replace-file')) $('resource-replace-file').onchange = e => handleResourceReplaceFiles(e.target.files);
  if ($('load-sample-btn')) $('load-sample-btn').onclick = loadSample;
  if ($('quiz-file')) $('quiz-file').onchange = e => loadQuizUploadFiles(e.target.files);
  if ($('batch-file')) $('batch-file').onchange = e => loadBatchFile(e.target.files[0]);
  if ($('asset-folder')) $('asset-folder').onchange = e => loadAssetFolder(e.target.files);
  if ($('batch-template-btn')) $('batch-template-btn').onclick = downloadBatchTemplate;
  if ($('batch-ai-generate-btn')) $('batch-ai-generate-btn').onclick = generateBatchAiDrafts;
  if ($('batch-download-json-btn')) $('batch-download-json-btn').onclick = exportBatchJson;
  if ($('batch-download-zip-btn')) $('batch-download-zip-btn').onclick = exportApprovedZip;
  if ($('generate-ai-btn')) $('generate-ai-btn').onclick = generateAiDraft;
  if ($('apply-btn')) $('apply-btn').onclick = applyEditorChanges;
  if ($('mark-review-btn')) $('mark-review-btn').onclick = () => setCurrentBatchStatus('Needs Review');
  if ($('approve-btn')) $('approve-btn').onclick = () => setCurrentBatchStatus('Approved');
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
