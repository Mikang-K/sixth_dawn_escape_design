import { BY_ID, PUZZLES, MAIN_IDS, THEME_ROOMS, PREFIX, ROOM_BY_ID } from './content.js';

export const STORAGE_PREFIX = 'sixth-dawn.v1.';
export const clone = value => structuredClone(value);
export const freshState = () => ({ schemaVersion: 1, started: false, room: 'reception', solved: [], drafts: {}, seen: [], pins: [], hints: {}, ending: null, settings: { sound: false, reducedMotion: false, largeText: false, hotspots: true } });
export const isAvailable = (state, id) => !!BY_ID[id] && BY_ID[id].requires.every(pre => state.solved.includes(pre));
export const draftOf = (state, id) => clone(state.drafts[id] ?? BY_ID[id].initial);
export const mainCount = state => state.solved.filter(id => MAIN_IDS.includes(id)).length;
export const platesOf = state => THEME_ROOMS.filter(r => state.solved.includes(`R${PREFIX[r.id]}-3`));
export const optionalCount = state => state.solved.filter(id => BY_ID[id]?.optional).length;

export function canEnter(state, room) {
  if (room === 'reception') return true;
  if (room === 'hall') return state.solved.includes('P00-2');
  if (room === 'exit') return isAvailable(state, 'F-1');
  return !!PREFIX[room] && isAvailable(state, `R${PREFIX[room]}-1`);
}

const integer = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const permutation = (value, items) => Array.isArray(value) && value.length === items.length && new Set(value).size === items.length && value.every(v => items.includes(v));
const list = (v, n, options) => Array.isArray(v) && v.length === n && v.every(x => options.includes(x));
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);

export function validDraft(p, d) {
  if (!p) return false;
  switch (p.kind) {
    case 'match': return list(d, 3, ['', 'C', 'T', 'S']);
    case 'choice': return typeof d === 'string' && (d === '' || p.options.some(([key]) => key === d));
    case 'order': return permutation(d, p.initial);
    case 'stencil': return integer(d, 0, 3);
    case 'restore': return Array.isArray(d) && d.length <= 4 && d.every((v, i) => v === 'CBAD'[i]);
    case 'weights': return Array.isArray(d) && d.length === 3 && d.every(v => integer(v, 1, 6));
    case 'routing': return list(d, 4, ['', 'E', 'W']);
    case 'phase': return integer(d, 0, 5);
    case 'clock': return integer(d, 0, 59);
    case 'stars': case 'intersection': return d === null || (Array.isArray(d) && d.length === 2 && d.every(v => integer(v, 1, p.kind === 'stars' ? 6 : 5)));
    case 'mirrors': return list(d, 3, ['/', '\\']);
    case 'projection': case 'optics': return object(d) && integer(d.camera, 0, 3) && integer(d.middle, ...p.middleRange) && integer(d.back, ...p.backRange) && (p.kind !== 'optics' || list(d.mirrors, 3, ['/', '\\']));
    case 'toggles': return list(d, 4, [0, 1]);
    case 'logic': return list(d, 6, [0, 1]);
    case 'addresses': return list(d, 4, ['', 'N', 'E', 'S', 'W']);
    case 'protocol': return Array.isArray(d) && d.length <= 4 && d.every((v, i) => v === ['R41', 'A41', 'S42', 'A42'][i]);
    case 'route': return Array.isArray(d) && d.length >= 1 && d.length <= 5 && d[0] === 'S' && new Set(d).size === d.length && d.slice(1).every((v, i) => EDGES[d[i]]?.some(([to]) => to === v));
    case 'gears': return object(d) && ['CW', 'CCW'].includes(d.direction) && [0.5, 1, 1.5, 2, 3].includes(d.turns) && typeof d.swap === 'boolean';
    case 'water': return list(d, 4, ['L', 'R', 'M']);
    case 'records': return object(d) && permutation(d.order, ['S', 'R', 'D', 'K']) && ['', 'S', 'R', 'D', 'K'].includes(d.drop) && (d.drop ? permutation(d.undo, ['S', 'R', 'D', 'K'].filter(v => v !== d.drop)) : Array.isArray(d.undo) && d.undo.length === 0);
    case 'rhythm': return list(d, 3, ['L', 'S']);
    case 'stamps': return Array.isArray(d) && d.length === 3 && d.every((v, i) => integer(v, 0, i === 2 ? 1 : 2));
    case 'balance': return list(d, 4, ['', 'L', 'R']);
    default: return false;
  }
}

export function withDraft(state, id, value) {
  if (!isAvailable(state, id) || !validDraft(BY_ID[id], value)) return state;
  return { ...state, drafts: { ...state.drafts, [id]: clone(value) } };
}

export function parseSave(raw) {
  if (typeof raw !== 'string' || raw.length > 200_000) throw new Error('저장 기록의 크기가 올바르지 않습니다.');
  const value = JSON.parse(raw);
  if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.solved)) throw new Error('지원하지 않는 저장 기록입니다.');
  const state = freshState();
  state.started = value.started === true;
  const requested = new Set(value.solved.filter(id => typeof id === 'string' && BY_ID[id]));
  for (let i = 0; i < PUZZLES.length; i++) {
    for (const p of PUZZLES) if (requested.has(p.id) && !state.solved.includes(p.id) && isAvailable(state, p.id)) state.solved.push(p.id);
  }
  if (state.solved.length) state.started = true;
  if (object(value.drafts)) for (const p of PUZZLES) if (isAvailable(state, p.id) && validDraft(p, value.drafts[p.id])) state.drafts[p.id] = clone(value.drafts[p.id]);
  const clueIds = new Set(PUZZLES.flatMap(p => isAvailable(state, p.id) ? p.clues.map((_, i) => `${p.id}:${i}`) : []));
  if (Array.isArray(value.seen)) state.seen = [...new Set(value.seen.filter(v => clueIds.has(v)))];
  if (Array.isArray(value.pins)) state.pins = [...new Set(value.pins.filter(v => state.seen.includes(v)))].slice(-3);
  if (object(value.hints)) for (const p of PUZZLES) if (isAvailable(state, p.id) && integer(value.hints[p.id], 0, 3)) state.hints[p.id] = value.hints[p.id];
  if (object(value.settings)) for (const key of Object.keys(state.settings)) if (typeof value.settings[key] === 'boolean') state.settings[key] = value.settings[key];
  if (typeof value.room === 'string' && ROOM_BY_ID[value.room] && canEnter(state, value.room)) state.room = value.room;
  if (state.solved.includes('F-3') && ['preserve', 'return'].includes(value.ending)) state.ending = value.ending;
  return state;
}

export const EDGES = { S: [['A', 2], ['B', 1]], A: [['C', 2], ['T', 7]], B: [['C', 4], ['T', 9]], C: [['T', 3]], T: [] };
export function routeCost(path) { return path.slice(1).reduce((sum, to, i) => sum + (EDGES[path[i]]?.find(([key]) => key === to)?.[1] ?? Infinity), 0); }

export function stencilInfo(rotation) {
  let a = [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [3, 2]];
  const b = ['1100', '1101', '1001', '1011'];
  for (let i = 0; i < rotation; i++) a = a.map(([x, y]) => [3 - y, x]);
  const cells = Array.from({ length: 16 }, (_, i) => Number(b[Math.floor(i / 4)][i % 4]) + Number(a.some(([x, y]) => y * 4 + x === i)));
  return { cells, a, b, overlap: cells.filter(v => v === 2).length, empty: cells.filter(v => v === 0).length };
}

export function traceBeam(p, directions) {
  let [x, y] = p.start, dx = 1, dy = 0;
  const path = [[x, y]], seen = new Set();
  while (true) {
    x += dx; y += dy; path.push([x, y]);
    if (x < 1 || y < 1 || x > p.size || y > p.size) return { path, exit: [x, y], loop: false };
    const key = `${x},${y},${dx},${dy}`;
    if (seen.has(key)) return { path, exit: null, loop: true };
    seen.add(key);
    const mirror = p.mirrors.findIndex(([mx, my]) => mx === x && my === y);
    if (mirror >= 0) [dx, dy] = directions[mirror] === '/' ? [-dy, -dx] : [dy, dx];
  }
}

export function projected(p, d) { return [p.front - d.camera, d.middle - d.camera * 2, d.back - d.camera * 3]; }
export function puppetStates(d) {
  const masks = [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1], [1, 0, 0, 0]];
  return [0, 1, 2, 3].map(j => d.reduce((v, n, i) => v ^ (n * masks[i][j]), 0));
}
export function logicLights([a, b, c, d, e, f]) { return [a ^ b, b & c, 1 - d, c | e, d ^ f]; }
export function postalState(actions) {
  const state = { next: 41, last: 41, ack: null, delivered: [41] };
  for (const action of actions) {
    if (action === 'R41' && state.next === 41) state.ack = 41;
    else if (action === 'A41' && state.ack === 41 && state.next === 41) { state.next = 42; state.ack = null; }
    else if (action === 'S42' && state.next === 42 && state.last === 41) { state.last = 42; state.ack = 42; state.delivered.push(42); }
    else if (action === 'A42' && state.ack === 42 && state.next === 42) { state.next = 43; state.ack = null; }
    else return null;
  }
  return state;
}

export function sequenceStep(p, d, token) {
  const expected = p.kind === 'restore' ? [...'CBAD'] : ['R41', 'A41', 'S42', 'A42'];
  if (p.kind === 'protocol' && token === 'R41' && d.length === 1) return { draft: d, message: '이미 인도한41입니다. 다시 인도하지 않고 확인41만 유지합니다.' };
  if (token !== expected[d.length]) {
    const errors = p.kind === 'restore' ? { B: '봉인 덮개 때문에 단자에 닿지 않습니다.', A: '배수 전원이 없거나 덮개가 닫혔습니다.', D: '젖은 레일의 잠금 핀이 내려와 있습니다.', C: '이 작업은 이미 완료했습니다.' } : { A41: '41 확인이 아직 응답칸에 없습니다.', S42: '송신기가 아직41의 확인을 기다립니다.', A42: '42 확인이 아직 응답칸에 없습니다.', R41: '41의 재전송 작업은 끝났습니다.' };
    return { draft: d, message: errors[token] || '현재 단계에서는 실행할 수 없습니다.' };
  }
  return { draft: [...d, token], message: `${p.labels[token]} 완료. 다음 작업을 선택하세요.` };
}

const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const result = (ok, message) => ({ ok, message });
export function evaluate(p, d) {
  if (!validDraft(p, d)) return result(false, '아직 배치하지 않은 값이 있거나 설정 범위를 벗어났습니다.');
  switch (p.id) {
    case 'P00-1': return result(equal(d, ['C', 'T', 'S']), '○ 관찰·△ 실험·□ 기록의 소켓과 퓨즈를 각각 맞춰 주세요.');
    case 'P00-2': return result(d === 'H', d === 'G' ? '둥근 축이 사각 구멍에서 헛돕니다.' : '톱니 홈이 없어서 걸림쇠가 물리지 않습니다.');
    case 'R1-1': return result(d.indexOf('D') < d.indexOf('A') && d.indexOf('A') < d.indexOf('B') && d.indexOf('C') === d.indexOf('B') + 1, '운반대는 비보다 먼저, 비는 회로 차단보다 먼저. 봉인은 차단 바로 다음입니다.');
    case 'R1-2': { const s = stencilInfo(d); return result(!s.empty && !s.overlap, `빈칸 ${s.empty}, 겹친 잉크 ${s.overlap}. 둘 다0이어야 원본입니다.`); }
    case 'R1-3': return result(equal(d, [...'CBAD']), '현재 장치의 잠금을 마지막 작업부터 차례로 해제해야 합니다.');
    case 'R2-1': return result(d[0] + d[1] === 5 && d[1] + d[2] === 8 && d[0] + d[2] === 7, `현재 합: A+B=${d[0] + d[1]}, B+C=${d[1] + d[2]}, A+C=${d[0] + d[2]}. 사진은5·8·7입니다.`);
    case 'R2-2': {
      if (d.includes('')) return result(false, '네 통의 배수 방향을 모두 정해 주세요.');
      const east = d.reduce((s, side, i) => s + (side === 'E' ? i + 1 : 0), 0);
      return result(east === 4 && d[3] === 'W', d[3] === 'E' ? '4눈금 통의 침전물이 화단을 향합니다. 서쪽 침전조로 보내야 합니다.' : `동쪽${east}/목표4 · 서쪽${10 - east}/목표6. 시험수는 회수됐습니다.`);
    }
    case 'R2-3': return result(d === 5, ![4, 5].includes(d) ? '꽃이 아직 닫혀 있습니다. 꽃가루는 회수됐습니다.' : '송풍기가 돌아 꽃가루가 흩어집니다. 꽃가루는 회수됐습니다.');
    case 'R3-1': {
      const sky = new Set(['3,4', '4,4', '4,5', '5,5', '1,1', '1,5', '5,2', '6,6']);
      return result(d !== null && [[0, 0], [1, 0], [1, 1], [2, 1]].every(([x, y]) => sky.has(`${d[0] + x},${d[1] + y}`)), '노트의 네 점이 모두 실제 별과 맞아야 합니다. 북쪽을 고정해 주세요.');
    }
    case 'R3-2': { const beam = traceBeam(p, d); return result(equal(beam.exit, p.target), `빛이 (${beam.exit?.join(',') ?? '반복 경로'})에 도착했습니다. 목표는 북쪽4열입니다.`); }
    case 'R3-3': return result(d !== null && d[0] - d[1] === 1 && d[0] + d[1] === 7, '한 창만 만족하면 안 됩니다. 삼각형 점선과 원형 실선의 공통점을 찾으세요.');
    case 'R4-1': return result(d.indexOf('B') === d.indexOf('W') + 1 && [0, 3].includes(d.indexOf('D')) && d.indexOf('F') < d.indexOf('D') && d.indexOf('B') !== 2, '대본의 네 관계를 함께 만족해야 합니다. 사슴의 끝자리와 새의3번 금지를 확인하세요.');
    case 'R4-2': return result(projected(p, d).every(x => x === 0), `그림자 위치: ${projected(p, d).join(' · ')}. 세 조각 모두 중앙0이어야 합니다.`);
    case 'R4-3': return result(equal(puppetStates(d), [1, 0, 0, 1]), '목표는 늑대·사슴만 앞. 같은 줄을 다시 당기면 연결된 상태가 뒤집힙니다.');
    case 'R5-1': {
      if (d.includes('') || new Set(d).size !== 4) return result(false, '네 주소에 서로 다른 봉투를 하나씩 배치해 주세요.');
      const compass = 'NESW', [a, b, c, e] = d.map(v => compass.indexOf(v));
      return result((a - b + 4) % 4 === 1 && (c - a + 4) % 4 === 2 && [0, 1].includes(e) && b !== 3, '원은 잎의 시계방향 다음, 별은 원의 정반대. 물결과 잎의 주소 제한도 확인하세요.');
    }
    case 'R5-2': { const s = postalState(d); return result(!!s && s.next === 43 && s.last === 42 && equal(s.delivered, [41, 42]) && s.ack === null, '각 번호를 한 번씩 인도하고 확인까지 받아야 합니다. 현재 번호와 응답칸을 보세요.'); }
    case 'R5-3': return result(d.at(-1) === 'T' && routeCost(d) <= 7, `현재 운송 합계${routeCost(d)}박자. T에7박자 안으로 닿아야 합니다. 시험 봉투는 회수됩니다.`);
    case 'R6-1': return result(d.direction === 'CCW' && d.turns === 1, '외접 세 곳은 방향을 세 번 뒤집습니다. 처음과 끝에서 지나간 이의 수가 같아야 합니다.');
    case 'R6-2': return result(d % 3 === 2 && d % 4 === 1 && d % 5 === 4, `현재 위상은 ${d % 3} · ${d % 4} · ${d % 5}. 목표는2 · 1 · 4입니다.`);
    case 'R6-3': return result(logicLights(d).every(v => v === 1) && d.reduce((a, b) => a + b, 0) === 3, logicLights(d).every(v => v === 1) ? `검사등은 맞지만 전력${d.reduce((a, b) => a + b, 0)}줄입니다. 정확히3줄이어야 합니다.` : '꺼져 있는 검사등의 문장과 연결된 스위치를 확인하세요.');
    case 'F-1': {
      const allowed = [['L'], ['R'], ['L'], ['R', 'M']];
      const closed = d.findIndex((v, i) => !allowed[i].includes(v));
      const quantities = ['L', 'R', 'M'].map(v => d.filter(x => x === v).length);
      return result(closed === -1 && equal(quantities, [2, 1, 1]), closed >= 0 ? `박자${closed}에 선택한 수신기는 닫혀 있습니다. 시험수4눈금은 모두 회수됩니다.` : `왼쪽${quantities[0]}/2 · 오른쪽${quantities[1]}/1 · 가운데${quantities[2]}/1. 총량과 개별 목표를 함께 맞추세요.`);
    }
    case 'F-2': {
      const beam = equal(traceBeam(p, d.mirrors).exit, p.target), projection = projected(p, d).every(v => v === 0);
      return result(beam && projection, `광선 ${beam ? '도착' : '미도착'} / 문틀 ${projection ? '정렬' : '불일치'}. 두 조건이 함께 맞아야 합니다.`);
    }
    case 'F-3': return result(equal(d.order, ['S', 'R', 'D', 'K']) && d.drop === 'D' && equal(d.undo, ['K', 'R', 'S']), d.drop !== 'D' ? 'D는 같은 번호의 단순 수신입니다. 되돌릴 처리 도장이 없는 기록을 제외하세요.' : '사건을 먼저 정렬하고, 처리된 S·R·K만 마지막부터 해제하세요.');
    case 'O-1': return result(d === 'C', '오른쪽 홈과 한 줄 물결을 동시에 확인하세요.');
    case 'O-2': return result(d === 'A', d === 'B' ? 'B는6→6, 성장량0입니다. 최종 높이와 성장량은 다릅니다.' : d === 'C' ? 'C는3→4, 성장량1입니다. 다른 화분의 전후 차이와 비교해 보세요.' : '화분 하나를 선택하고 전후의 높이 차이를 비교하세요.');
    case 'O-3': return result(d === 'C', '북→동→남→서 고리에서 한 칸 시계방향인지 확인하세요.');
    case 'O-4': return result(equal([...d, ...d], [...'LSSLSS']), '시작 홈부터 입력 구절을 두 번 이어 원본 여섯 박자와 비교하세요.');
    case 'O-5': return result(d.reduce((a, b) => a + b, 0) === 4 && d.reduce((s, n, i) => s + n * [3, 5, 7][i], 0) === 18, `현재 ${d.reduce((a, b) => a + b, 0)}장 / 운임${d.reduce((s, n, i) => s + n * [3, 5, 7][i], 0)}. 목표는4장·18입니다.`);
    case 'O-6': { const weights = [1, 2, 4, 8], left = 1 + d.reduce((s, v, i) => s + (v === 'L' ? weights[i] : 0), 0), right = d.reduce((s, v, i) => s + (v === 'R' ? weights[i] : 0), 0); return result(!d.includes('') && left === right, `왼쪽${left} / 오른쪽${right}. 왼쪽 고정추1을 포함하고 이동추를 모두 사용하세요.`); }
    default: return result(false, '알 수 없는 장치입니다.');
  }
}

export function attempt(state, id) {
  if (!isAvailable(state, id)) return { state, result: result(false, '아직 앞 장치가 복구되지 않았습니다.') };
  const p = BY_ID[id], checked = evaluate(p, draftOf(state, id));
  if (!checked.ok) return { state, result: checked };
  const solved = state.solved.includes(id) ? state.solved : [...state.solved, id];
  const seen = [...new Set([...state.seen, ...p.clues.map((_, i) => `${id}:${i}`)])];
  const reward = p.optional ? `${ROOM_BY_ID[p.room].author}의 원본 서명을 확인했습니다. 출처는 마지막 보관 기록에 반영됩니다.` : id === 'F-3' ? '세 잠금핀이 모두 올라갔습니다. 문이 열렸습니다. 기록 처리 방식을 고를 수 있습니다.' : id.endsWith('-3') && p.room !== 'exit' ? `규칙판 「${ROOM_BY_ID[p.room].plate}」을 얻었습니다. 회랑에 변화가 남았습니다.` : '장치가 복구됐습니다. 다음 장치를 조사할 수 있습니다.';
  return { state: { ...state, solved, seen }, result: result(true, reward) };
}

export function chooseEnding(state, ending) {
  if (!state.solved.includes('F-3') || !['preserve', 'return'].includes(ending)) return state;
  return { ...state, ending };
}
