const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function write(rel, content) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function replaceOnce(text, before, after, label) {
  if (!text.includes(before)) throw new Error(`Missing ${label || before}`);
  return text.replace(before, after);
}

function buildPhonics() {
  let html = read('v4/PH0001/PH0001_PhonicsQuiz.html');
  const questions = `const QUIZ=[
 {focus:'Same big letter',type:'chooseLetter',instruction:'Choose the same letter.',hint:'Look at A. Find the other A.',cue:'A',correct:'A',options:['C','A','D','B']},
 {focus:'Big and little letters',type:'chooseLetter',instruction:'Choose the little letter.',hint:'Big B and little b are the same letter.',cue:'B',correct:'b',options:['d','b','a','c']},
 {focus:'Listen for a big letter',type:'listenLetter',instruction:'Choose the letter you hear.',hint:'Listen again. Find big C.',speech:'C.',correct:'C',options:['A','D','C','B']},
 {focus:'Listen for a little letter',type:'listenLetter',instruction:'Choose the little letter you hear.',hint:'Listen again. Find little d.',speech:'D.',correct:'d',options:['b','a','d','c']}
];`;

  html = html.replace(/const QUIZ=\[[\s\S]*?\n\];\nlet current=/, `${questions}\nlet current=`);
  html = replaceOnce(html, '<title>PH0001 · A to D Sound Steps</title>', '<title>PH0001 · A–D Letter Check · v4.2</title>', 'PH title');
  html = replaceOnce(html, 'PHONICS QUIZ · PH0001', 'PHONICS QUIZ · PH0001 · v4.2', 'PH label');
  html = replaceOnce(html, '<h1>A to D Sound Steps</h1>', '<h1>A–D Letter Check</h1>', 'PH heading');
  html = replaceOnce(html, 'Match big and little letters, listen for first sounds, and build your first word.', 'Look at a letter, listen to its name, and choose the matching letter.', 'PH cover copy');
  html = replaceOnce(html, 'aria-label="Back to v4 home"', 'aria-label="Back to v4.2 home"', 'PH home label');
  html = replaceOnce(html, '<div class="mini-score" id="miniScore">0 / 6</div>', '<div class="mini-score" id="miniScore">0 / 4</div>', 'PH score');
  html = replaceOnce(html, 'src="Image/PH0001_hint_owl.png"', 'src="../../v4/PH0001/Image/PH0001_hint_owl.png"', 'PH owl');
  html = replaceOnce(html, '<h2 class="result-title">Sound-step complete!</h2>', '<h2 class="result-title">Letter check complete!</h2>', 'PH result title');
  html = replaceOnce(html, '>v4 home</a>', '>v4.2 home</a>', 'PH result link');
  html = replaceOnce(html, "const SPRITE='Image/PH0001_phonics_sprite.png';", "const SPRITE='../../v4/PH0001/Image/PH0001_phonics_sprite.png';", 'PH sprite');
  html = replaceOnce(
    html,
    "function renderActivity(q){const a=document.getElementById('activity');if(q.type==='sequence')renderSequence(q,a);else if(q.type==='familyMatch')renderFamilyMatch(q,a);else if(q.type==='listenImage')renderListenImage(q,a);else if(q.type==='letters')renderLetters(q,a);else if(q.type==='imageWord')renderImageWord(q,a);else renderListenLetter(q,a)}",
    "function renderActivity(q){const a=document.getElementById('activity');if(q.type==='chooseLetter')renderChooseLetter(q,a);else renderListenLetter(q,a)}",
    'PH renderer switch'
  );
  html = replaceOnce(
    html,
    "function renderListenLetter(q,a){const s=states[current];a.innerHTML=`<div class=\"listen-row\"><button type=\"button\" class=\"speaker\" onclick=\"speak('${q.speech.replace(/'/g,\"\\\\'\")}')\" aria-label=\"Play the letter audio\">🔊</button></div><div class=\"letter-options\">${q.options.map(o=>`<button type=\"button\" class=\"letter-option ${s.selected===o?'selected':''}\" ${locked?'disabled':''} onclick=\"choose('${o}')\">${letterArt(o,null,`Letter ${o}`)}</button>`).join('')}</div>`}",
    "function renderChooseLetter(q,a){const s=states[current];a.innerHTML=`<div class=\"letter-cue\">${letterArt(q.cue,null,`Look at letter ${q.cue}`)}</div><div class=\"letter-options\">${q.options.map(o=>`<button type=\"button\" class=\"letter-option ${s.selected===o?'selected':''}\" ${locked?'disabled':''} onclick=\"choose('${o}')\">${letterArt(o,null,`Letter ${o}`)}</button>`).join('')}</div>`}\nfunction renderListenLetter(q,a){const s=states[current];a.innerHTML=`<div class=\"listen-row\"><button type=\"button\" class=\"speaker\" onclick=\"speak('${q.speech.replace(/'/g,\"\\\\'\")}')\" aria-label=\"Play the letter audio\">🔊</button></div><div class=\"letter-options\">${q.options.map(o=>`<button type=\"button\" class=\"letter-option ${s.selected===o?'selected':''}\" ${locked?'disabled':''} onclick=\"choose('${o}')\">${letterArt(o,null,`Letter ${o}`)}</button>`).join('')}</div>`}",
    'PH letter renderer'
  );
  html = replaceOnce(html, "if(q.type==='listenLetter')return s.selected===q.correct?100:0;", "if(q.type==='listenLetter'||q.type==='chooseLetter')return s.selected===q.correct?100:0;", 'PH scoring');
  html = replaceOnce(html, '</style>', `.letter-cue{width:160px;margin:0 auto 32px;padding:10px;border-radius:28px;background:#fff8dd;box-shadow:0 8px 20px rgba(58,54,91,.10)}
.letter-cue .letter-art{aspect-ratio:1}.letter-cue .letter-main{font-size:100px}
@media(max-width:760px){.letter-cue{width:132px;margin-bottom:24px}.letter-cue .letter-main{font-size:82px}}
</style>`, 'PH cue CSS');

  write('v4.2/PH0001/PH0001_PhonicsQuiz.html', html);
  write('v4.2/PH0001/PH0001.v42.quiz.json', `${JSON.stringify({
    schemaVersion: 'phonics-letter-recognition-v4.2',
    quiz: { id: 'PH0001', title: 'A–D Letter Check', version: 'v4.2', questionCount: 4 },
    designPrinciple: 'Focus only on visual letter identity, uppercase/lowercase correspondence, and heard letter-name recognition.',
    removedTypes: ['Letter Order', 'multi-family completion', 'Letter Unscramble', 'Picture to Word'],
    questions: [
      { number: 1, type: 'Visual uppercase to uppercase', target: 'A', correct: 'A' },
      { number: 2, type: 'Uppercase to lowercase', target: 'B', correct: 'b' },
      { number: 3, type: 'Heard letter name to uppercase', target: 'C', correct: 'C' },
      { number: 4, type: 'Heard letter name to lowercase', target: 'D', correct: 'd' }
    ]
  }, null, 2)}\n`);
}

function buildReader(id, settings) {
  let html = read(`v4.1/${id}/${id}_ReadingQuiz.html`);
  html = replaceOnce(html, 'href="../reader-quiz.css"', 'href="../../v4.1/reader-quiz.css"', `${id} stylesheet`);
  html = replaceOnce(html, 'src="../hint_owl.png"', 'src="../../v4.1/hint_owl.png"', `${id} owl`);
  html = replaceOnce(html, 'src="../reader-quiz.js"', 'src="../../v4.1/reader-quiz.js"', `${id} script`);
  html = html.replace(/Back to v4\.1 home/g, 'Back to v4.2 home').replace(/>v4\.1 home</g, '>v4.2 home<');
  html = replaceOnce(html, '<div class="mini-score" id="miniScore">0 / 6</div>', '<div class="mini-score" id="miniScore">0 / 4</div>', `${id} score`);
  html = html.replace(`sprite:'Image/${id}_story_sprite.png'`, `sprite:'../../v4.1/${id}/Image/${id}_story_sprite.png'`);
  html = html.replace(/audio:'\.\.\/audio\//g, "audio:'../../v4.1/audio/");
  html = html.replace(/questions:\[[\s\S]*?\n \]\n};/, `questions:[\n${settings.questions.join(',\n')}\n ]\n};`);
  html = html.replace(settings.oldCoverCopy, settings.coverCopy);
  html = html.replace(/<title>(.*?)<\/title>/, `<title>${settings.title}</title>`);
  write(`v4.2/${id}/${id}_ReadingQuiz.html`, html);
  write(`v4.2/${id}/${id}.v42.quiz.json`, `${JSON.stringify({
    schemaVersion: 'decodable-reader-v4.2',
    quizId: id,
    title: settings.jsonTitle,
    version: 'v4.2',
    questionCount: 4,
    sourceVersion: 'v4.1',
    retainedQuestions: settings.retainedQuestions,
    removedQuestions: settings.removedQuestions
  }, null, 2)}\n`);
}

buildPhonics();

buildReader('DR0001', {
  title: 'DR0001 · Short i · Tim, Fish and Pig · v4.2',
  jsonTitle: 'Short i · Tim, Fish and Pig',
  oldCoverCopy: 'Listen for short i, match pictures with words, and complete short-i words.',
  coverCopy: 'Listen for short i, complete a word, and choose the picture or word you hear.',
  retainedQuestions: ['Listen to Letter', 'Missing Letter', 'Listen to Picture', 'Listen to Word'],
  removedQuestions: ['Picture and Word Match', 'Sentence Word Order'],
  questions: [
    "  {focus:'Listen for a vowel',type:'listenLetter',instruction:'Choose the sound you hear.',hint:'Listen for short i, as in pig.',speech:'short i',audio:'../../v4.1/audio/short-i.ogg',maxAudioDuration:.3,balancedSpeaker:true,correct:'i',options:['a','e','i','o']}",
    "  {focus:'Missing vowel',type:'missingLetter',instruction:'Choose the missing letter.',hint:'Pig has the short i sound.',picture:3,pictureLabel:'pig',accessibleWord:'p blank g',before:'p',after:'g',correct:'i',options:['a','e','i','u']}",
    "  {focus:'Listen and choose',type:'listenImage',instruction:'Choose the picture you hear.',hint:'Listen for both words: six fish.',speech:'six fish',options:[{id:'tim',sprite:0,label:'Tim',score:0},{id:'sixFish',sprite:2,label:'six fish',score:100},{id:'pig',sprite:3,label:'pig',score:0},{id:'mouth',sprite:5,label:'pig opens its mouth',score:0}]}",
    "  {focus:'Listen for short i',type:'listenWord',instruction:'Choose the word you hear.',hint:'Listen for the short i sound in pig.',speech:'pig',balancedSpeaker:true,correct:'pig',options:['peg','pig','pug','big']}"
  ]
});

buildReader('DR0002', {
  title: "DR0002 · Can or Can't · v4.2",
  jsonTitle: "Can or Can't",
  oldCoverCopy: 'Listen, look, and choose can or can’t to complete each meaning.',
  coverCopy: 'Listen for can and can’t, then choose the picture, word, or sentence that matches.',
  retainedQuestions: ['Listen to Word', 'Listen to Picture', 'Complete the Sentence', 'Picture to Sentence'],
  removedQuestions: ['Can or Can’t Grid', 'Letter Unscramble'],
  questions: [
    "  {focus:'Listen for can’t',type:'listenWord',instruction:'Choose the word you hear.',hint:'Listen for the ending sound in can’t.',speech:'can’t',balancedSpeaker:true,correct:'can’t',options:['can','can’t','cat','and']}",
    "  {focus:'Listen and choose',type:'listenImage',instruction:'Choose the picture you hear.',hint:'Listen for the words ants and bite.',speech:'Ants can bite.',balancedSpeaker:true,options:[{id:'ant',sprite:4,label:'ant bites',score:100},{id:'crow',sprite:3,label:'crow caws',score:67},{id:'dog',sprite:5,label:'dog barks',score:33},{id:'cat',sprite:6,label:'cat jumps',score:0}]}",
    "  {focus:'Complete the sentence',type:'clozeChoice',instruction:'Choose the word.',hint:'The cat is able to jump.',picture:6,pictureLabel:'cat jumps',prompt:'The cat ___ jump.',correct:'can',options:['can','can’t']}",
    "  {focus:'Picture to sentence',type:'imageText',instruction:'Choose the sentence.',hint:'The child is able to read.',picture:7,pictureLabel:'child reads',wideCards:true,options:[{id:'right',text:'I can read!',score:100},{id:'near',text:'I can’t read.',score:67},{id:'other',text:'Cats can jump.',score:33},{id:'wrong',text:'Pigs can fly!',score:0}]}"
  ]
});

function validateHtml(rel, expectedQuestions) {
  const html = read(rel);
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1])
    .filter(script => script.trim());
  inlineScripts.forEach(script => new Function(script));
  const questionCount = (html.match(/\{focus:/g) || []).length;
  if (questionCount !== expectedQuestions) {
    throw new Error(`${rel}: expected ${expectedQuestions} questions, found ${questionCount}`);
  }
}

validateHtml('v4.2/PH0001/PH0001_PhonicsQuiz.html', 4);
validateHtml('v4.2/DR0001/DR0001_ReadingQuiz.html', 4);
validateHtml('v4.2/DR0002/DR0002_ReadingQuiz.html', 4);

console.log('Built v4.2 PH0001, DR0001, and DR0002');
