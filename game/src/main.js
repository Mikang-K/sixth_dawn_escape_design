import { ROOMS, ROOM_BY_ID, THEME_ROOMS, PREFIX, PUZZLES, BY_ID } from './content.js';
import { freshState, parseSave, STORAGE_PREFIX, clone, canEnter, isAvailable, draftOf, withDraft, attempt, sequenceStep, chooseEnding, mainCount, optionalCount, platesOf } from './model.js';
import { widget, esc } from './widgets.js';
import { drawScene } from './scenes.js';

const app = document.querySelector('#app');
const workbench = document.querySelector('#workbench');
const journal = document.querySelector('#journal');
const settings = document.querySelector('#settings');
const confirm = document.querySelector('#confirm');
let saveWarning = '', toast = '', activePuzzle = null, screen = 'title', frame = 0, audio;
const undo = new Map(), openClues = new Set();
let feedback = { kind: 'neutral', text: '장치를 관찰하고 시험해 보세요.' };

function readSlot(slot) {
  try { const raw = localStorage.getItem(STORAGE_PREFIX + slot); return raw ? parseSave(raw) : null; }
  catch { saveWarning = '저장 기록을 읽을 수 없습니다. 새 기록을 시작하면 이 게임의 기록만 새로 씁니다.'; return null; }
}
let state = readSlot('auto') || freshState();
if (!state.started) state.settings.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function writeSlot(slot) {
  try { localStorage.setItem(STORAGE_PREFIX + slot, JSON.stringify(state)); saveWarning = ''; return true; }
  catch { saveWarning = '저장 공간에 쓰지 못했습니다. 현재 진행은 유지됩니다. 설정에서 다시 저장해 주세요.'; return false; }
}
function persist() { writeSlot('auto'); }
function tone(success = false) {
  if (!state.settings.sound) return;
  try {
    audio ||= new AudioContext();
    void audio.resume().catch(() => {});
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'triangle'; osc.frequency.value = success ? 659 : 246;
    gain.gain.setValueAtTime(.035, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .22);
    osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + .25);
  } catch { toast = '소리 없이도 모든 장치를 조작할 수 있습니다.'; }
}

const button = (label, action, extra = '', body = esc(label)) => `<button type="button" data-action="${action}" aria-label="${esc(label)}" ${extra}>${body}</button>`;
function roomSolved(room) { return room === 'reception' ? state.solved.includes('P00-2') : room === 'exit' ? state.solved.includes('F-3') : !!PREFIX[room] && state.solved.includes(`R${PREFIX[room]}-3`); }
function roomPuzzles(room) { return PUZZLES.filter(p => p.room === room); }
function nextPuzzle(room) { return roomPuzzles(room).find(p => !p.optional && isAvailable(state, p.id) && !state.solved.includes(p.id)); }
function description(room) {
  if(roomSolved(room.id))return room.after;
  if(room.id==='greenhouse'&&state.solved.includes('R2-2'))return '수위가 내려갔다. 닫힌 꽃 앞에서 송풍과 분무의 박자를 맞출 수 있다.';
  if(room.id==='archive'&&state.solved.includes('R1-2'))return '원본판이 드러났다. 점검창 안에 폐관일 장면기의 연결이 보인다.';
  if(room.id==='observatory'&&state.solved.includes('R3-2'))return '광선이 북쪽4열에 닿았다. 두 관측창에 불이 들어온다.';
  if(room.id==='clockwork'&&state.solved.includes('R6-2'))return '세 시계의 위상이 함께 맞았다. 마지막 동력선을 분리할 수 있다.';
  return room.before;
}
function clause(key) { const [id, index] = key.split(':'); return { p: BY_ID[id], text: BY_ID[id]?.clues[Number(index)] }; }
function paint() {
  const canvas = document.querySelector('#room-canvas');
  if (canvas) drawScene(canvas, state.ending && screen === 'game' ? 'ending' : screen === 'title' ? 'hall' : state.room, state, state.settings.reducedMotion ? 0 : frame);
}

function render() {
  document.body.classList.toggle('reduced-motion', state.settings.reducedMotion);
  document.body.classList.toggle('large-text', state.settings.largeText);
  if (screen === 'title') {
    app.innerHTML = `<main class="title-screen"><canvas id="room-canvas" width="640" height="360" aria-label="새벽의 여섯 문과 황동 동선으로 그린 도트 회랑"></canvas><div class="title-shade"></div><div class="title-copy"><p class="eyebrow">누운항 생활기술 전시관 · 마지막 접수</p><div class="title-mark" aria-hidden="true">Ⅵ</div><h1>여섯 번째<br><em>새벽</em></h1><p class="title-subtitle">폐관 기록</p><p class="title-description">여섯 방에 남은 관계를 복원하고,<br>아직 열리지 않은 아침으로.</p><div class="title-actions">${state.started ? button('이어서', 'continue', 'class="primary"') : ''}${button('새 기록 시작', 'new', `class="${state.started?'':'primary'}"`)}${button('설정과 조작 안내', 'settings')}</div><p class="title-detail">도트 방탈출 · 마우스 또는 키보드 · 자동 저장</p>${saveWarning?`<p class="storage-warning">${esc(saveWarning)}</p>`:''}</div><div class="title-stamp">미완료 접수<br><strong>06 : 00</strong></div></main>`;
    paint(); return;
  }
  const ending = state.ending, room = ROOM_BY_ID[state.room];
  const progress = mainCount(state), plates = platesOf(state);
  const header = `<header class="topbar"><div class="brand"><span class="brand-monogram">Ⅵ</span><div>여섯 번째 새벽<small>폐관 기록</small></div></div><nav aria-label="게임 메뉴">${button('회랑', 'hall', !canEnter(state,'hall')||!!ending?'disabled':'')}${button('수첩', 'journal')}${button('기록 저장', 'save')}${button('설정', 'settings')}${button('새 기록', 'new', 'class="quiet"')}</nav></header>`;
  if (ending) {
    const preserve = ending === 'preserve';
    app.innerHTML = `<main class="shell">${header}<section class="ending-head"><p class="eyebrow">폐관 처리 완료</p><h1>${preserve?'다음 사람이 읽을 수 있도록':'남긴 이에게 돌아갈 수 있도록'}</h1><p>${preserve?'기록의 사본은 공용 서가에 남았다. 문을 지나는 누군가가, 그 관계를 다시 배울 수 있다.':'기록의 사본은 개인 보관함으로 돌아갔다. 공용 전시등은 꺼지고, 봉투의 출처만 고요히 남았다.'}</p></section><div class="ending-scene"><canvas id="room-canvas" width="640" height="360" aria-label="선택한 보관 방식이 반영된 아침 전시관의 도트 화면"></canvas></div><section class="ending-ledger"><span class="seal">접수 완료</span><p>윤서는 접수대에 마지막 도장을 남겼다.<br>밖에는 비가 그치고 있었다.</p><div class="source-tags">${THEME_ROOMS.map((r,i)=>`<span>${state.solved.includes(`O-${i+1}`)?`${r.author} · 출처 확인`:`${r.name} · 출처 미확인`}</span>`).join('')}</div><p>필수 ${progress}/23 · 출처 ${optionalCount(state)}/6</p><div class="ending-buttons">${button('선택대 다시 보기','return-choice')}${button('제목으로','title')}</div></section></main>`;
    paint(); return;
  }
  const inHall = state.room === 'hall', tasks = roomPuzzles(state.room), next = nextPuzzle(state.room);
  const positions = state.room === 'reception' ? [[44,43],[84,49]] : [[16,52],[50,48],[84,48],[84,16]];
  const hotspots = inHall ? THEME_ROOMS.map((r,i)=> {
    const available=canEnter(state,r.id),done=roomSolved(r.id);
    return `<button type="button" class="door-hotspot ${done?'restored':''}" data-action="room" data-room="${r.id}" style="left:${9+i*16.1}%;top:43%" ${available?'':'disabled'} aria-label="${r.name} 입장"><span>${String(i+1).padStart(2,'0')}</span><strong>${esc(r.name)}</strong><small>${done?'복구 완료':available?'조사하기':'잠겨 있음'}</small></button>`;
  }).join('') : tasks.map((p,i)=> {
    const [x,y]=positions[i]||[84,16],available=isAvailable(state,p.id),done=state.solved.includes(p.id);
    return `<button type="button" class="hotspot ${p.optional?'optional-hotspot':''} ${done?'restored':''} ${state.settings.hotspots?'outlined':''}" id="open-${p.id}" data-action="puzzle" data-puzzle="${p.id}" style="left:${x}%;top:${y}%" ${available?'':'disabled'} aria-label="${p.title} 조사"><span class="hotspot-reticle">${done?'✓':p.optional?'✧':'＋'}</span><strong>${esc(p.title)}</strong><small>${done?'복구됨':p.optional?'선택 기록':available?'조사':'앞 장치 복구 필요'}</small></button>`;
  }).join('');
  const ready = state.solved.includes('F-3');
  let side = '';
  if (inHall) {
    side = `<p class="eyebrow">모아진 관계</p><h2>여섯 규칙판 <span>${plates.length}/6</span></h2><div class="plate-list">${THEME_ROOMS.map(r=>`<div class="plate ${roomSolved(r.id)?'collected':''}"><span>${roomSolved(r.id)?'✓':'◇'}</span><div><strong>${r.plate}</strong><small>${roomSolved(r.id)?r.name:'아직 복구되지 않음'}</small></div></div>`).join('')}</div>${button(canEnter(state,'exit')?'출구 기관실 입장':'규칙판을 모두 모으면 출구가 열립니다','room',`data-room="exit" class="primary exit-button" ${canEnter(state,'exit')?'':'disabled'}`)}<p class="side-note">같은 층의 두 방은 어느 순서로든 조사할 수 있습니다. 앞 방은 다시 방문할 수 있습니다.</p>`;
  } else {
    side = `<p class="eyebrow">현재 작업</p><h2>${ready?'문은 열렸습니다':next?esc(next.title):'방 복구 완료'}</h2><p class="current-goal">${ready?'기록 사본을 어느 곳에 보관할지 선택하세요.':next?esc(next.goal):'수첩과 선택 기록을 확인하거나 회랑으로 돌아갈 수 있습니다.'}</p><div class="task-list">${tasks.map(p=>`<button type="button" data-action="puzzle" data-puzzle="${p.id}" ${isAvailable(state,p.id)?'':'disabled'}><span class="task-icon">${state.solved.includes(p.id)?'✓':p.optional?'✧':isAvailable(state,p.id)?'○':'▰'}</span><span>${esc(p.title)}<small>${p.optional?'선택 기록':state.solved.includes(p.id)?'복구 완료':isAvailable(state,p.id)?'조사 가능':'잠금'}</small></span></button>`).join('')}</div>${next?button('다음 장치 조사','puzzle',`data-puzzle="${next.id}" class="primary"`):!ready?button('회랑으로 돌아가기','hall','class="primary"'):''}`;
  }
  const choice = ready ? `<section class="ending-choice"><div><p class="eyebrow">기록은 파괴되지 않습니다</p><h2>남은 기록의 행선지</h2></div><button type="button" aria-label="공용 보관함에 보존" data-action="ending" data-value="preserve"><strong>공용 보관함에 보존</strong><span>사본을 공용 전시에서 계속 읽을 수 있습니다.</span></button><button type="button" aria-label="발신자 보관함에 반환" data-action="ending" data-value="return"><strong>발신자 보관함에 반환</strong><span>사본은 개인함으로, 공용 전시는 접힙니다.</span></button></section>` : '';
  app.innerHTML = `<main class="shell">${header}<section class="room-heading"><div><p class="eyebrow">${room.floor} <span> / 폐관 처리 진행 중</span></p><h1 tabindex="-1">${room.name}</h1></div><div class="progress-summary"><span data-main-count="${progress}">필수 ${progress} / 23</span><span>출처 ${optionalCount(state)} / 6</span><span>규칙판 ${plates.length} / 6</span></div></section><div class="game-layout"><section class="scene-column"><div class="scene-frame"><canvas id="room-canvas" width="640" height="360" aria-label="${esc(room.name)} 도트 공간, 아래 조사 버튼으로 장치를 선택할 수 있습니다"></canvas><div class="scene-grain" aria-hidden="true"></div>${hotspots}${inHall&&canEnter(state,'exit')?button('출구 기관실 입장','room','data-room="exit" class="exit-hotspot"'):''}<div class="room-plaque">${roomSolved(state.room)?'복구 확인':'미완료 기록'}</div></div><div class="narration"><span>문지기</span><p>${esc(roomSolved(state.room)?room.after:room.intro)}</p></div><p class="scene-description">${esc(description(room))}</p></section><aside class="field-notes">${side}</aside></div>${choice}<footer class="statusbar"><span class="status-lamp"></span><span role="status">${esc(saveWarning||toast||'자동 저장 켜짐 · 단서를 조사하면 수첩에 남습니다.')}</span><span class="control-note">클릭 / Tab · Enter 조사 · Esc 닫기</span></footer></main>`;
  paint();
}

function renderWorkbench(keepFocus = false) {
  if (!activePuzzle) return;
  const oldFocus = keepFocus ? document.activeElement?.id : null;
  const oldFocusLabel = keepFocus ? document.activeElement?.getAttribute('aria-label') : null;
  const oldScroll = workbench.querySelector('.bench-body')?.scrollTop || 0;
  const p = BY_ID[activePuzzle], d = draftOf(state,p.id), solved=state.solved.includes(p.id), next=nextPuzzle(p.room);
  const pins = state.pins.map(key=>{const c=clause(key);return `<li><strong>${esc(c.p.title)}</strong><span>${esc(c.text)}</span></li>`;}).join('');
  workbench.innerHTML = `<header class="dialog-header"><div><p class="eyebrow">${ROOM_BY_ID[p.room].name} · ${p.optional?'출처 기록':'장치 조사'}${solved?' · 복구됨 / 연습 가능':''}</p><h2 id="puzzle-title">${esc(p.title)}</h2></div>${button('장치 닫기','close-workbench','class="close-button"','×')}</header><div class="bench-body"><div class="bench-grid"><section class="apparatus" aria-label="장치 조작"><p class="apparatus-goal">${esc(p.goal)}</p>${widget(p,d)}<div class="experiment-controls">${button('장치 검사','submit','id="submit-puzzle" class="primary"','시험 · 검사')}${button('한 단계 되돌리기','undo',`id="undo-puzzle" ${undo.get(p.id)?.length?'':'disabled'}`,'↶ 되돌림')}${button('이 장치 초기화','reset','id="reset-puzzle"','초기화')}</div><div class="experiment-feedback ${feedback.kind}" role="status" data-feedback="${feedback.kind}"><b>${feedback.kind==='success'?'✓ 복구 확인':feedback.kind==='error'?'× 불일치':'관찰 기록'}</b><p>${esc(feedback.text)}</p></div>${solved?`<div class="success-actions">${next?button('다음 장치 조사','next-puzzle',`class="primary" data-next="${next.id}"`):button(p.room==='exit'?'기록 처리 선택으로':'회랑으로 돌아가기',p.room==='exit'?'close-workbench':'hall','class="primary"')}</div>`:''}</section><aside class="clue-panel"><h3>현장 단서 <small>직접 펼쳐 조사</small></h3>${p.clues.map((clue,i)=>{const key=`${p.id}:${i}`;return `<details data-clue="${key}" ${openClues.has(key)?'open':''}><summary><span>0${i+1}</span> ${['기록의 원문','장치의 규칙','점검 메모'][i]||'메모'} ${state.seen.includes(key)?'✓':''}</summary><p>${esc(clue)}</p>${button(state.pins.includes(key)?'핀 해제':'수첩에 핀 고정','pin',`data-clue="${key}" class="pin-button"`)}</details>`;}).join('')}<div class="hint-panel"><h3>막혔을 때 <span>${state.hints[p.id]||0}/3</span></h3>${p.hints.slice(0,state.hints[p.id]||0).map((hint,i)=>`<p><b>${i+1}단계</b> ${esc(hint)}</p>`).join('')}${button((state.hints[p.id]||0)>=3?'해답까지 펼쳤습니다':(state.hints[p.id]||0)===2?'3단계 · 직접 해답 보기':'힌트 한 단계 펼치기','hint',`${(state.hints[p.id]||0)>=3?'disabled':''} class="hint-button"`)}<small>힌트는 결말이나 출처에 영향을 주지 않습니다.</small></div>${pins?`<section class="pinned-clues"><h3>고정한 단서</h3><ul>${pins}</ul></section>`:''}${button('수첩 전체 보기','journal','class="journal-link"')}${saveWarning?`<p class="storage-warning">${esc(saveWarning)}</p>`:''}</aside></div></div>`;
  workbench.querySelector('.bench-body').scrollTop=oldScroll;
  if(oldFocus) document.getElementById(oldFocus)?.focus({preventScroll:true});
  else if(oldFocusLabel) [...workbench.querySelectorAll('button[aria-label]')].find(el=>el.getAttribute('aria-label')===oldFocusLabel&&!el.disabled)?.focus({preventScroll:true});
  for(const details of workbench.querySelectorAll('details[data-clue]')) details.addEventListener('toggle',()=> {
    const key=details.dataset.clue;
    if(details.open) { openClues.add(key); if(!state.seen.includes(key)) {state={...state,seen:[...state.seen,key]};persist();} }
    else openClues.delete(key);
  });
}

function openPuzzle(id) {
  if(!isAvailable(state,id)) return;
  activePuzzle=id;
  openClues.add(`${id}:0`);
  if(!state.seen.includes(`${id}:0`)) state={...state,seen:[...state.seen,`${id}:0`]};
  feedback={kind:'neutral',text:state.solved.includes(id)?'복구된 장치입니다. 연습해도 진행은 취소되지 않습니다.':'현장 단서를 펼치고, 설정을 바꿔 시험할 수 있습니다.'};
  renderWorkbench();
  workbench.querySelector('.bench-body').scrollTop=0;
  if(!workbench.open) workbench.showModal();
  persist();
}
workbench.addEventListener('close',()=> {
  const id=activePuzzle;activePuzzle=null;render();document.getElementById(`open-${id}`)?.focus({preventScroll:true});
});

function setDraft(value) {
  const id=activePuzzle,old=draftOf(state,id),next=withDraft(state,id,value);
  if(next===state) { feedback={kind:'error',text:'설정 범위를 벗어났습니다. 장치의 눈금을 확인해 주세요.'};renderWorkbench(true);return; }
  if(JSON.stringify(old)!==JSON.stringify(value)) { const stack=undo.get(id)||[];stack.push(old);undo.set(id,stack.slice(-100)); }
  state=next;feedback={kind:'neutral',text:'설정이 바뀌었습니다. 실제 상태를 확인하고 검사하세요.'};persist();render();renderWorkbench(true);
}

function renderJournal() {
  journal.innerHTML=`<header class="dialog-header"><div><p class="eyebrow">관계 전사 수첩</p><h2 id="journal-title">옮겨 적은 것들</h2></div>${button('수첩 닫기','close-journal','class="close-button"','×')}</header><div class="journal-body"><p>확인한 원문만 남깁니다. 핀은 최대3개, 초과하면 가장 오래된 핀이 풀립니다.</p><h3>얻은 규칙판 ${platesOf(state).length}/6</h3><div class="journal-plates">${platesOf(state).map(r=>`<article><span class="mini-seal">✓</span><h4>${r.plate}</h4><p>${esc(r.rule)}</p></article>`).join('')||'<p class="caption">아직 얻은 규칙판이 없습니다. 첫 방을 복구해 보세요.</p>'}</div><h3>현장에서 읽은 원문</h3>${state.seen.map(key=> {const c=clause(key);return `<article class="journal-entry"><h4>${esc(c.p.title)}</h4><p>${esc(c.text)}</p>${button(state.pins.includes(key)?'핀 해제':'수첩에 핀 고정','pin',`data-clue="${key}"`)}</article>`;}).join('')||'<p>장치를 조사하면 첫 단서를 자동으로 옮겨 적습니다.</p>'}</div>`;
}
function renderSettings() {
  settings.innerHTML=`<header class="dialog-header"><div><p class="eyebrow">환경과 기록</p><h2 id="settings-title">내게 맞는 조사 방식</h2></div>${button('설정 닫기','close-settings','class="close-button"','×')}</header><div class="settings-body"><p>마우스 클릭 또는 Tab·Enter로 조사합니다. 방향·숫자 장치는 입력란의 화살표 키로도 바꿀 수 있습니다. Esc는 맨 위 창을 닫습니다.</p>${[['sound','장치 소리'],['reducedMotion','움직임 줄이기'],['largeText','글자 확대'],['hotspots','조사 위치 윤곽 표시']].map(([key,label])=>`<label class="setting-row"><span>${label}</span><input type="checkbox" data-setting="${key}" ${state.settings[key]?'checked':''}></label>`).join('')}<p>모든 필수 정보는 화면에도 표시됩니다. 박자는 스스로 전진시키며 실제 시간 압박은 없습니다.</p><h3>기록 보관</h3><p>자동 저장과 별도의 수동 저장 한 칸이 있습니다. 이 브라우저의 현재 주소에 보관됩니다.</p><div class="setting-actions">${button('지금 수동 저장','save',state.started?'':'disabled')}${button('수동 저장 불러오기','load-manual',state.started?'':'disabled')}${button('마지막 선택대 불러오기','return-choice',state.solved.includes('F-3')?'':'disabled')}</div><p class="settings-message" role="status">${esc(saveWarning||toast||'창을 닫아도 진행은 그대로 남습니다.')}</p>${button('제목으로','title','class="quiet"')}</div>`;
}

function restart() {
  const preferences=clone(state.settings);
  state=freshState();state.settings=preferences;state.started=true;screen='game';activePuzzle=null;undo.clear();openClues.clear();
  for(const modal of [workbench,journal,settings,confirm]) if(modal.open) modal.close();
  try { for(const key of ['manual','choice']) localStorage.removeItem(STORAGE_PREFIX+key); } catch { /* The next write reports storage failure. */ }
  toast='새 접수 기록을 시작했습니다. 임시 전원을 복구해 주세요.';persist();render();
  document.querySelector('.room-heading h1')?.focus({preventScroll:true});
}
function newRequest() {
  if(!state.started) {restart();return;}
  confirm.innerHTML=`<header class="dialog-header"><h2 id="confirm-title">새 접수 기록을 시작할까요?</h2></header><div class="confirm-body"><p>현재 게임의 자동·수동 저장과 마지막 선택대를 지우고 접수대부터 시작합니다.</p><div>${button('돌아가기','cancel-new')}${button('현재 기록 지우고 시작','confirm-new','class="primary"')}</div></div>`;
  confirm.showModal();
}

function setField(path,value) {
  const p=BY_ID[activePuzzle],d=draftOf(state,p.id);
  if(p.kind==='gears'&&path==='turns') value=Number(value);
  if(path==='') {setDraft(value);return;}
  const parts=path.split('.');let target=d;
  for(const key of parts.slice(0,-1)) target=target[key];
  target[parts.at(-1)]=value;
  if(p.kind==='records'&&path==='drop') d.undo=value?d.order.filter(key=>key!==value):[];
  setDraft(d);
}
workbench.addEventListener('change',event=> {
  const input=event.target;
  if(input.matches('[data-field]')) setField(input.dataset.field,input.dataset.number?Number(input.value):input.value);
});
settings.addEventListener('change',event=> {
  const key=event.target.dataset.setting;
  if(key&&Object.hasOwn(state.settings,key)) {state={...state,settings:{...state.settings,[key]:event.target.checked}};persist();render();tone();}
});

document.addEventListener('keydown',event=> {
  if(event.key!=='Tab')return;
  const modal=[...document.querySelectorAll('dialog[open]')].at(-1);
  if(!modal)return;
  const focusable=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length>0);
  if(!focusable.length){event.preventDefault();return;}
  const first=focusable[0],last=focusable.at(-1),current=document.activeElement;
  if(!modal.contains(current)||(event.shiftKey&&current===first)||(!event.shiftKey&&current===last)) {
    event.preventDefault();(event.shiftKey?last:first).focus();
  }
});

document.addEventListener('click',event=> {
  const target=event.target.closest('button[data-action]');if(!target||target.disabled)return;
  const action=target.dataset.action;
  if(action==='new') return newRequest();
  if(action==='confirm-new') return restart();
  if(action==='cancel-new') return confirm.close();
  if(action==='continue') {screen='game';render();return;}
  if(action==='title') {for(const modal of [workbench,journal,settings])if(modal.open)modal.close();screen='title';render();return;}
  if(action==='settings') {renderSettings();settings.showModal();return;}
  if(action==='close-settings') return settings.close();
  if(action==='journal') {renderJournal();journal.showModal();return;}
  if(action==='close-journal') return journal.close();
  if(action==='save') {toast=writeSlot('manual')?'수동 저장했습니다. 자동 저장과 별도로 남습니다.':saveWarning;render();if(settings.open)renderSettings();return;}
  if(action==='load-manual'||action==='return-choice') {
    const loaded=readSlot(action==='load-manual'?'manual':'choice');
    if(!loaded) {toast=saveWarning||'저장된 기록이 없습니다.';if(settings.open)renderSettings();else render();return;}
    state=loaded;screen='game';activePuzzle=null;undo.clear();for(const modal of [workbench,journal,settings])if(modal.open)modal.close();toast='기록을 불러왔습니다.';persist();render();return;
  }
  if(action==='hall'||action==='room') {
    const room=action==='hall'?'hall':target.dataset.room;
    if(!canEnter(state,room)||state.ending)return;
    state={...state,room};toast='';if(workbench.open)workbench.close();activePuzzle=null;persist();render();document.querySelector('.room-heading h1')?.focus({preventScroll:true});return;
  }
  if(action==='puzzle') return openPuzzle(target.dataset.puzzle);
  if(action==='close-workbench') return workbench.close();
  if(action==='next-puzzle') return openPuzzle(target.dataset.next);
  if(action==='pin') {
    const key=target.dataset.clue;if(!state.seen.includes(key))return;
    state={...state,pins:state.pins.includes(key)?state.pins.filter(x=>x!==key):[...state.pins,key].slice(-3)};persist();if(journal.open)renderJournal();if(workbench.open)renderWorkbench(true);return;
  }
  if(action==='ending') {state=chooseEnding(state,target.dataset.value);tone(true);persist();render();return;}
  if(!activePuzzle)return;
  const p=BY_ID[activePuzzle],d=draftOf(state,p.id);
  if(action==='submit') {
    const wasFinal=state.solved.includes('F-3'),checked=attempt(state,p.id);state=checked.state;
    feedback={kind:checked.result.ok?'success':'error',text:checked.result.message};toast=checked.result.ok?'복구한 기록을 자동 저장했습니다.':'시험 결과를 확인해 보세요. 물품은 소모되지 않습니다.';tone(checked.result.ok);persist();
    if(!wasFinal&&state.solved.includes('F-3'))writeSlot('choice');
    render();renderWorkbench(true);workbench.querySelector('.experiment-feedback')?.scrollIntoView({block:'nearest',behavior:'instant'});return;
  }
  if(action==='undo') {
    const stack=undo.get(p.id);if(!stack?.length)return;
    state=withDraft(state,p.id,stack.pop());feedback={kind:'neutral',text:'현재 장치의 마지막 설정만 되돌렸습니다.'};persist();render();renderWorkbench(true);return;
  }
  if(action==='reset') {setDraft(clone(p.initial));feedback={kind:'neutral',text:'이 장치의 시험 상태만 초기화했습니다. 획득한 규칙판과 해결 사실은 유지됩니다.'};renderWorkbench(true);return;}
  if(action==='hint') {const count=Math.min(3,(state.hints[p.id]||0)+1);state={...state,hints:{...state.hints,[p.id]:count}};persist();renderWorkbench(true);return;}
  if(action==='pick') return setDraft(target.dataset.value);
  if(action==='rotate') return setDraft((d+1)%4);
  if(action==='move') {
    const values=target.dataset.list?d[target.dataset.list]:d,i=Number(target.dataset.index),j=i+Number(target.dataset.delta);
    [values[i],values[j]]=[values[j],values[i]];return setDraft(d);
  }
  if(action==='sequence') {
    const step=sequenceStep(p,d,target.dataset.value);
    if(step.draft!==d)setDraft(step.draft);
    feedback={kind:step.draft===d?'error':'neutral',text:step.message};renderWorkbench(true);return;
  }
  if(action==='phase') return setDraft(Number(target.dataset.value));
  if(action==='next-phase') return setDraft((d+1)%6);
  if(action==='coordinate') return setDraft([Number(target.dataset.x),Number(target.dataset.y)]);
  if(action==='mirror') { const list=target.dataset.nested==='true'?d.mirrors:d,i=Number(target.dataset.index);list[i]=list[i]==='/'?'\\':'/';return setDraft(d); }
  if(action==='toggle') {const i=Number(target.dataset.index);d[i]=1-d[i];return setDraft(d);}
  if(action==='route') return setDraft([...d,target.dataset.value]);
  if(action==='swap-gears') {d.swap=!d.swap;return setDraft(d);}
  if(action==='clock-step') return setDraft((d+Number(target.dataset.value)+60)%60);
});

render();
setInterval(()=> {if(!state.settings.reducedMotion){frame++;paint();}},160);
