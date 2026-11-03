import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES, BY_ID, MAIN_IDS } from '../src/content.js';
import { freshState, parseSave, draftOf, withDraft, attempt, canEnter, mainCount, optionalCount, platesOf, chooseEnding, postalState, sequenceStep, traceBeam, stencilInfo, evaluate } from '../src/model.js';
import { SOLUTIONS, DOMAINS } from './solutions.mjs';

for (const p of PUZZLES) test(`${p.id}: 명세 후보에서 정답 상태가 정확히 하나`, () => {
  const valid = [...DOMAINS[p.id]()].filter(d => evaluate(p, d).ok);
  assert.deepEqual(valid, [SOLUTIONS[p.id]]);
  assert.equal(evaluate(p, p.initial).ok, false, '초기 상태가 이미 정답이면 안 된다');
});

function complete(state, id) {
  const changed = withDraft(state, id, SOLUTIONS[id]);
  const checked = attempt(changed, id);
  assert.equal(checked.result.ok, true, id);
  return checked.state;
}
function completedMain() {
  let state = { ...freshState(), started: true };
  for (const id of MAIN_IDS) state = complete(state, id);
  return state;
}

test('잠긴 방과 최종 장치는 설정·성공을 제출할 수 없다', () => {
  const s = freshState();
  assert.equal(canEnter(s, 'hall'), false); assert.equal(canEnter(s, 'exit'), false);
  assert.equal(withDraft(s, 'F-1', SOLUTIONS['F-1']), s);
  assert.equal(attempt(s, 'F-1').state, s); assert.equal(attempt(s, 'F-1').result.ok, false);
  assert.equal(chooseEnding(s, 'return'), s);
});
test('필수23개만으로 출구와 두 처리 방식에 도달한다', () => {
  const s = completedMain();
  assert.equal(mainCount(s), 23); assert.equal(optionalCount(s), 0); assert.equal(platesOf(s).length, 6);
  assert.equal(chooseEnding(s, 'preserve').ending, 'preserve'); assert.equal(chooseEnding(s, 'return').ending, 'return');
});
test('같은 층의 두 방을 반대 순서로 풀어도 같은 진행이 된다', () => {
  const order = ['P00-1', 'P00-2', ...[2, 1, 4, 3, 6, 5].flatMap(n => [1, 2, 3].map(k => `R${n}-${k}`)), 'F-1', 'F-2', 'F-3'];
  let s = { ...freshState(), started: true }; for (const id of order) s = complete(s, id);
  assert.equal(mainCount(s), 23); assert.equal(platesOf(s).length, 6);
});
test('선택6개는 나중에 회수해도 필수 해결을 취소하지 않는다', () => {
  let s = completedMain(); for (let i = 1; i <= 6; i++) s = complete(s, `O-${i}`);
  assert.equal(mainCount(s), 23); assert.equal(optionalCount(s), 6); assert.equal(s.solved.length, 29);
});
test('해결 직후 연타해도 해결 사실·규칙판이 중복되지 않는다', () => {
  let s = completedMain(); for (let i = 0; i < 5; i++) s = attempt(s, 'R2-3').state;
  assert.equal(s.solved.length, 23); assert.equal(platesOf(s).length, 6);
});
test('해결한 장치의 연습 초기화는 전체 진행을 되돌리지 않는다', () => {
  const s = withDraft(completedMain(), 'R2-2', BY_ID['R2-2'].initial);
  assert.equal(attempt(s, 'R2-2').result.ok, false); assert.equal(mainCount(s), 23); assert.equal(canEnter(s, 'exit'), true);
});
test('확인 유실 뒤 중복 재전송을 반복해도41은 한 번만 인도한다', () => {
  assert.deepEqual(postalState(['R41', 'R41']).delivered, [41]);
  assert.deepEqual(postalState(['R41', 'R41', 'A41', 'S42', 'A42']).delivered, [41, 42]);
  assert.equal(postalState(['A41']), null);
});
test('잘못된 작업 순서는 진행을 바꾸지 않고 거부된다', () => {
  const p = BY_ID['R1-3'], initial = [];
  assert.equal(sequenceStep(p, initial, 'D').draft, initial);
  assert.deepEqual(sequenceStep(p, initial, 'C').draft, ['C']);
});
test('기어 중간 순서와 토글 실행 순서의 동치를 허용한다', () => {
  assert.equal(evaluate(BY_ID['R6-1'], { ...SOLUTIONS['R6-1'], swap: true }).ok, true);
  let d = [0, 0, 0, 0]; for (const i of [2, 0, 1, 3, 3]) d[i] = 1 - d[i];
  assert.equal(evaluate(BY_ID['R4-3'], d).ok, true);
});
test('양만 맞는 오배수, 꽃이 열린 오박자, 전력초과를 거부한다', () => {
  assert.equal(evaluate(BY_ID['R2-2'], ['W', 'W', 'W', 'E']).ok, false);
  assert.equal(evaluate(BY_ID['R2-3'], 4).ok, false);
  assert.equal(evaluate(BY_ID['R6-3'], [0, 1, 1, 0, 1, 1]).ok, false);
  assert.equal(evaluate(BY_ID['F-1'], ['L', 'R', 'L', 'R']).ok, false);
});
test('광선은 경계의 목표 주소에 실제 도달해야 한다', () => {
  assert.deepEqual(traceBeam(BY_ID['R3-2'], ['/', '/', '/']).exit, [2, 0]);
  assert.deepEqual(traceBeam(BY_ID['R3-2'], SOLUTIONS['R3-2']).exit, [4, 0]);
  assert.equal(stencilInfo(1).overlap, 0); assert.equal(stencilInfo(1).empty, 0);
});
test('저장 복원은 진행·미완료 설정·힌트·핀을 보존한다', () => {
  let s = completedMain(); s.room = 'exit'; s.hints['F-2'] = 3; s.pins = ['F-2:1'];
  s = withDraft(s, 'F-2', { mirrors: ['/', '/', '/'], camera: 1, middle: 4, back: 7 });
  const restored = parseSave(JSON.stringify(s));
  assert.equal(mainCount(restored), 23); assert.deepEqual(restored.drafts['F-2'], s.drafts['F-2']);
  assert.equal(restored.hints['F-2'], 3); assert.deepEqual(restored.pins, s.pins);
});
test('잘못된 저장값·버전·범위와 미해제 관문을 받아들이지 않는다', () => {
  for (const raw of ['null', '{', JSON.stringify({ schemaVersion: 99, solved: [] })]) assert.throws(() => parseSave(raw));
  const s = parseSave(JSON.stringify({ ...freshState(), room: 'exit', solved: ['F-3'], drafts: { 'P00-1': ['<script>', 'C', 'T'] }, settings: { sound: 'yes' }, pins: ['unknown'] }));
  assert.equal(s.room, 'reception'); assert.equal(mainCount(s), 0); assert.deepEqual(draftOf(s, 'P00-1'), ['', '', '']); assert.equal(s.settings.sound, false); assert.deepEqual(s.pins, []);
});
test('조건에 맞지 않는 엔딩이나 출처를 저장 복원으로 조기 생성하지 않는다', () => {
  const s = parseSave(JSON.stringify({ ...freshState(), ending: 'return', solved: ['O-6'] }));
  assert.equal(s.ending, null); assert.equal(optionalCount(s), 0);
});
