import { stencilInfo, traceBeam, projected, puppetStates, logicLights, postalState, EDGES, routeCost } from './model.js';

export const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const text = (x, y, value, color = '#dfd5b9', size = 14) => `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="middle">${esc(value)}</text>`;
const svg = (label, body, height = 250) => `<svg class="diagram" role="img" aria-label="${esc(label)}" shape-rendering="crispEdges" viewBox="0 0 420 ${height}"><rect x="2" y="2" width="416" height="${height-4}" fill="#192e35"/><path d="M2 17V2h17m382 0h17v15M2 ${height-18}v16h17m382 0h17v-16" fill="none" stroke="#a08f64" stroke-width="2"/><path d="M11 7h3M7 11v3M406 7h3M413 11v3M7 ${height-14}v3M11 ${height-7}h3M406 ${height-7}h3M413 ${height-14}v3" stroke="#657d63" stroke-width="2"/>${body}</svg>`;
const sum = a => a.reduce((x, y) => x + y, 0);
const pill = value => `<span class="readout">${esc(value)}</span>`;
const btn = (label, action, extra = '', body = label) => `<button type="button" data-action="${action}" aria-label="${esc(label)}" ${extra}>${body}</button>`;
export function numberField(p, label, value, min, max, key) {
  const id = `field-${p.id}-${key.replaceAll('.', '-') || 'value'}`;
  return `<label class="dial" for="${id}"><span>${esc(label)}</span><input id="${id}" aria-label="${esc(label)}" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" value="${value}" data-field="${key}" data-number="true"></label>`;
}
export function selectField(p, label, value, options, key) {
  const id = `field-${p.id}-${key.replaceAll('.', '-') || 'value'}`;
  return `<label class="dial" for="${id}"><span>${esc(label)}</span><select id="${id}" aria-label="${esc(label)}" data-field="${key}">${options.map(([val, name]) => `<option value="${esc(val)}" ${String(value) === String(val) ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label>`;
}

function order(p, values, field = '', label = '기록 순서') {
  return `<ol class="order-list" data-order-list="${field || 'root'}">${values.map((token, i) => `<li data-order-token="${token}"><span class="slot-number">${i + 1}</span><strong>${esc(p.labels[token])}</strong><span class="order-moves">${btn(`${label} ${token} 앞쪽 이동`, 'move', `data-list="${field}" data-index="${i}" data-delta="-1" ${i === 0 ? 'disabled' : ''}`, '↑')}${btn(`${label} ${token} 뒤쪽 이동`, 'move', `data-list="${field}" data-index="${i}" data-delta="1" ${i === values.length - 1 ? 'disabled' : ''}`, '↓')}</span></li>`).join('')}</ol>`;
}

function projection(p, d) {
  const positions = projected(p, d), center = 175, step = 17;
  let body = '<rect x="20" y="20" width="380" height="211" fill="#192b33" stroke="#68725e"/>';
  body += '<path d="M175 90V215" stroke="#ddbd7a" stroke-dasharray="4 4"/>' + text(175, 82, '중앙 0', '#e7c482');
  for (let i = -6; i <= 10; i++) body += `<path d="M${center+i*step} 209v5" stroke="#71827b"/>`;
  body += text(210, 46, `고정 앞 ${p.front} / 중간 ${d.middle} / 뒤 ${d.back} · 시점 ${d.camera}`, '#aab8ac', 13);
  const [a, b, c] = positions.map(x => center + step*x);
  body += `<path d="M${a-10} 125h20v23h-20z M${a-4} 131h8v10h-8z" fill="#e2bb7c" fill-rule="evenodd"/>`;
  body += `<rect x="${b-3}" y="148" width="6" height="42" fill="#95baab"/>`;
  body += `<path d="M${c+3} 176h16v7h-7v7h-9z" fill="#9ab6d0"/>`;
  body += text(210, 248, `투영 위치: 앞 ${positions[0]} · 중간 ${positions[1]} · 뒤 ${positions[2]}`, '#e1d6ba');
  return svg('세 깊이층의 실제 투영 위치. 세 조각이 중앙0에서 하나의 열쇠를 이룹니다.', body, 268) + `<div class="dials three">${numberField(p, '시점', d.camera, 0, 3, 'camera')}${numberField(p, '중간 조각', d.middle, ...p.middleRange, 'middle')}${numberField(p, '뒤 조각', d.back, ...p.backRange, 'back')}</div>`;
}

function mirrors(p, directions, nested = false) {
  const step = p.size === 6 ? 34 : 38, mx = 34, my = 12;
  const xy = ([x, y]) => [mx + x*step, my + y*step];
  const beam = traceBeam(p, directions);
  let body = '';
  for (let x=1;x<=p.size;x++) for(let y=1;y<=p.size;y++) { const [sx,sy]=xy([x,y]); body += `<rect x="${sx-step/2}" y="${sy-step/2}" width="${step}" height="${step}" fill="#192c3a" stroke="#344956"/>`; }
  for (let i=1;i<=p.size;i++) { body+=text(xy([i,0])[0], 12, i, '#94aaa8', 11); body+=text(22,xy([0,i])[1]+4,i,'#94aaa8',11); }
  const target = xy(p.target);
  body += `<circle cx="${target[0]}" cy="${target[1]}" r="9" fill="#d9bc7b"/>` + text(355, 36, '목표', '#d7bb7c', 12);
  body += `<polyline points="${beam.path.map(point=>xy(point).join(',')).join(' ')}" fill="none" stroke="#e7c57b" stroke-width="3" stroke-linejoin="round"/>`;
  const source=xy(p.start); body+=`<rect x="${source[0]-8}" y="${source[1]-6}" width="13" height="12" fill="#a2c5b5"/>`;
  p.mirrors.forEach((point,i)=> { const [x,y]=xy(point), flip=directions[i]==='/' ? -1 : 1; body+=`<circle cx="${x}" cy="${y}" r="15" fill="#34464a" stroke="#9cbfb8"/><path d="M${x-10} ${y-flip*10}L${x+10} ${y+flip*10}" stroke="#e5ead3" stroke-width="4"/>`+text(x+19,y-13,`M${i+1}`,'#b6c7bd',11); });
  body += text(210, 294, `실제 도착 좌표 ${beam.exit ? beam.exit.join(',') : '반복'} · 목표 ${p.target.join(',')}`, '#c4d2c6', 13);
  return svg('거울 방향에 따라 바뀌는 실제 광선 경로', body, 310)+`<div class="mirror-controls">${directions.map((value,i)=>btn(`M${i+1} 거울 회전`,'mirror',`data-index="${i}" data-nested="${nested}"`, `<small>M${i+1}</small><b class="mirror-glyph">${esc(value)}</b><span>회전 ↻</span>`)).join('')}</div>`;
}

function coordinates(p, d) {
  const n=p.kind==='stars'?6:5;
  const sky=new Set(['3,4','4,4','4,5','5,5','1,1','1,5','5,2','6,6']);
  const L=new Set(['2,1','3,2','4,3','5,4']),R=new Set(['2,5','3,4','4,3','5,2']);
  const selected=d?d.join(','):null;
  let html=`<div class="coordinate-note">↑ 북쪽 · 가로=열, 세로=행 (1부터)</div>`;
  if(p.kind==='stars') html+='<div class="motif">노트의 무늬 <span>★ ★ ·<br>· ★ ★</span><small>첫 별이 기준점 · 회전 없음</small></div>';
  html+=`<div class="coordinate-headers" style="--cols:${n}"><span></span>${Array.from({length:n},(_,i)=>`<span>${i+1}열</span>`).join('')}</div><div class="coordinate-board" style="--cols:${n}">`;
  for(let y=1;y<=n;y++) { html+=`<span class="row-label">${y}행</span>`; for(let x=1;x<=n;x++) {const key=`${x},${y}`, first=p.kind==='stars', shape=first?(sky.has(key)?'✦':'·'):`${L.has(key)?'△':''}${R.has(key)?'○':''}`;
    const overlay=first&&d&&[[0,0],[1,0],[1,1],[2,1]].some(([dx,dy])=>d[0]+dx===x&&d[1]+dy===y);
    html+=btn(`좌표 ${key}`,'coordinate',`data-x="${x}" data-y="${y}" class="coord ${selected===key?'selected':''} ${overlay?'traced':''} ${!first?'observed':''}" aria-pressed="${selected===key}"`,shape||'·'); } }
  return html+'</div><div class="status-line">'+pill(d?`선택: ${d[0]}열 ${d[1]}행`:'좌표 핀을 놓으세요')+(p.kind==='intersection'?pill('△ L창 / ○ R창'):'')+'</div>';
}

function scaleDrawing(left, right, labels=['왼쪽','오른쪽'], fixed=false) {
  const tilt=Math.max(-15,Math.min(15,(right-left)*4));
  let body='<rect x="202" y="50" width="16" height="145" fill="#9f875e"/><rect x="135" y="193" width="150" height="12" fill="#74634d"/>';
  body+=`<path d="M80 ${86-tilt}L340 ${86+tilt}" stroke="#d1b579" stroke-width="6"/><path d="M91 ${86-tilt}v55m238 ${tilt*2-55}v55" stroke="#b2baa4" stroke-width="2"/>`;
  body+=`<path d="M50 ${143-tilt}h84l-12 20H62z" fill="#9c9f7a"/><path d="M287 ${143+tilt}h84l-12 20h-60z" fill="#9c9f7a"/>`;
  body+=text(92,135-tilt,`${left}${fixed?' (기본1 포함)':''}`, '#efe1b9',fixed?12:18)+text(329,135+tilt,right,'#efe1b9',18)+text(92,231,labels[0])+text(329,231,labels[1]);
  return svg(`저울 ${labels[0]}${left}, ${labels[1]}${right}`,body,252);
}

export function widget(p,d) {
  switch(p.kind) {
    case 'match': return '<div class="fuse-box"><div class="wire-trace"></div>'+['○ 관찰','△ 실험','□ 기록'].map((name,i)=>`<div class="socket"><b>${name}</b>${selectField(p,`${name} 소켓`,d[i],[['','퓨즈 선택'],['C','○ 관찰'],['T','△ 실험'],['S','□ 기록']],String(i))}</div>`).join('')+'</div>';
    case 'choice': return `<div class="choice-grid">${p.options.map(([value,label])=> { let art='';
      if(p.id==='P00-2') art=svg('손잡이 축과 걸림 홈',`<path d="M170 60h80v18h-48v54h-32z" fill="#bd965d"/>${value==='G'?'<circle cx="185" cy="152" r="22" fill="#71867b"/>':'<rect x="163" y="131" width="44" height="44" fill="#71867b"/>'}${value!=='L'?'<path d="M178 130h15v-9h8v21h-23z" fill="#d7b77b"/>':''}`,195);
      else if(p.id==='O-2') {const heights={A:[2,5],B:[6,6],C:[3,4]}[value]; art=svg('화분의 전후 높이', `<rect x="110" y="${155-heights[0]*17}" width="52" height="${heights[0]*17}" fill="#758b62"/><rect x="250" y="${155-heights[1]*17}" width="52" height="${heights[1]*17}" fill="#a3b985"/>${text(136,184,heights[0])}${text(276,184,heights[1])}${text(207,94,'→')}`,200);}
      else if(p.id==='O-1') art=svg('종이의 홈과 물결',`<path d="M105 30h210v140H105z" fill="#dbccaa"/>${value==='B'?'<path d="M105 60h16v20h-16z" fill="#23333b"/>':'<path d="M299 60h16v20h-16z" fill="#23333b"/>'}<path d="M145 110l15-9 15 9 15-9 15 9 15-9 15 9 15-9 15 9${value==='A'?' M145 132l15-9 15 9 15-9 15 9 15-9 15 9 15-9 15 9':''}" fill="none" stroke="#687966" stroke-width="4"/>`,195);
      else art=`<span class="choice-symbol">${p.id==='O-3'?['↗','↘','↖','↗'][p.options.findIndex(v=>v[0]===value)]:'✦'}</span>`;
      return btn(`${value} · ${label}`,'pick',`class="choice ${d===value?'selected':''}" data-value="${value}" aria-pressed="${d===value}"`,art+`<strong>${esc(value)} · ${esc(label)}</strong>`); }).join('')}</div>`;
    case 'order': return `<div class="order-caption">${p.id==='R4-1'?'왼쪽 1번':'오래된 일'} <span>→</span> ${p.id==='R4-1'?'오른쪽 4번':'새로운 일'}</div>`+order(p,d,'',p.id==='R4-1'?'배역 순서':'기록 순서');
    case 'stencil': { const s=stencilInfo(d); const grid=(title,cells)=>`<section><h3>${title}</h3><div class="stencil-grid">${cells.map(v=>`<span class="ink ink-${v}" aria-label="${v===2?'중복':v===1?'잉크':'빈칸'}">${v===2?'×':v===1?'■':'·'}</span>`).join('')}</div></section>`;
      return `<div class="stencils">${grid(`A · ${d*90}도`,Array.from({length:16},(_,i)=>Number(s.a.some(([x,y])=>y*4+x===i))))}${grid('B · 고정',s.b.join('').split('').map(Number))}${grid('겹친 결과',s.cells)}</div><div class="status-line">${pill(`빈칸 ${s.empty}`)}${pill(`중복 ${s.overlap}`)}</div>${btn('A 시계방향 회전','rotate','class="large-control"','A 원본판 90° 회전 ↻')}`; }
    case 'restore': case 'protocol': {
      let image='';
      if(p.kind==='protocol') {const s=postalState(d); image=svg('송신기와 수신기의 실제 처리 상태',`<rect x="25" y="38" width="150" height="127" fill="#405b56"/><rect x="245" y="38" width="150" height="127" fill="#405b56"/>${text(100,67,'송신 다음 번호')}${text(100,113,s.next,'#ead49d',30)}${text(320,67,'수신 마지막 번호')}${text(320,113,s.last,'#ead49d',30)}<path d="M181 86h55m-8-7 8 7-8 7" stroke="#cebb8d" fill="none" stroke-width="3"/>${text(210,196,`응답칸: ${s.ack??'비어 있음'} · 실제 인도 ${s.delivered.join(', ')}`)}`,225);}
      else image=`<div class="restoration"><span class="${d.includes('C')?'done':''}">봉인 ${d.includes('C')?'열림':'닫힘'}</span><span class="${d.includes('B')?'done':''}">전원 ${d.includes('B')?'연결':'차단'}</span><span class="${d.includes('A')?'done':''}">물 ${d.includes('A')?'배수':'침수'}</span><span class="${d.includes('D')?'done':''}">운반대 ${d.includes('D')?'복귀':'전진'}</span></div>`;
      return image+`<div class="action-grid">${Object.entries(p.labels).map(([key,label])=>btn(label,'sequence',`data-value="${key}" ${d.includes(key)?'disabled':''} class="${d.includes(key)?'completed':''}"`,`${d.includes(key)?'✓ ':''}${esc(label)}`)).join('')}</div><p class="sequence-history">실행: ${d.map(key=>esc(p.labels[key])).join(' → ')||'아직 없음'}</p>`; }
    case 'weights': {
      let body=''; const pairs=[[0,1,5],[1,2,8],[0,2,7]];
      pairs.forEach(([a,b,target],i)=> {const x=73+i*137, actual=d[a]+d[b], tilt=Math.max(-10,Math.min(10,(actual-target)*3)); body+=`<rect x="${x-3}" y="70" width="6" height="73" fill="#b59b68"/><path d="M${x-47} ${85-tilt}L${x+47} ${85+tilt}" stroke="#d7bc7d" stroke-width="3"/><path d="M${x-47} ${85-tilt}v29m94 ${tilt*2-29}v29" stroke="#7f9a8b"/>${text(x-44,137-tilt,actual,'#d7ddad',22)}${text(x+44,137+tilt,target,'#e2c28a',22)}${text(x,175,`${'ABC'[a]}+${'ABC'[b]} = ${target}`)}`;});
      return svg('현재 씨앗 질량 합과 세 평형 사진의 비교',body,204)+`<div class="dials three">${d.map((v,i)=>numberField(p,`씨앗 ${'ABC'[i]} 질량`,v,1,6,String(i))).join('')}</div>`; }
    case 'routing': { const east=d.reduce((s,v,i)=>s+(v==='E'?i+1:0),0), west=d.reduce((s,v,i)=>s+(v==='W'?i+1:0),0);
      let body=''; for(let i=0;i<4;i++) { const x=70+i*94; body+=`<rect x="${x-22}" y="25" width="44" height="88" fill="#304d4b" stroke="#8da998"/><rect x="${x-17}" y="${105-(i+1)*16}" width="34" height="${(i+1)*16}" fill="#8bb7a4"/>${text(x,135,`${i+1}눈금`)}<path d="M${x} 145v18L${d[i]==='E'?104:d[i]==='W'?316:x} 210" stroke="${d[i]?'#b9cda9':'#556e67'}" stroke-width="3" fill="none"/>`; }
      body+=`<rect x="58" y="210" width="92" height="46" fill="#3b6457"/><rect x="270" y="210" width="92" height="46" fill="#3b6457"/>${text(104,238,`동 ${east}/4`)}${text(316,238,`서 ${west}/6`)}`;
      return svg('계량통의 실제 양과 두 수신기로 이어지는 경로',body,270)+`<div class="dials four">${d.map((v,i)=>selectField(p,`${i+1}눈금 통`,v,[['','미설정'],['E','동쪽'],['W','서쪽']],String(i))).join('')}</div>`; }
    case 'phase': {
      const fan=d%2===0, mist=d%3===0, open=d>=4;
      return `<div class="phase-track">${Array.from({length:6},(_,i)=>btn(`박자 ${i} 선택`,'phase',`data-value="${i}" class="${i===d?'selected':''}" aria-pressed="${i===d}"`,String(i))).join('')}</div><div class="plant-window ${open?'flower-open':''}"><div class="flower-stem"></div><div class="flower-head">${open?'✿':'❧'}</div><span>꽃 ${open?'열림':'닫힘'}</span></div><div class="status-line">${pill(`송풍 ${fan?'켜짐':'꺼짐'}`)}${pill(`분무 ${mist?'켜짐':'꺼짐'}`)}${pill(`현재 박자 ${d}`)}</div>${btn('다음 박자','next-phase','class="large-control"','다음 박자 →')}`;
    }
    case 'stars': case 'intersection': return coordinates(p,d);
    case 'mirrors': return mirrors(p,d);
    case 'projection': return projection(p,d);
    case 'toggles': { const actual=puppetStates(d), names=['늑대','새','물고기','사슴'];
      let body='<rect x="12" y="211" width="396" height="12" fill="#a8835d"/>';
      actual.forEach((front,i)=> { const x=62+i*100,y=front?137:108;body+=`<path d="M${x} 15v${y-20}" stroke="#b5b6a4"/><rect x="${x-13}" y="${y}" width="26" height="22" fill="${front?'#d7b883':'#708478'}"/><path d="M${x-19} ${y+25}h38v37h-38z" fill="${front?'#a96f65':'#48635f'}"/>${text(x,244,`${names[i]} ${front?'앞':'뒤'}`,'#e0d0ac',13)}`; });
      return svg('줄에 연결된 네 인형의 앞뒤 위치',body,260)+`<div class="toggle-buttons">${d.map((v,i)=>btn(`${'ABCD'[i]} 줄 당기기`,'toggle',`data-index="${i}" aria-pressed="${v===1}" class="${v?'selected':''}"`,`${'ABCD'[i]}줄 <small>${v?'홀수':'짝수'}</small>`)).join('')}</div><p class="caption">목표: 늑대 앞 · 새 뒤 · 물고기 뒤 · 사슴 앞</p>`; }
    case 'addresses': return svg('북 동 남 서, 시계방향 방향 고리',`<path d="M210 35l110 75-110 75-110-75z" fill="none" stroke="#849b88" stroke-width="3"/>${text(210,27,'북')}${text(343,116,'동')}${text(210,212,'남')}${text(77,116,'서')}${text(210,117,'시계방향 ↻','#e6c389',23)}`,232)+`<div class="dials four">${d.map((v,i)=>selectField(p,`${['원','잎','별','물결'][i]} 봉투 주소`,v,[['','미분류'],['N','북'],['E','동'],['S','남'],['W','서']],String(i))).join('')}</div>`;
    case 'route': { const positions={S:[35,133],A:[154,52],B:[154,214],C:[282,133],T:[389,133]}; let body='<defs><marker id="route-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3 0 6" fill="#8eaa9c"/></marker></defs>';
      for(const [from,edges] of Object.entries(EDGES)) for(const [to,cost] of edges) { const [x1,y1]=positions[from],[x2,y2]=positions[to],selected=d.some((v,i)=>v===from&&d[i+1]===to); let offset=from==='A'&&to==='T'?-32:from==='B'&&to==='T'?32:0;body+=`<path d="M${x1+13} ${y1}Q${(x1+x2)/2} ${(y1+y2)/2+offset} ${x2-16} ${y2}" stroke="${selected?'#e4c288':'#59776d'}" stroke-width="${selected?4:2}" fill="none" marker-end="url(#route-arrow)"/>${text((x1+x2)/2,(y1+y2)/2+offset-8,cost,'#dbcda6',15)}`; }
      for(const [key,[x,y]] of Object.entries(positions)) body+=`<circle cx="${x}" cy="${y}" r="17" fill="${d.includes(key)?'#947a4f':'#233b3a'}" stroke="#a2b69d"/>${text(x,y+5,key)}`;
      return svg('단방향 운송망과 이동 박자',body,262)+`<p class="route-history">현재 경로 ${esc(d.join(' → '))} · ${routeCost(d)}박자 / 제한7</p><div class="action-grid">${EDGES[d.at(-1)].map(([next,cost])=>btn(`${next}로 이동`,'route',`data-value="${next}"`,`${next}로 이동 · ${cost}박자`)).join('')||'<span>목적지 도착. 경로를 검사하세요.</span>'}</div>`; }
    case 'gears': { const teeth=[12,d.swap?24:18,d.swap?18:24,36],radii=[25,33,39,49];let body='';teeth.forEach((count,i)=>{const x=47+i*104,y=111,r=radii[i];let points=[];for(let n=0;n<32;n++){const angle=n*Math.PI/16,rr=n%2?r-7:r;points.push(`${x+Math.cos(angle)*rr},${y+Math.sin(angle)*rr}`);}body+=`<polygon points="${points.join(' ')}" fill="${i%2?'#829583':'#b39a68'}"/><circle cx="${x}" cy="${y}" r="8" fill="#213435"/>${text(x,y+74,`${'ABCD'[i]} · ${count}이`,'#dbcba4',13)}`;});
      return svg('외접 기어 네 개. 중간 크기를 바꿔도 처음과 끝의 전달 비율은 유지됩니다.',body,214)+`<p class="caption">A는 시계방향3회전 · 외접 맞물림 세 곳</p><div class="dials">${selectField(p,'D 방향',d.direction,[['CW','시계방향'],['CCW','반시계방향']],'direction')}${selectField(p,'D 회전수',d.turns,[[0.5,'½회'],[1,'1회'],[1.5,'1½회'],[2,'2회'],[3,'3회']],'turns')}</div>${btn('중간 기어 교환','swap-gears','class="large-control"','18이 ↔ 24이 미리보기')}`; }
    case 'clock': { let body='';[3,4,5].forEach((period,i)=> {const target=[2,1,4][i],cx=72+i*139,cy=92,r=45,angle=(d%period)/period*Math.PI*2,ta=target/period*Math.PI*2; body+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#d5c7a3" stroke="#a28b5e" stroke-width="6"/>`;for(let n=0;n<period;n++){const a=n/period*Math.PI*2;body+=text(cx+Math.sin(a)*31,cy-Math.cos(a)*31+4,n,'#314d49',12);}body+=`<path d="M${cx+Math.sin(ta)*48} ${cy-Math.cos(ta)*48}l-4-4h8z" fill="#e5be75"/><path d="M${cx} ${cy}L${cx+Math.sin(angle)*24} ${cy-Math.cos(angle)*24}" stroke="#304e4b" stroke-width="3"/>${text(cx,165,`주기${period} · 목표${target}`,'#d2c69e',12)}${text(cx,188,`현재${d%period} ${d%period===target?'✓':'×'}`,'#b8ceb7',15)}`;});
      return svg('서로 다른 세 주기의 실제 위상과 목표 홈',body,210)+`<div class="clock-dial">${btn('10박자 이전','clock-step','data-value="-10"','−10')}${btn('1박자 이전','clock-step','data-value="-1"','−1')}${numberField(p,'전체 박자',d,0,59,'')}${btn('1박자 다음','clock-step','data-value="1"','+1')}${btn('10박자 다음','clock-step','data-value="10"','+10')}</div>`; }
    case 'logic': {const lights=logicLights(d),terms=['A·B 하나만','B·C 둘 다','D 꺼짐','C·E 하나 이상','D·F 하나만'];return `<div class="circuit-lights">${lights.map((v,i)=>`<div class="circuit-row ${v?'lit':''}"><span class="bulb">${v?'●':'○'}</span><b>${'PQRST'[i]}</b><span>${terms[i]}</span><strong>${v?'충족':'불일치'}</strong></div>`).join('')}</div><div class="toggle-buttons six">${d.map((v,i)=>btn(`${'ABCDEF'[i]} 스위치`,'toggle',`data-index="${i}" aria-pressed="${!!v}" class="switch ${v?'selected':''}"`,`${'ABCDEF'[i]} <small>${v?'켜짐':'꺼짐'}</small>`)).join('')}</div><div class="power-meter ${sum(d)>3?'overload':''}">전력 ${sum(d)} / 정확히3줄</div>`; }
    case 'water': { const names={L:'왼쪽',R:'오른쪽',M:'가운데'},allowed=[['L'],['R'],['L'],['R','M']];return `<div class="water-schedule">${d.map((v,i)=>`<div class="water-step"><b>박자 ${i}</b><span class="droplet">◆ 1눈금</span>${selectField(p,`박자 ${i} 경로`,v,[['L','왼쪽 L'],['R','오른쪽 R'],['M','가운데 M']],String(i))}<small class="${allowed[i].includes(v)?'valid':'invalid'}">${allowed[i].includes(v)?'수신기 열림':'수신기 닫힘'}</small></div>`).join('')}</div><div class="receivers">${['L','R','M'].map((v,i)=>`<div><span class="tank" style="--fill:${d.filter(x=>x===v).length*20}%"></span><strong>${names[v]} ${d.filter(x=>x===v).length}/${[2,1,1][i]}</strong></div>`).join('')}</div><p class="caption">L 짝수0·2 / R 홀수1·3 / M 예열 뒤3만</p>`; }
    case 'optics': return `<div class="optics-tabs"><h3>① 실제 광선 주소</h3>${mirrors(p,d.mirrors,true)}<h3>② 문틀의 중앙 투영</h3>${projection(p,d)}</div>`;
    case 'records': return `<h3>① 사건을 오래된 순서로 정렬</h3>${order(p,d.order,'order','사건 순서')}<h3>② 처리하지 않은 중복 한 장 제외</h3>${selectField(p,'제외할 수신 기록',d.drop,[['','아직 선택 안 함'],...Object.entries(p.labels)],'drop')}<h3>③ 실제 처리를 마지막부터 해제</h3>${d.drop?order(p,d.undo,'undo','해제 순서'):'<p class="caption">제외할 한 장을 선택하면 해제 슬롯이 나타납니다.</p>'}`;
    case 'rhythm': return `<div class="rhythm-original"><b>시작 ▣</b><span>━ · · ━ · ·</span></div><div class="dials three">${d.map((v,i)=>selectField(p,`${i+1}번째 박자`,v,[['L','길게 ━'],['S','짧게 ·']],String(i))).join('')}</div><p class="rhythm-preview">미리보기 ${[...d,...d].map(v=>v==='L'?'━':'·').join(' ')}</p>`;
    case 'stamps': return `<div class="stamp-album">${d.map((v,i)=>`<div class="stamp-card"><b>${[3,5,7][i]}표</b><span>${['▧','◇','❧'][i]}</span>${numberField(p,`${[3,5,7][i]}표 우표 장수`,v,0,i===2?1:2,String(i))}</div>`).join('')}</div><div class="status-line">${pill(`선택 ${sum(d)} / 4장`)}${pill(`운임 ${d.reduce((s,n,i)=>s+n*[3,5,7][i],0)} / 18`)}</div>`;
    case 'balance': {const weights=[1,2,4,8],left=1+d.reduce((s,v,i)=>s+(v==='L'?weights[i]:0),0),right=d.reduce((s,v,i)=>s+(v==='R'?weights[i]:0),0);return scaleDrawing(left,right,['왼쪽','오른쪽'],true)+`<div class="dials four">${d.map((v,i)=>selectField(p,`이동추 ${weights[i]}`,v,[['','쟁반'],['L','왼쪽'],['R','오른쪽']],String(i))).join('')}</div>`;}
    default: return '<p>이 장치를 표시할 수 없습니다.</p>';
  }
}
