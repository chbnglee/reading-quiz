/* Quiz v2 override: 6 Story Grammar axes + 1 Synthesis item */

const V2_COUNT = 7;
const V2_SG = [
  { key: "setting", label: "Setting", kor: "배경 이해", q: 0 },
  { key: "initiating_event", label: "Initiating Event", kor: "사건 시작", q: 1 },
  { key: "attempt", label: "Attempt", kor: "해결 행동", q: 2 },
  { key: "reaction", label: "Reaction", kor: "감정 반응", q: 3 },
  { key: "internal_response", label: "Internal Response", kor: "내면 추론", q: 4 },
  { key: "consequence", label: "Consequence", kor: "결과 이해", q: 5 },
];

Object.assign(QD.q01, {
  sg: "setting",
  sgLabel: "Setting",
  correct: "B",
  opts: {
    A: { s: 35, w: "인물 소개 장면(SC01)과 실제 탐색 장소(SC03)를 혼동함" },
    B: { s: 100, w: null },
    C: { s: 55, w: "중요 장면인 연못(SC06)을 장소 배경으로 보았지만 탐색이 시작된 장소와는 다름" },
    D: { s: 20, w: "결말의 집 장면(SC10)을 이야기의 주요 장소로 혼동함" },
  },
});
Object.assign(QD.q02, {
  sg: "initiating_event",
  sgLabel: "Initiating Event",
  opts: {
    A: { s: 100, w: null },
    B: { s: 20, w: "사건 시작(SC02)과 이후 탐색 장면(SC03)을 혼동함" },
    C: { s: 30, w: "문제 발생과 감정 결과 장면(SC06)을 혼동함" },
    D: { s: 0, w: "문제 시작과 해결 장면을 반대로 이해함" },
  },
  correct: "A",
});
Object.assign(QD.q03, {
  sg: "attempt",
  sgLabel: "Attempt",
  correct: ["Milo", "walks", "into", "the", "forest."],
  weights: { Milo: 1.5, walks: 2.5, into: 1.5, the: 1.0, "forest.": 2.5 },
});
Object.assign(QD.q04, {
  sg: "reaction",
  sgLabel: "Reaction",
  opts: {
    A: { s: 0, w: "해결 장면의 기쁨을 슬픔 장면(SC06)에 혼동함" },
    B: { s: 100, w: null },
    C: { s: 40, w: "부정 감정은 잡았지만 sad와 angry를 구별하지 못함" },
    D: { s: 20, w: "갑작스러운 사건의 놀람과 슬픔을 혼동함" },
  },
  correct: "B",
});
Object.assign(QD.q05, {
  sg: "internal_response",
  sgLabel: "Internal Response",
  opts: {
    A: { text: "Everyone has their own color.", s: 100, w: null },
    B: { text: "I want to fly with the butterfly.", s: 20, w: "앞선 나비 장면의 행동을 Milo의 속마음으로 혼동함" },
    C: { text: "The pond is very blue.", s: 45, w: "장면의 표면 정보는 보았지만 Milo의 생각까지 추론하지 못함" },
    D: { text: "I do not need my color.", s: 0, w: "Milo가 색을 찾고 싶어 하는 핵심 동기를 반대로 이해함" },
  },
  correct: "A",
});
Object.assign(QD.q06, {
  sg: "consequence",
  sgLabel: "Consequence",
  correct: ["SC06", "SC07", "SC08", "SC09"],
  weights: { SC06: 2.0, SC07: 1.5, SC08: 1.5, SC09: 2.5 },
  scenes: {
    SC06: { text: "Milo cries.", res: "OG0021_SC06_I.png" },
    SC07: { text: "The pond shines.", res: "OG0021_SC07_I.png" },
    SC08: { text: "Milo laughs.", res: "OG0021_SC08_I.png" },
    SC09: { text: "Colors come back.", res: "OG0021_SC09_I.png" },
  },
});
QD.q07 = {
  sg: "synthesis",
  sgLabel: "Synthesis",
  opts: {
    A: { s: 10, w: "카멜레온의 생태 사실을 주제로 혼동함" },
    B: { s: 30, w: "친구의 도움이라는 행동만 주제로 잡음" },
    C: { s: 100, w: null },
    D: { s: 20, w: "색과 배경 분위기를 전체 의미로 혼동함" },
  },
  correct: "C",
};

while (scores.length < V2_COUNT) scores.push(null);
while (answered.length < V2_COUNT) answered.push(false);
while (mcqSel.length < V2_COUNT) mcqSel.push(null);

let v2SettingDrag = null;
let v2SettingFrom = null;
let v2SettingSlots = { who: null, where: null, situation: null };
let v2ThoughtDrag = null;
let v2ThoughtSelected = null;
let v2ChainDrag = null;
let v2ChainFrom = null;
let v2ChainSlots = { cause: null, result: null };
let v2ConseqDrag = null;
let v2ConseqFrom = null;
let v2ConseqOrder = [];

function injectV2Style() {
  const style = document.createElement("style");
  style.textContent = `
    .cover-version{font-family:'Nunito',sans-serif;font-weight:800;background:white;color:#7C3AED;border:2px solid #EDE9FE;border-radius:999px;padding:7px 18px}
    .setting-mcq-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:10px}
    .setting-mcq-grid .img-mcq-opt{aspect-ratio:16/10}
    .setting-slots{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .setting-slot,.thought-drop,.chain-slot{min-height:76px;border:2.5px dashed #C4B5FD;background:#F8F7FF;border-radius:18px;display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;color:#7C3AED;font-family:'Nunito',sans-serif;font-weight:800}
    .setting-slot.filled,.thought-drop.filled,.chain-slot.filled{border-style:solid;background:#EDE9FE}
    .slot-label{display:block;font-size:11px;color:#6B7280;font-family:'ABeeZee',sans-serif;font-weight:400;margin-bottom:4px}
    .card-bank,.thought-bank,.chain-bank{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:14px;background:#FFFBEB;border-radius:20px;border:2px solid #FDE68A}
    .setting-card,.thought-card,.chain-card{background:white;border:2.5px solid #FCD34D;border-radius:18px;padding:11px 15px;cursor:grab;user-select:none;box-shadow:0 2px 6px rgba(0,0,0,.06);font-size:15px;text-align:center;line-height:1.35;transition:all .2s}
    .setting-card:hover,.thought-card:hover,.chain-card:hover{transform:translateY(-2px);border-color:#A78BFA}
    .conseq-slots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .conseq-slot{min-height:116px;border:2.5px dashed #F9A8D4;background:#FFF7FB;border-radius:18px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;color:#BE185D;font-family:'Nunito',sans-serif;font-weight:900}
    .conseq-slot.filled{border-style:solid;background:#FCE7F3}.conseq-slot img{width:100%;height:100%;object-fit:cover;pointer-events:none}.conseq-slot .pos-label{top:6px;left:6px;background:#BE185D}
    .conseq-bank{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:14px;background:#FFFBEB;border-radius:20px;border:2px solid #FDE68A}
    .conseq-card{aspect-ratio:16/10;border:2.5px solid #FCD34D;border-radius:18px;overflow:hidden;cursor:grab;background:white;box-shadow:0 2px 6px rgba(0,0,0,.06);transition:all .2s}
    .conseq-card:hover{transform:translateY(-2px);border-color:#A78BFA}.conseq-card img{width:100%;height:100%;object-fit:cover;pointer-events:none}
    .report-grid{display:grid;grid-template-columns:minmax(260px,320px) minmax(0,1fr);gap:18px;align-items:start}
    .radar-wrap{background:#F9FAFB;border:2px solid #EDE9FE;border-radius:24px;padding:16px;text-align:center}
    .radar-title{font-family:'Nunito',sans-serif;font-weight:900;color:#7C3AED;margin-bottom:8px}
    .radar-svg{width:100%;max-width:300px;height:auto}.axis-label{font-family:'ABeeZee',sans-serif;font-size:10px;fill:#4B5563}
    .score-cards{display:grid;grid-template-columns:1fr;gap:10px}.sg-score-card,.synthesis-card{border-radius:18px;border:2px solid #E5E7EB;padding:12px;background:white}
    .sg-score-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.sg-name{font-family:'Nunito',sans-serif;font-weight:900;color:#4C1D95;font-size:13px}.sg-score{font-family:'Nunito',sans-serif;font-weight:900;color:#7C3AED}.sg-note{font-size:12px;color:#6B7280;line-height:1.55;margin-top:6px}.synthesis-card{background:#FFF7ED;border-color:#FDBA74}
    .v2-report-section-title{font-family:'Nunito',sans-serif;font-weight:900;color:#92400E;font-size:15px;margin:4px 0 8px}
    .ox-grid{grid-template-columns:repeat(7,1fr);max-width:620px}.student-card{max-width:680px}.ox-cell{min-height:84px;justify-content:center}
    .parent-card{max-width:920px}.parent-q-card{margin-bottom:0}.parent-risk{margin-top:6px}
    @media(max-width:760px){.setting-mcq-grid,.setting-slots,.report-grid,.score-cards,.conseq-slots,.conseq-bank{grid-template-columns:1fr}.ox-grid{grid-template-columns:repeat(4,1fr)}}
  `;
  document.head.appendChild(style);
}

function injectV2Dom() {
  document.querySelector(".cover-title").insertAdjacentHTML("afterend", '<div class="cover-version">Quiz v2 · Story Grammar + Synthesis</div>');
  document.getElementById("progress-bar").insertAdjacentHTML("beforeend", '<div class="dot" id="dot6" onclick="jumpTo(6)">7</div>');
  document.querySelector("#screen-q0 .q-instruction").textContent = "Where does Milo go to look for his color?";
  document.querySelector("#screen-q0 .q-type-tag").textContent = "Setting";
  document.querySelector("#screen-q0 .seq-answer-zone").outerHTML = `
    <div class="setting-mcq-grid" id="q1-setting-grid">
      <div class="img-mcq-opt" data-opt="A" onclick="selectImgMCQ(0,'A')"><img src="Image/OG0021_SC01_I.png" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="img-ph" style="background:#B2EBF2;display:none">🦎</div></div>
      <div class="img-mcq-opt" data-opt="B" onclick="selectImgMCQ(0,'B')"><img src="Image/OG0021_SC03_I.png" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="img-ph" style="background:#FFF9C4;display:none">🌳</div></div>
      <div class="img-mcq-opt" data-opt="C" onclick="selectImgMCQ(0,'C')"><img src="Image/OG0021_SC06_I.png" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="img-ph" style="background:#B3E5FC;display:none">💧</div></div>
      <div class="img-mcq-opt" data-opt="D" onclick="selectImgMCQ(0,'D')"><img src="Image/OG0021_SC10_I.png" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="img-ph" style="background:#FFF8E1;display:none">🪞</div></div>
    </div>`;
  document.getElementById("seq-bank").remove();

  document.querySelector("#screen-q1 .q-instruction").textContent = "Listen. Which scene starts the problem?";
  document.querySelector("#screen-q1 .q-type-tag").textContent = "Initiating Event";

  const q3 = document.getElementById("screen-q2");
  q3.querySelector(".q-instruction").textContent = "Put the story words in order.";
  q3.querySelector(".q-type-tag").textContent = "Attempt";
  q3.querySelector(".q-header").insertAdjacentHTML("afterend", `<div class="scene-strip"><div class="scene-thumb"><img src="Image/OG0021_SC03_I.png" alt="SC03" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="ph" style="background:#FFF9C4;display:none">🦋</div></div></div>`);
  resetWord();

  document.querySelector("#screen-q3 .q-instruction").textContent = "How does Milo feel here?";
  document.querySelector("#screen-q3 .q-type-tag").textContent = "Reaction";

  const q5 = document.getElementById("screen-q4");
  q5.style.background = "#FCE7F3";
  q5.querySelector(".q-instruction").textContent = "What is Milo thinking?";
  q5.querySelector(".q-type-tag").textContent = "Internal Response";
  q5.querySelector("#q5-opts").outerHTML = `
    <div class="scene-strip"><div class="scene-thumb"><img src="Image/OG0021_SC06_I.png" alt="SC06" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="ph" style="background:#B3E5FC;display:none">💧</div></div></div>
    <div class="text-mcq-list" id="q5-opts">
      <div class="text-mcq-opt" data-opt="A" onclick="selectTextMCQ(4,'A')"><div class="opt-circle">A</div>Everyone has their own color.</div>
      <div class="text-mcq-opt" data-opt="B" onclick="selectTextMCQ(4,'B')"><div class="opt-circle">B</div>I want to fly with the butterfly.</div>
      <div class="text-mcq-opt" data-opt="C" onclick="selectTextMCQ(4,'C')"><div class="opt-circle">C</div>The pond is very blue.</div>
      <div class="text-mcq-opt" data-opt="D" onclick="selectTextMCQ(4,'D')"><div class="opt-circle">D</div>I do not need my color.</div>
    </div>`;

  const q6 = document.getElementById("screen-q5");
  q6.querySelector(".q-instruction").textContent = "Put the ending scenes in order.";
  q6.querySelector(".q-type-tag").textContent = "Consequence";
  q6.querySelector("#q6-opts").outerHTML = `
    <div class="conseq-slots" id="conseq-slots">
      <div class="conseq-slot" data-pos="0" ondragover="dragOver(event)" ondrop="dropConseq(event)"><span class="pos-label">1</span>Drop here</div>
      <div class="conseq-slot" data-pos="1" ondragover="dragOver(event)" ondrop="dropConseq(event)"><span class="pos-label">2</span>Drop here</div>
      <div class="conseq-slot" data-pos="2" ondragover="dragOver(event)" ondrop="dropConseq(event)"><span class="pos-label">3</span>Drop here</div>
      <div class="conseq-slot" data-pos="3" ondragover="dragOver(event)" ondrop="dropConseq(event)"><span class="pos-label">4</span>Drop here</div>
    </div>
    <div class="conseq-bank" id="conseq-bank"></div>`;
  q6.querySelector("#nxt5").setAttribute("onclick", "goNext(5)");
  q6.querySelector("#nxt5").textContent = "Next →";
  resetConseq();

  q6.insertAdjacentHTML("afterend", `
  <div id="screen-q6" class="screen q-screen" style="background:#FAE8FF">
    <div class="q-card">
      <div class="q-header"><div class="q-num-badge" style="background:#9333EA">Q7</div><div class="q-instruction">What did Milo find out at the end?</div><div class="q-type-tag" style="background:#9333EA">Synthesis</div></div>
      <div class="text-mcq-list" id="q7-opts">
        <div class="text-mcq-opt" data-opt="A" onclick="selectTextMCQ(6,'A')"><div class="opt-circle">A</div>Colors keep you safe.</div>
        <div class="text-mcq-opt" data-opt="B" onclick="selectTextMCQ(6,'B')"><div class="opt-circle">B</div>Friends always help you.</div>
        <div class="text-mcq-opt" data-opt="C" onclick="selectTextMCQ(6,'C')"><div class="opt-circle">C</div>Your color is inside you.</div>
        <div class="text-mcq-opt" data-opt="D" onclick="selectTextMCQ(6,'D')"><div class="opt-circle">D</div>The world has many colors.</div>
      </div>
      <div class="feedback-banner" id="fb6"></div>
      <div class="nav-row"><button class="btn-retry" id="retry6" onclick="retryQ(6)">↩ Retry</button><button class="btn-check" id="chk6" onclick="submitQ(6)" disabled>Check ✓</button><button class="btn-next" id="nxt6" onclick="showStudentResults()">See Results! 🎉</button></div>
    </div>
  </div>`);

  document.querySelector("#screen-parent .parent-title").textContent = "📋 학부모 리포트 — OG0021 v2";
  document.querySelector(".parent-score-row").insertAdjacentHTML("afterend", `
    <div class="report-grid">
      <div class="radar-wrap"><div class="radar-title">Story Grammar Profile</div><div id="radar-chart"></div></div>
      <div><div class="v2-report-section-title">문항별 점수와 코멘트</div><div class="score-cards" id="sg-score-cards"></div><div class="synthesis-card" id="synthesis-card" style="margin-top:10px"></div></div>
    </div>`);
}

function dragOver(e) { e.preventDefault(); }

function startSetting(e) {
  v2SettingDrag = e.currentTarget.dataset.key;
  v2SettingFrom = e.currentTarget.closest(".setting-slot")?.dataset.slot || "bank";
  e.currentTarget.classList.add("dragging");
}

function dropSetting(e) {
  e.preventDefault();
  const slot = e.currentTarget.dataset.slot;
  if (!v2SettingDrag) return;
  if (v2SettingSlots[slot]) returnSettingCard(slot);
  v2SettingSlots[slot] = v2SettingDrag;
  if (v2SettingFrom === "bank") document.querySelector(`#setting-bank [data-key="${v2SettingDrag}"]`)?.remove();
  else { v2SettingSlots[v2SettingFrom] = null; renderSettingSlot(v2SettingFrom); }
  renderSettingSlot(slot);
  v2SettingDrag = null;
  v2SettingFrom = null;
  document.getElementById("chk0").disabled = Object.values(v2SettingSlots).filter(Boolean).length < 3;
  const bank = document.getElementById("setting-bank");
  bank.style.display = bank.children.length ? "" : "none";
}

function renderSettingSlot(slot) {
  const el = document.querySelector(`.setting-slot[data-slot="${slot}"]`);
  if (!el) return;
  const key = v2SettingSlots[slot];
  const label = { who: "Who?", where: "Where?", situation: "At first..." }[slot];
  if (key) {
    el.classList.add("filled");
    el.innerHTML = `<span><span class="slot-label">${label}</span>${QD.q01.opts[key].text}</span>`;
    el.draggable = true;
    el.ondragstart = () => { v2SettingDrag = key; v2SettingFrom = slot; };
  } else {
    el.classList.remove("filled");
    el.draggable = false;
    el.innerHTML = `<span><span class="slot-label">${label}</span>Drop here</span>`;
  }
}

function returnSettingCard(slot) {
  const key = v2SettingSlots[slot];
  if (!key) return;
  const div = document.createElement("div");
  div.className = "setting-card";
  div.draggable = true;
  div.dataset.key = key;
  div.textContent = QD.q01.opts[key].text;
  div.ondragstart = startSetting;
  document.getElementById("setting-bank").appendChild(div);
  document.getElementById("setting-bank").style.display = "";
  v2SettingSlots[slot] = null;
}

function resetSetting() {
  mcqSel[0] = null;
  document.querySelectorAll("#q1-setting-grid .img-mcq-opt").forEach(el => {
    el.classList.remove("selected", "correct-ans", "wrong-ans");
  });
}

checkWordReady = function() {
  document.getElementById("chk2").disabled = wordOrder.length < QD.q03.correct.length;
};

function resetWordV2() {
  wordOrder = [];
  renderWordAnswer();
  const bank = document.getElementById("word-bank");
  bank.style.display = "";
  bank.innerHTML = ["walks", "forest.", "Milo", "the", "into"].map(w =>
    `<div class="word-chip" draggable="true" data-word="${w}" ondragstart="wordStart(event)" ondragend="wordEnd(event)">${w}</div>`
  ).join("");
}
const resetWord = resetWordV2;

function startThought(e) {
  v2ThoughtDrag = e.currentTarget.dataset.opt;
  e.currentTarget.classList.add("dragging");
}
function dropThought(e) {
  e.preventDefault();
  if (!v2ThoughtDrag) return;
  v2ThoughtSelected = v2ThoughtDrag;
  const drop = document.getElementById("thought-drop");
  drop.classList.add("filled");
  drop.textContent = QD.q05.opts[v2ThoughtSelected].text;
  document.getElementById("chk4").disabled = false;
  v2ThoughtDrag = null;
}
function resetThought() {
  v2ThoughtDrag = null;
  v2ThoughtSelected = null;
  const drop = document.getElementById("thought-drop");
  if (drop) {
    drop.className = "thought-drop";
    drop.textContent = "Drop one thought here";
  }
  const bank = document.getElementById("thought-bank");
  if (bank) bank.innerHTML = ["A", "B", "C", "D"].map(k =>
    `<div class="thought-card" draggable="true" data-opt="${k}" ondragstart="startThought(event)">${QD.q05.opts[k].text}</div>`
  ).join("");
}

function startChain(e) {
  v2ChainDrag = e.currentTarget.dataset.key;
  v2ChainFrom = e.currentTarget.closest(".chain-slot")?.dataset.slot || "bank";
  e.currentTarget.classList.add("dragging");
}
function dropChain(e) {
  e.preventDefault();
  const slot = e.currentTarget.dataset.slot;
  if (!v2ChainDrag) return;
  if (v2ChainSlots[slot]) returnChainCard(slot);
  v2ChainSlots[slot] = v2ChainDrag;
  if (v2ChainFrom === "bank") document.querySelector(`#chain-bank [data-key="${v2ChainDrag}"]`)?.remove();
  else { v2ChainSlots[v2ChainFrom] = null; renderChainSlot(v2ChainFrom); }
  renderChainSlot(slot);
  v2ChainDrag = null;
  v2ChainFrom = null;
  document.getElementById("chk5").disabled = Object.values(v2ChainSlots).filter(Boolean).length < 2;
  const bank = document.getElementById("chain-bank");
  bank.style.display = bank.children.length ? "" : "none";
}
function renderChainSlot(slot) {
  const el = document.querySelector(`.chain-slot[data-slot="${slot}"]`);
  if (!el) return;
  const key = v2ChainSlots[slot];
  const label = { cause: "Cause", result: "Result" }[slot];
  if (key) {
    el.classList.add("filled");
    el.innerHTML = `<span><span class="slot-label">${label}</span>${QD.q06.opts[key].text}</span>`;
    el.draggable = true;
    el.ondragstart = () => { v2ChainDrag = key; v2ChainFrom = slot; };
  } else {
    el.classList.remove("filled");
    el.draggable = false;
    el.innerHTML = `<span><span class="slot-label">${label}</span>Drop here</span>`;
  }
}
function returnChainCard(slot) {
  const key = v2ChainSlots[slot];
  if (!key) return;
  const div = document.createElement("div");
  div.className = "chain-card";
  div.draggable = true;
  div.dataset.key = key;
  div.textContent = QD.q06.opts[key].text;
  div.ondragstart = startChain;
  document.getElementById("chain-bank").appendChild(div);
  document.getElementById("chain-bank").style.display = "";
  v2ChainSlots[slot] = null;
}
function resetChain() {
  resetConseq();
}

function startConseq(e) {
  v2ConseqDrag = e.currentTarget.dataset.scene;
  v2ConseqFrom = e.currentTarget.closest(".conseq-slot")?.dataset.pos ?? "bank";
  e.currentTarget.classList.add("dragging");
}

function dropConseq(e) {
  e.preventDefault();
  const pos = Number(e.currentTarget.dataset.pos);
  if (!v2ConseqDrag) return;
  if (v2ConseqOrder[pos]) returnConseqCard(pos);
  v2ConseqOrder[pos] = v2ConseqDrag;
  if (v2ConseqFrom === "bank") document.querySelector(`#conseq-bank [data-scene="${v2ConseqDrag}"]`)?.remove();
  else {
    v2ConseqOrder[Number(v2ConseqFrom)] = null;
    renderConseqSlot(Number(v2ConseqFrom));
  }
  renderConseqSlot(pos);
  v2ConseqDrag = null;
  v2ConseqFrom = null;
  document.getElementById("chk5").disabled = v2ConseqOrder.filter(Boolean).length < QD.q06.correct.length;
  const bank = document.getElementById("conseq-bank");
  bank.style.display = bank.children.length ? "" : "none";
}

function renderConseqSlot(pos) {
  const el = document.querySelector(`.conseq-slot[data-pos="${pos}"]`);
  if (!el) return;
  const scene = v2ConseqOrder[pos];
  el.style.borderColor = "";
  el.style.background = "";
  if (scene) {
    el.classList.add("filled");
    el.draggable = true;
    el.ondragstart = () => { v2ConseqDrag = scene; v2ConseqFrom = String(pos); };
    el.innerHTML = `<span class="pos-label">${pos + 1}</span><img src="Image/OG0021_${scene}_I.png" alt="${scene}">`;
  } else {
    el.classList.remove("filled");
    el.draggable = false;
    el.innerHTML = `<span class="pos-label">${pos + 1}</span>Drop here`;
  }
}

function returnConseqCard(pos) {
  const scene = v2ConseqOrder[pos];
  if (!scene) return;
  const div = document.createElement("div");
  div.className = "conseq-card";
  div.draggable = true;
  div.dataset.scene = scene;
  div.ondragstart = startConseq;
  div.innerHTML = `<img src="Image/OG0021_${scene}_I.png" alt="${scene}">`;
  document.getElementById("conseq-bank").appendChild(div);
  document.getElementById("conseq-bank").style.display = "";
  v2ConseqOrder[pos] = null;
}

function resetConseq() {
  v2ConseqOrder = Array(QD.q06.correct.length).fill(null);
  for (let i = 0; i < QD.q06.correct.length; i++) renderConseqSlot(i);
  const bank = document.getElementById("conseq-bank");
  if (!bank) return;
  bank.style.display = "";
  bank.innerHTML = ["SC08", "SC06", "SC09", "SC07"].map(scene =>
    `<div class="conseq-card" draggable="true" data-scene="${scene}" ondragstart="startConseq(event)"><img src="Image/OG0021_${scene}_I.png" alt="${scene}"></div>`
  ).join("");
}

updateDots = function() {
  for (let i = 0; i < V2_COUNT; i++) {
    const dot = document.getElementById("dot" + i);
    if (dot) dot.className = "dot" + (answered[i] ? " done" : "") + (i === currentQ ? " active" : "");
  }
};

selectImgMCQ = function(qIdx, opt) {
  if (answered[qIdx]) return;
  const gridId = qIdx === 0 ? "q1-setting-grid" : "q2-grid";
  document.querySelectorAll("#" + gridId + " .img-mcq-opt").forEach(el => el.classList.remove("selected"));
  document.querySelector("#" + gridId + ` [data-opt="${opt}"]`)?.classList.add("selected");
  mcqSel[qIdx] = opt;
  document.getElementById("chk" + qIdx).disabled = false;
};

selectTextMCQ = function(qIdx, opt) {
  if (answered[qIdx]) return;
  const ids = { 3: "q4-opts", 4: "q5-opts", 6: "q7-opts" };
  const id = ids[qIdx];
  document.querySelectorAll("#" + id + " .text-mcq-opt").forEach(el => el.classList.remove("selected"));
  document.querySelector("#" + id + ` [data-opt="${opt}"]`).classList.add("selected");
  mcqSel[qIdx] = opt;
  document.getElementById("chk" + qIdx).disabled = false;
};

submitQ = function(qIdx) {
  answered[qIdx] = true;
  document.getElementById("chk" + qIdx).disabled = true;
  let score = 0;
  if (qIdx === 0) {
    const sel = mcqSel[0];
    score = sel ? QD.q01.opts[sel].s : 0;
    answerLog.q01 = { selected: sel, score };
    markImage("q1-setting-grid", QD.q01.correct, sel);
  } else if (qIdx === 1) {
    const sel = mcqSel[1];
    score = sel ? QD.q02.opts[sel].s : 0;
    answerLog.q02 = { selected: sel, score };
    markImage("q2-grid", QD.q02.correct, sel);
  } else if (qIdx === 2) {
    const total = Object.values(QD.q03.weights).reduce((a, b) => a + b, 0);
    let earned = 0;
    wordOrder.forEach((w, i) => { if (w === QD.q03.correct[i]) earned += QD.q03.weights[w] || 0; });
    score = Math.round(earned / total * 100);
    answerLog.q03 = { wordOrder: [...wordOrder], score };
    document.querySelectorAll("#unscrm-answer .word-chip").forEach((chip, i) => {
      chip.style.borderColor = wordOrder[i] === QD.q03.correct[i] ? "#10B981" : "#EF4444";
      chip.style.background = wordOrder[i] === QD.q03.correct[i] ? "#D1FAE5" : "#FEE2E2";
    });
  } else if (qIdx === 3) {
    const sel = mcqSel[3];
    score = sel ? QD.q04.opts[sel].s : 0;
    answerLog.q04 = { selected: sel, score };
    markText("q4-opts", QD.q04.correct, sel);
  } else if (qIdx === 4) {
    const sel = mcqSel[4];
    score = sel ? QD.q05.opts[sel].s : 0;
    answerLog.q05 = { selected: sel, score };
    markText("q5-opts", QD.q05.correct, sel);
  } else if (qIdx === 5) {
    const total = Object.values(QD.q06.weights).reduce((a, b) => a + b, 0);
    let earned = 0;
    v2ConseqOrder.forEach((scene, placedIdx) => {
      const correctIdx = QD.q06.correct.indexOf(scene);
      if (correctIdx < 0) return;
      const distance = Math.abs(placedIdx - correctIdx);
      earned += (QD.q06.weights[scene] || 0) * Math.max(0, 1 - distance * 0.5);
    });
    score = Math.round(earned / total * 100);
    answerLog.q06 = { order: [...v2ConseqOrder], score };
    document.querySelectorAll(".conseq-slot").forEach((slot, i) => {
      const ok = v2ConseqOrder[i] === QD.q06.correct[i];
      slot.style.borderColor = ok ? "#10B981" : "#EF4444";
      slot.style.background = ok ? "#ECFDF5" : "#FEF2F2";
    });
  } else if (qIdx === 6) {
    const sel = mcqSel[6];
    score = sel ? QD.q07.opts[sel].s : 0;
    answerLog.q07 = { selected: sel, score };
    markText("q7-opts", QD.q07.correct, sel);
  }
  scores[qIdx] = Math.round(score);
  showFeedback(qIdx, scores[qIdx]);
  document.getElementById("retry" + qIdx).classList.add("show");
  document.getElementById("nxt" + qIdx).classList.add("show");
  updateDots();
};

function markImage(id, correct, sel) {
  document.querySelectorAll("#" + id + " .img-mcq-opt").forEach(el => {
    el.classList.remove("selected");
    if (el.dataset.opt === correct) el.classList.add("correct-ans");
    else if (el.dataset.opt === sel) el.classList.add("wrong-ans");
  });
}

function markText(id, correct, sel) {
  document.querySelectorAll("#" + id + " .text-mcq-opt").forEach(el => {
    el.classList.remove("selected");
    if (el.dataset.opt === correct) el.classList.add("correct-ans");
    else if (el.dataset.opt === sel) el.classList.add("wrong-ans");
  });
}

function showFeedback(qIdx, score) {
  const fb = document.getElementById("fb" + qIdx);
  fb.className = "feedback-banner show " + (score >= 85 ? "correct" : "wrong");
  fb.textContent = score >= 85
    ? (score === 100 ? "⭐ Perfect! 100 / 100" : `✨ Great! ${score} / 100`)
    : (score >= 50 ? `Good try! ${score} / 100 — Review the story!` : `${score} / 100 — Let's look at the story again!`);
}

retryQ = function(qIdx) {
  answered[qIdx] = false;
  scores[qIdx] = null;
  mcqSel[qIdx] = null;
  const fb = document.getElementById("fb" + qIdx);
  if (fb) { fb.className = "feedback-banner"; fb.textContent = ""; }
  document.getElementById("retry" + qIdx)?.classList.remove("show");
  document.getElementById("nxt" + qIdx)?.classList.remove("show");
  const chk = document.getElementById("chk" + qIdx);
  if (chk) chk.disabled = true;
  if (qIdx === 0) resetSetting();
  else if (qIdx === 1) {
    document.querySelectorAll("#q2-grid .img-mcq-opt").forEach(el => el.classList.remove("selected", "correct-ans", "wrong-ans"));
    resetPlayBtn();
  } else if (qIdx === 2) resetWord();
  else if (qIdx === 3) document.querySelectorAll("#q4-opts .text-mcq-opt").forEach(el => el.classList.remove("selected", "correct-ans", "wrong-ans"));
  else if (qIdx === 4) document.querySelectorAll("#q5-opts .text-mcq-opt").forEach(el => el.classList.remove("selected", "correct-ans", "wrong-ans"));
  else if (qIdx === 5) resetConseq();
  else if (qIdx === 6) document.querySelectorAll("#q7-opts .text-mcq-opt").forEach(el => el.classList.remove("selected", "correct-ans", "wrong-ans"));
  updateDots();
};

function sgScores() {
  return {
    setting: scores[0] || 0,
    initiating_event: scores[1] || 0,
    attempt: scores[2] || 0,
    reaction: scores[3] || 0,
    internal_response: scores[4] || 0,
    consequence: scores[5] || 0,
  };
}
function storyGrammarAverage() {
  const vals = Object.values(sgScores());
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
function overallScore() {
  return Math.round(storyGrammarAverage() * 0.8 + (scores[6] || 0) * 0.2);
}

showStudentResults = function() {
  const oCount = scores.filter(s => s >= 85).length;
  document.getElementById("student-title").textContent =
    oCount === 7 ? "⭐ Perfect Score!" : oCount >= 5 ? "🎉 Great Job!" : "🌈 Quiz Complete!";
  document.getElementById("student-praise").textContent =
    oCount >= 5 ? "You read the story with care! Keep going!" : "Keep going!\nMilo found his color —\nyou'll find your answers too! 🌈";
  const grid = document.getElementById("ox-grid");
  grid.innerHTML = "";
  ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"].forEach((lbl, i) => {
    const ok = (scores[i] || 0) >= 85;
    grid.innerHTML += `<div class="ox-cell"><div class="q-label">${lbl}</div><div class="ox-symbol ${ok ? "o" : "x"}">${ok ? "○" : "✕"}</div></div>`;
  });
  showScreen("screen-student");
};

showParentResults = function() {
  const sg = sgScores();
  const sgAvg = storyGrammarAverage();
  const syn = scores[6] || 0;
  const total = overallScore();
  document.getElementById("parent-score-big").textContent = total;
  document.getElementById("parent-score-label").textContent =
    "— " + (total >= 90 ? "우수 (Excellent)" : total >= 70 ? "양호 (Good)" : total >= 50 ? "보통 (Average)" : "집중 지도 필요")
    + ` · SG ${sgAvg} / Synthesis ${syn}`;
  document.getElementById("radar-chart").innerHTML = renderRadar(sg);

  const defs = [
    { qNum: "Q1", sg: "Setting", kor: "장소 배경 찾기", type: "mcq", logKey: "q01", qd: QD.q01 },
    { qNum: "Q2", sg: "Initiating Event", kor: "사건 시작 장면", type: "mcq", logKey: "q02", qd: QD.q02 },
    { qNum: "Q3", sg: "Attempt", kor: "행동 문장 만들기", type: "word", logKey: "q03" },
    { qNum: "Q4", sg: "Reaction", kor: "감정 반응", type: "mcq", logKey: "q04", qd: QD.q04 },
    { qNum: "Q5", sg: "Internal Response", kor: "생각/내면 추론", type: "mcq", logKey: "q05", qd: QD.q05 },
    { qNum: "Q6", sg: "Consequence", kor: "결말 순서 배열", type: "sequence", logKey: "q06" },
    { qNum: "Q7", sg: "Synthesis", kor: "전체 의미 종합", type: "mcq", logKey: "q07", qd: QD.q07 },
  ];
  document.getElementById("sg-score-cards").innerHTML = defs.map((d, i) => {
    const s = scores[i] || 0;
    const pass = s >= 85;
    return `<div class="sg-score-card ${pass ? "pass" : "fail"}"><div class="parent-q-header"><div class="parent-q-num">${d.qNum}</div><span class="sg-label">${d.sg}</span><div class="parent-q-title">${d.kor}</div><div class="parent-q-score">${s} / 100</div></div><div class="sg-note">${buildParentFeedbackV2(d, s)}</div></div>`;
  }).join("");
  document.getElementById("synthesis-card").style.display = "none";
  document.getElementById("parent-q-list").innerHTML = "";
  document.getElementById("parent-q-list").style.display = "none";
  const risks = V2_SG.filter(d => sg[d.key] < 70).map(d => `• ${d.kor}: ${feedbackLine(d.key, sg[d.key])}`);
  if (syn < 70) risks.push("• 전체 의미 종합: " + feedbackLine("synthesis", syn));
  document.getElementById("parent-risk-body").innerHTML = risks.length ? risks.join("<br>") : "✅ 6개 Story Grammar와 Synthesis 모두 안정적입니다.";
  showScreen("screen-parent");
};

function renderRadar(sg) {
  const vals = V2_SG.map(d => sg[d.key] || 0);
  const cx = 150, cy = 150, maxR = 95;
  const angles = [-90, -30, 30, 90, 150, 210].map(a => a * Math.PI / 180);
  const rings = [20, 40, 60, 80, 100].map(v => `<polygon points="${angles.map(a => `${cx + Math.cos(a) * maxR * v / 100},${cy + Math.sin(a) * maxR * v / 100}`).join(" ")}" fill="none" stroke="#E5E7EB" stroke-width="1"/>`).join("");
  const axes = angles.map((a, i) => `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * maxR}" y2="${cy + Math.sin(a) * maxR}" stroke="#E5E7EB"/><text class="axis-label" x="${cx + Math.cos(a) * (maxR + 28)}" y="${cy + Math.sin(a) * (maxR + 25)}" text-anchor="middle">${V2_SG[i].label.replace("Initiating Event", "Init. Event").replace("Internal Response", "Internal")}</text>`).join("");
  const poly = angles.map((a, i) => `${cx + Math.cos(a) * maxR * vals[i] / 100},${cy + Math.sin(a) * maxR * vals[i] / 100}`).join(" ");
  return `<svg viewBox="0 0 300 300" class="radar-svg">${rings}${axes}<polygon points="${poly}" fill="rgba(124,58,237,.28)" stroke="#7C3AED" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="3" fill="#7C3AED"/></svg>`;
}

function feedbackLine(key, s) {
  const band = s >= 85 ? "stable" : s >= 70 ? "developing" : s >= 50 ? "shaky" : "focus";
  const m = {
    setting: { stable: "인물·장소·처음 상황을 안정적으로 잡았습니다.", developing: "배경의 큰 틀은 잡았고, 문제 상황과 시작 상황 구분만 더 다듬으면 좋습니다.", shaky: "중간 장면 정보를 시작 배경으로 가져오는 경향이 있습니다.", focus: "인물·장소·처음 상황을 다시 짚는 읽기 전 활동이 필요합니다." },
    initiating_event: { stable: "사건이 시작된 문제 장면을 정확히 찾았습니다.", developing: "발단 장면은 대체로 이해하지만 이후 장면과 헷갈릴 수 있습니다.", shaky: "문제 시작과 감정 결과 장면을 섞어 이해하는 모습이 있습니다.", focus: "무엇 때문에 이야기가 시작됐는지 한 문장으로 말해보는 연습이 필요합니다." },
    attempt: { stable: "Milo가 문제를 해결하려고 한 행동을 문장으로 잘 구성했습니다.", developing: "행동의 핵심은 잡았고 단어 순서 안정성이 조금 더 필요합니다.", shaky: "행동 문장의 주어-동사-목적 흐름이 흔들립니다.", focus: "인물이 원하는 것과 그래서 한 행동을 연결해 읽는 연습이 필요합니다." },
    reaction: { stable: "사건 결과에 대한 Milo의 감정 반응을 잘 이해했습니다.", developing: "기본 감정은 이해하지만 비슷한 부정 감정 구분이 필요합니다.", shaky: "장면의 분위기는 보지만 정확한 감정 라벨이 흔들립니다.", focus: "Sad/Angry/Surprised 같은 기본 감정어를 장면 근거와 함께 연습하세요." },
    internal_response: { stable: "겉감정을 넘어 Milo의 생각과 내면 상태까지 잘 추론했습니다.", developing: "감정은 파악했고, 그 안의 생각을 말로 연결하는 연습이 좋습니다.", shaky: "표면 정보에 머물러 인물의 속마음 추론이 약합니다.", focus: "“왜 그렇게 느꼈을까?”를 한 문장으로 말하는 연습이 필요합니다." },
    consequence: { stable: "행동과 결과의 연결을 안정적으로 이해했습니다.", developing: "결과는 알지만 원인과 연결하는 힘을 더 키우면 좋습니다.", shaky: "일어난 사건과 그 결과의 순서가 흔들립니다.", focus: "원인→결과 카드를 놓으며 사건 전개를 다시 확인하세요." },
    synthesis: { stable: "이야기의 전체 의미를 세부 장면 너머로 잘 종합했습니다.", developing: "큰 의미는 잡았고, 세부 사실과 주제를 구분하면 더 좋아집니다.", shaky: "좋아 보이는 세부 내용을 전체 주제로 고르는 경향이 있습니다.", focus: "“이 이야기가 말하고 싶은 한 가지”를 짧게 말하는 연습이 필요합니다." },
  };
  return m[key][band];
}

function buildParentFeedbackV2(def, score) {
  if (score >= 85) return "✅ " + feedbackLine(def.sg.toLowerCase().replaceAll(" ", "_"), score);
  const log = answerLog[def.logKey];
  if (!log) return "문제를 완료하지 않았습니다.";
  if (def.type === "word") {
    const wrongs = (log.wordOrder || []).map((w, i) => w !== QD.q03.correct[i] ? `${i + 1}번째 ${w}→${QD.q03.correct[i]}` : null).filter(Boolean);
    return (wrongs.length ? `오답 위치: ${wrongs.join(", ")}. ` : "") + feedbackLine("attempt", score);
  }
  if (def.type === "thought") {
    const sel = log.selected;
    return `선택: ${QD.q05.opts[sel]?.text || "없음"} (${score}점). ` + (QD.q05.opts[sel]?.w || feedbackLine("internal_response", score));
  }
  if (def.type === "sequence") {
    const order = (log.order || []).map(sc => `${sc} ${QD.q06.scenes[sc]?.text || ""}`).join(" → ");
    return `배치: ${order || "없음"}. ${feedbackLine("consequence", score)}`;
  }
  if (def.type === "mcq") {
    const sel = log.selected, qd = def.qd;
    const map = { q01: "setting", q02: "initiating_event", q04: "reaction", q05: "internal_response", q07: "synthesis" };
    return `선택: 옵션 ${sel || "없음"} (${score}점). ` + (qd.opts[sel]?.w || feedbackLine(map[def.logKey], score));
  }
  return "";
}

downloadDevSpec = function() {
  const wb = XLSX.utils.book_new();
  const story = "OG0021";

  const questionRows = [[
    "q_id", "story_id", "q_number", "q_type_code", "q_type_label",
    "sg_element", "sg_label_en", "instruction_en", "img_resource",
    "audio_resource", "correct_answer", "scoring_type", "max_score",
    "report_bucket"
  ]];
  [
    ["OG0021_V2_Q01", 1, "SETTING_IMAGE_MCQ", "Setting Image Choice", "setting", "Setting", "Where does Milo go to look for his color?", "OG0021_SC01_I.png, OG0021_SC03_I.png, OG0021_SC06_I.png, OG0021_SC10_I.png", "-", QD.q01.correct, "fixed_option_score", 100, "radar"],
    ["OG0021_V2_Q02", 2, "LISTEN_SCENE_MCQ", "Listening Scene Match", "initiating_event", "Initiating Event", "Listen. Which scene starts the problem?", "OG0021_SC02_I.png, OG0021_SC03_I.png, OG0021_SC06_I.png, OG0021_SC09_I.png", QD.q02.audioSrc || "Audio/OG0021_SC02_ST01_N_A.mp3", QD.q02.correct, "fixed_option_score", 100, "radar"],
    ["OG0021_V2_Q03", 3, "SCENE_WORD_DRAG", "Scene-Anchored Unscramble", "attempt", "Attempt", "Put the story words in order.", "OG0021_SC03_I.png", "-", QD.q03.correct.join(" "), "weighted_word_position", 100, "radar"],
    ["OG0021_V2_Q04", 4, "EMOTION_MCQ", "Emotion Match", "reaction", "Reaction", "How does Milo feel here?", "OG0021_SC06_I.png", "-", QD.q04.correct, "fixed_option_score", 100, "radar"],
    ["OG0021_V2_Q05", 5, "INTERNAL_RESPONSE_MCQ", "Internal Response MCQ", "internal_response", "Internal Response", "What is Milo thinking?", "OG0021_SC06_I.png", "-", QD.q05.correct, "fixed_option_score", 100, "radar"],
    ["OG0021_V2_Q06", 6, "ENDING_SEQUENCE_DRAG", "Ending Scene Sequence", "consequence", "Consequence", "Put the ending scenes in order.", "OG0021_SC06_I.png, OG0021_SC07_I.png, OG0021_SC08_I.png, OG0021_SC09_I.png", "-", QD.q06.correct.join(", "), "weighted_position", 100, "radar"],
    ["OG0021_V2_Q07", 7, "SYNTHESIS_MCQ", "Synthesis MCQ", "synthesis", "Synthesis", "What did Milo find out at the end?", "-", "-", QD.q07.correct, "fixed_option_score", 100, "separate_synthesis"],
  ].forEach(row => questionRows.push([
    row[0], story, row[1], row[2], row[3], row[4], row[5], row[6],
    row[7], row[8], row[9], row[10], row[11], row[12]
  ]));
  const wsQ = XLSX.utils.aoa_to_sheet(questionRows);
  wsQ["!cols"] = [
    { wch: 16 }, { wch: 9 }, { wch: 9 }, { wch: 20 }, { wch: 28 },
    { wch: 20 }, { wch: 22 }, { wch: 42 }, { wch: 58 }, { wch: 34 },
    { wch: 54 }, { wch: 24 }, { wch: 10 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsQ, "QUESTIONS");

  const optionRows = [[
    "q_id", "option_key", "option_text", "slot_key", "item_weight",
    "score_value", "is_correct", "resource_file", "diagnostic_code"
  ]];

  [["A", "OG0021_SC01_I.png"], ["B", "OG0021_SC03_I.png"], ["C", "OG0021_SC06_I.png"], ["D", "OG0021_SC10_I.png"]].forEach(([key, res]) => {
    const opt = QD.q01.opts[key];
    optionRows.push(["OG0021_V2_Q01", key, res.replace(".png", ""), "", "", opt.s, key === QD.q01.correct ? "TRUE" : "FALSE", res, opt.w || ""]);
  });
  [["A", "OG0021_SC02_I.png"], ["B", "OG0021_SC03_I.png"], ["C", "OG0021_SC06_I.png"], ["D", "OG0021_SC09_I.png"]].forEach(([key, res]) => {
    const opt = QD.q02.opts[key];
    optionRows.push(["OG0021_V2_Q02", key, res.replace(".png", ""), "", "", opt.s, key === QD.q02.correct ? "TRUE" : "FALSE", res, opt.w || ""]);
  });
  QD.q03.correct.forEach((word, idx) => {
    optionRows.push(["OG0021_V2_Q03", String(idx + 1), word, "word_position_" + (idx + 1), QD.q03.weights[word], "", "TRUE", "-", ""]);
  });
  const q04Text = { A: "Happy", B: "Sad", C: "Angry", D: "Surprised" };
  Object.entries(QD.q04.opts).forEach(([key, opt]) => {
    optionRows.push(["OG0021_V2_Q04", key, q04Text[key], "", "", opt.s, key === QD.q04.correct ? "TRUE" : "FALSE", "OG0021_SC06_I.png", opt.w || ""]);
  });
  Object.entries(QD.q05.opts).forEach(([key, opt]) => {
    optionRows.push(["OG0021_V2_Q05", key, opt.text, "thought", "", opt.s, key === QD.q05.correct ? "TRUE" : "FALSE", "-", opt.w || ""]);
  });
  QD.q06.correct.forEach((scene, idx) => {
    const item = QD.q06.scenes[scene];
    optionRows.push(["OG0021_V2_Q06", scene, item.text, "position_" + (idx + 1), QD.q06.weights[scene], "", "TRUE", item.res, ""]);
  });
  const q07Text = {
    A: "Colors keep you safe.",
    B: "Friends always help you.",
    C: "Your color is inside you.",
    D: "The world has many colors."
  };
  Object.entries(QD.q07.opts).forEach(([key, opt]) => {
    optionRows.push(["OG0021_V2_Q07", key, q07Text[key], "", "", opt.s, key === QD.q07.correct ? "TRUE" : "FALSE", "-", opt.w || ""]);
  });
  const wsO = XLSX.utils.aoa_to_sheet(optionRows);
  wsO["!cols"] = [{ wch: 16 }, { wch: 14 }, { wch: 36 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 11 }, { wch: 28 }, { wch: 46 }];
  XLSX.utils.book_append_sheet(wb, wsO, "OPTIONS");

  const scoringRows = [
    ["q_id", "scoring_type", "formula_pseudocode", "story_grammar_score_rule", "notes"],
    ["OG0021_V2_Q01", "fixed_option_score", "score = opts[selected].score_value", "Setting = Q01 score", "장소 배경을 직접 이미지로 선택"],
    ["OG0021_V2_Q02", "fixed_option_score", "score = opts[selected].score_value", "Initiating Event = Q02 score", "오답도 발단 장면과의 의미 거리로 부분 점수"],
    ["OG0021_V2_Q03", "weighted_word_position", "score = round(sum(weight[word] if word is in exact position) / sum(weights) * 100)", "Attempt = Q03 score", "원문 SC03_ST01_N 문장 그대로 사용"],
    ["OG0021_V2_Q04", "fixed_option_score", "score = opts[selected].score_value", "Reaction = Q04 score", "감정 라벨의 유사도에 따라 부분 점수"],
    ["OG0021_V2_Q05", "fixed_option_score", "score = opts[selected].score_value", "Internal Response = Q05 score", "보기형으로 내면 생각을 직접 선택"],
    ["OG0021_V2_Q06", "weighted_position", "score = round(sum(weight_i * max(0, 1 - abs(placed_pos_i - correct_pos_i) * 0.5)) / sum(weights) * 100)", "Consequence = Q06 score", "결말 장면의 전개 순서를 이미지로 배열"],
    ["OG0021_V2_Q07", "fixed_option_score", "score = opts[selected].score_value", "Synthesis = separate score; not in 6-axis radar", "전체 의미/주제는 별도 카드와 전체점수 20% 반영"],
    ["OVERALL", "composite", "overall = average(Setting..Consequence) * 0.8 + Synthesis * 0.2", "Parent report headline score", "6축 진단 안정성을 유지하면서 전체 의미 이해도 반영"],
  ];
  const wsS = XLSX.utils.aoa_to_sheet(scoringRows);
  wsS["!cols"] = [{ wch: 16 }, { wch: 24 }, { wch: 76 }, { wch: 44 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, wsS, "SCORING_RULES");

  const metricRows = [[
    "metric_key", "label_en", "label_ko", "source_q_id", "chart_role",
    "aggregation_rule", "parent_report_feedback_source"
  ]];
  V2_SG.forEach(axis => metricRows.push([
    axis.key, axis.label, axis.kor, "OG0021_V2_Q0" + (axis.q + 1),
    "radar_axis", "direct_question_score", "feedbackLine('" + axis.key + "', score)"
  ]));
  metricRows.push(["synthesis", "Synthesis", "전체 의미 종합", "OG0021_V2_Q07", "separate_card", "direct_question_score", "feedbackLine('synthesis', score)"]);
  metricRows.push(["overall", "Overall Reading Score", "종합 독해 점수", "Q01-Q07", "headline_score", "average(6 axes)*0.8 + synthesis*0.2", "overall band"]);
  const wsM = XLSX.utils.aoa_to_sheet(metricRows);
  wsM["!cols"] = [{ wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 34 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, wsM, "SG_METRICS");

  XLSX.writeFile(wb, "OG0021_v2_DevSpec.xlsx");
};

restartAll = function() {
  scores.fill(null);
  answered.fill(false);
  mcqSel.fill(null);
  Object.keys(answerLog).forEach(k => delete answerLog[k]);
  resetSetting();
  resetWord();
  resetThought();
  resetChain();
  document.querySelectorAll(".img-mcq-opt,.text-mcq-opt").forEach(el => el.className = el.className.replace(/\s*(selected|correct-ans|wrong-ans)/g, ""));
  for (let i = 0; i < V2_COUNT; i++) {
    const fb = document.getElementById("fb" + i);
    if (fb) { fb.className = "feedback-banner"; fb.textContent = ""; }
    const chk = document.getElementById("chk" + i);
    if (chk) chk.disabled = true;
    const nxt = document.getElementById("nxt" + i);
    if (nxt) nxt.className = "btn-next";
    const rty = document.getElementById("retry" + i);
    if (rty) rty.classList.remove("show");
  }
  resetPlayBtn();
  document.getElementById("audio-error").style.display = "none";
  const audio = document.getElementById("q2-audio");
  audio.pause();
  audio.currentTime = 0;
  currentQ = 0;
  showScreen("screen-cover");
};

injectV2Style();
injectV2Dom();
