import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, rename, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { startServer } from '../server.mjs';
import { BY_ID, ROOM_BY_ID } from '../src/content.js';
import { SOLUTIONS } from './solutions.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
await mkdir('qa/evidence', { recursive: true });
const keys = ['launch', 'render', 'input', 'coreLoop', 'outcome', 'restart'];
const runId = `full-${randomUUID()}`;
const evidence = { schemaVersion: 1, runId, environment: { node: process.version, platform: process.platform, viewport: { width: 1280, height: 720 } }, inputTrace: [{ action: 'verify-start', at: new Date().toISOString() }], observations: Object.fromEntries(keys.map(key => [key, { id: key, inputs: ['not-run'], state: 'not-run' }])), diagnostics: [] };
const report = { schemaVersion: 3, status: 'NOT_RUN', verify: { command: 'npm.cmd run verify', exitCode: null, suites: [] }, completeRun: { id: runId, cleanContext: true, terminal: 'not-reached', restart: 'not-reached', evidence: 'qa/evidence/run.json' }, checks: Object.fromEntries(keys.map(key => [key, 'NOT_RUN'])), limitations: [{ scope: 'human playtest', reason: '알고 있는 풀이로 진행한 자동 검증이다. 초심자의 발견 가능성·재미·4~6시간 분량은 검증하지 않았다.' }, { scope: 'target device', reason: 'Windows Chromium 자동화로 검증. 다른 브라우저·실제 스크린리더·배포용 데스크톱 패키지는 미검증.' }, { scope: 'art and sound', reason: '직접 그린 도트 회색상자와 합성 장치음. 최종 원화·환경음·음악·성우는 포함하지 않는다.' }] };
async function atomic(file, value) { await writeFile(`${file}.tmp`, JSON.stringify(value, null, 2), 'utf8'); await rename(`${file}.tmp`, file); }
await atomic('qa/verification.json', report);
const failures = [], network = [], errors = [];
const roomArtFrames=[];
let browser, server, currentPage, stage = 'launch';
function observe(page) {
  currentPage = page;
  page.setDefaultTimeout(10000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.on('request', req => { if (!req.url().startsWith('http://127.0.0.1:') && !req.url().startsWith('data:')) network.push(req.url()); });
}
const note = (action, detail) => evidence.inputTrace.push({ action, detail });
async function click(scope, name) { await scope.getByRole('button', { name, exact: true }).first().click(); note('click', name); }
async function select(scope, name, value) { await scope.getByLabel(name, { exact: true }).selectOption(String(value)); note('select', { name, value }); }
async function number(scope, name, value) { const el = scope.getByRole('spinbutton', { name, exact: true }); await el.fill(String(value)); await el.press('Tab'); note('number', { name, value }); }
async function reorder(scope, desired, field = 'root', label = '기록 순서') {
  const list = scope.locator(`[data-order-list="${field}"]`);
  for (let i = 0; i < desired.length; i++) {
    let tokens = await list.locator('[data-order-token]').evaluateAll(els => els.map(el => el.dataset.orderToken));
    while (tokens.indexOf(desired[i]) > i) {
      await click(scope, `${label} ${desired[i]} 앞쪽 이동`);
      tokens = await list.locator('[data-order-token]').evaluateAll(els => els.map(el => el.dataset.orderToken));
    }
  }
}
async function configure(scope, id) {
  const p = BY_ID[id], d = SOLUTIONS[id];
  switch (p.kind) {
    case 'match': for (let i = 0; i < 3; i++) await select(scope, `${['○ 관찰', '△ 실험', '□ 기록'][i]} 소켓`, d[i]); break;
    case 'choice': await click(scope, `${d} · ${p.options.find(([v]) => v === d)[1]}`); break;
    case 'order': await reorder(scope, d, 'root', id === 'R4-1' ? '배역 순서' : '기록 순서'); break;
    case 'stencil': await click(scope, 'A 시계방향 회전'); break;
    case 'restore': case 'protocol': for (const token of d) await click(scope, p.labels[token]); break;
    case 'weights': for (let i = 0; i < 3; i++) await number(scope, `씨앗 ${'ABC'[i]} 질량`, d[i]); break;
    case 'routing': for (let i = 0; i < 4; i++) await select(scope, `${i + 1}눈금 통`, d[i]); break;
    case 'phase': await click(scope, '박자 5 선택'); break;
    case 'stars': case 'intersection': await click(scope, `좌표 ${d.join(',')}`); break;
    case 'mirrors': for (let i = 0; i < 3; i++) if (d[i] !== '/') await click(scope, `M${i + 1} 거울 회전`); break;
    case 'projection': await number(scope, '시점', d.camera); await number(scope, '중간 조각', d.middle); await number(scope, '뒤 조각', d.back); break;
    case 'toggles': for (const i of [2, 0, 1]) await click(scope, `${'ABCD'[i]} 줄 당기기`); break;
    case 'addresses': for (let i = 0; i < 4; i++) await select(scope, `${['원', '잎', '별', '물결'][i]} 봉투 주소`, d[i]); break;
    case 'route': for (const next of d.slice(1)) await click(scope, `${next}로 이동`); break;
    case 'gears': await select(scope, 'D 방향', d.direction); await select(scope, 'D 회전수', d.turns); break;
    case 'clock': await number(scope, '전체 박자', d); break;
    case 'logic': for (const i of [1, 2, 5]) await click(scope, `${'ABCDEF'[i]} 스위치`); break;
    case 'water': for (let i = 0; i < 4; i++) await select(scope, `박자 ${i} 경로`, d[i]); break;
    case 'optics': await click(scope, 'M3 거울 회전'); await number(scope, '시점', d.camera); await number(scope, '중간 조각', d.middle); await number(scope, '뒤 조각', d.back); break;
    case 'records': await reorder(scope, d.order, 'order', '사건 순서'); await select(scope, '제외할 수신 기록', 'D'); await reorder(scope, d.undo, 'undo', '해제 순서'); break;
    case 'rhythm': await select(scope, '1번째 박자', 'L'); break;
    case 'stamps': for (let i = 0; i < 3; i++) await number(scope, `${[3, 5, 7][i]}표 우표 장수`, d[i]); break;
    case 'balance': for (let i = 0; i < 4; i++) await select(scope, `이동추 ${[1, 2, 4, 8][i]}`, d[i]); break;
    default: throw new Error(`No UI configuration for ${id}`);
  }
}
async function solveAll(page, optional, shots) {
  let currentRoom = 'reception';
  const order = ['P00-1', 'P00-2'];
  for (let n = 1; n <= 6; n++) { order.push(...[1, 2, 3].map(k => `R${n}-${k}`)); if (optional) order.push(`O-${n}`); }
  order.push('F-1', 'F-2', 'F-3');
  let completed = 0;
  for (const id of order) {
    const p = BY_ID[id], scope = page.locator('#workbench');
    if (p.room !== currentRoom) {
      await click(page.getByRole('navigation', { name: '게임 메뉴' }), '회랑');
      if(shots&&currentRoom==='reception'){
        const visual='qa/evidence/room-hall.png';await page.screenshot({path:visual});roomArtFrames.push({room:'hall',phase:'first-visit',visual});
      }
      await click(page, `${ROOM_BY_ID[p.room].name} 입장`);
      currentRoom = p.room;
      console.log(`UI: ${ROOM_BY_ID[p.room].name}`);
      if(shots){const visual=`qa/evidence/room-${p.room}-initial.png`;await page.screenshot({path:visual});roomArtFrames.push({room:p.room,phase:'initial',visual});}
    }
    await click(page, `${p.title} 조사`);
    await expect(scope).toBeVisible();
    if (id === 'P00-1' && shots) {
      await click(scope, '장치 검사');
      await expect(scope.locator('[data-feedback="error"]')).toBeVisible();
      await expect(page.locator('[data-main-count]')).toHaveAttribute('data-main-count', '0');
      note('counterexample', '미완성 퓨즈는 진행을 올리지 않음');
    }
    if (shots && id === 'R2-2') {
      for (let i = 0; i < 4; i++) await select(scope, `${i + 1}눈금 통`, i === 3 ? 'E' : 'W');
      await click(scope, '장치 검사'); await expect(scope.locator('[data-feedback="error"]')).toContainText('침전물');
      await click(scope, '이 장치 초기화');
      note('counterexample', '양은 맞아도 침전 경로가 틀리면 거부');
    }
    if (shots && id === 'R2-3') { await click(scope, '박자 4 선택'); await click(scope, '장치 검사'); await expect(scope.locator('[data-feedback="error"]')).toContainText('송풍'); }
    if (shots && id === 'R5-2') { await click(scope, '41 확인 수령'); await expect(scope.locator('[data-feedback="error"]')).toContainText('응답칸'); }
    await configure(scope, id);
    if (shots && id === 'R6-3') { await click(scope, 'E 스위치'); await click(scope, '장치 검사'); await expect(scope.locator('[data-feedback="error"]')).toContainText('전력4'); await click(scope, 'E 스위치'); }
    await click(scope, '장치 검사');
    await expect(scope.locator('[data-feedback="success"]')).toBeVisible();
    if (!p.optional) completed++;
    await expect(page.locator('[data-main-count]')).toHaveAttribute('data-main-count', String(completed));
    if (id === 'P00-1' && shots) {
      report.checks.input = 'PASS';
      evidence.observations.input = { id: 'fuse-input', inputs: ['○·△·□ 퓨즈 선택', '장치 검사'], state: { solvedRequired: 1, feedback: await scope.locator('[data-feedback]').innerText() } };
    }
    if (shots && ['R2-2', 'R4-2', 'F-2'].includes(id)) {
      const file = { 'R2-2': 'greenhouse.png', 'R4-2': 'projection.png', 'F-2': 'final-optics.png' }[id];
      await page.screenshot({ path: `qa/evidence/${file}`, fullPage: true });
    }
    await click(scope, '장치 닫기');
    await expect(scope).not.toBeVisible();
    if(shots&&(id==='P00-2'||(!p.optional&&id.endsWith('-3')))){const visual=`qa/evidence/room-${p.room}-restored.png`;await page.screenshot({path:visual,fullPage:p.room==='exit'});roomArtFrames.push({room:p.room,phase:'restored',visual});}
    if (shots && id === 'R2-3') {
      await click(page.getByRole('navigation', { name: '게임 메뉴' }), '기록 저장');
      await page.reload(); note('reload', '온실 복구 뒤 자동 저장 재개');
      await click(page, '이어서');
      await expect(page.locator('[data-main-count]')).toHaveAttribute('data-main-count', '8');
    }
  }
  return order;
}

try {
  for (const [name, args] of [['model', ['--test', 'tests/model.test.mjs','tests/art.test.mjs']], ['build', ['tools/build.mjs']]]) {
    const child = spawnSync(process.execPath, args, { encoding: 'utf8' });
    await writeFile(`qa/evidence/${name}.txt`, (child.stdout || '') + (child.stderr || ''), 'utf8');
    report.verify.suites.push({ name, exitCode: child.status });
    if (child.status !== 0) throw new Error(`${name} failed: ${child.stderr || child.stdout}`);
  }
  server = await startServer({ port: 0, root: fileURLToPath(new URL('../dist', import.meta.url)) });
  const url = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  evidence.environment.browser = browser.version();
  evidence.environment.url = url;
  evidence.environment.build = JSON.parse(await readFile('dist/build.json', 'utf8'));
  const context = await browser.newContext({ viewport: evidence.environment.viewport, reducedMotion: 'reduce' });
  const page = await context.newPage(); observe(page);
  await page.goto(url);
  await expect(page.getByRole('heading', { name: /여섯 번째/ })).toBeVisible();
  report.checks.launch = 'PASS';
  evidence.observations.launch = { id: 'clean-title', inputs: ['빈 브라우저 컨텍스트로 게임 주소 열기'], state: { title: await page.title(), newRecordVisible: await page.getByRole('button', { name: '새 기록 시작', exact: true }).isVisible() } };
  stage = 'render';
  const colorCount = await page.locator('canvas').evaluate(canvas => { const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; const colors = new Set(); for (let i = 0; i < data.length; i += 16) colors.add(`${data[i]},${data[i+1]},${data[i+2]}`); return colors.size; });
  expect(colorCount).toBeGreaterThan(20);
  await page.screenshot({ path: 'qa/evidence/title.png', fullPage: true });
  report.checks.render = 'PASS';
  evidence.observations.render = { id: 'pixel-scene', inputs: ['640×360 실제 Canvas 표본과 화면 캡처'], state: { distinctSampleColors: colorCount }, visual: 'qa/evidence/title.png' };
  stage = 'input';
  await click(page, '새 기록 시작');
  await expect(page.locator('[data-main-count]')).toHaveAttribute('data-main-count', '0');
  stage = 'coreLoop';
  const played = await solveAll(page, true, true);
  evidence.diagnostics.push({id:'actual-room-art',state:'PASS',detail:'정상 입력으로 방문한 공간의 복구 전후 실제 UI 캡처',frames:roomArtFrames});
  report.checks.coreLoop = 'PASS';
  evidence.observations.coreLoop = { id: 'all-29-puzzles', inputs: played, state: { required: 23, optional: 6, observedProgress: await page.locator('[data-main-count]').innerText(), endingChoices: await page.locator('.ending-choice').innerText() }, visual: 'qa/evidence/final-optics.png' };
  stage = 'outcome';
  await click(page, '공용 보관함에 보존');
  await expect(page.getByRole('heading', { name: '다음 사람이 읽을 수 있도록' })).toBeVisible();
  expect(await page.locator('.source-tags').innerText()).not.toContain('출처 미확인');
  await page.screenshot({ path: 'qa/evidence/ending-preserve.png', fullPage: true });
  report.checks.outcome = 'PASS'; report.completeRun.terminal = 'designed-outcome';
  evidence.observations.outcome = { id: 'preserve-ending', inputs: ['공용 보관함에 보존'], state: 'designed-outcome', ending: 'preserve', sourceConfirmations: 6, visual: 'qa/evidence/ending-preserve.png' };
  stage = 'restart';
  await click(page.getByRole('navigation', { name: '게임 메뉴' }), '새 기록');
  await click(page.locator('#confirm'), '현재 기록 지우고 시작');
  await expect(page.locator('[data-main-count]')).toHaveAttribute('data-main-count', '0');
  await expect(page.getByRole('heading', { name: '접수대', exact: true })).toBeVisible();
  await page.screenshot({ path: 'qa/evidence/restart.png', fullPage: true });
  report.checks.restart = 'PASS'; report.completeRun.restart = 'initial-state';
  evidence.observations.restart = { id: 'new-reception', inputs: ['새 기록', '현재 기록 지우고 시작'], state: 'initial-state', required: 0, room: '접수대', visual: 'qa/evidence/restart.png' };

  // Boundary diagnostics are additional runs; they do not replace the main six observations.
  stage = 'input';
  await click(page, '세 가지 작업 표시 조사');
  await page.keyboard.press('Tab');
  for (const direction of ['Tab', 'Shift+Tab']) for (let i = 0; i < 24; i++) {
    await page.keyboard.press(direction);
    const focus = await page.evaluate(() => ({ inside: !!document.activeElement.closest('#workbench'), tag: document.activeElement.tagName, label: document.activeElement.getAttribute('aria-label') || document.activeElement.id }));
    note('keyboard-focus', { direction, index: i, ...focus }); expect(focus.inside).toBe(true);
  }
  const bench = page.locator('#workbench');
  await select(bench, '○ 관찰 소켓', 'C');
  await click(bench, '힌트 한 단계 펼치기'); await click(bench, '힌트 한 단계 펼치기'); await click(bench, '3단계 · 직접 해답 보기');
  await click(bench, '수첩에 핀 고정');
  await page.keyboard.press('Escape'); await expect(page.locator('#workbench')).not.toBeVisible();
  await expect(page.getByRole('button', { name: '세 가지 작업 표시 조사', exact: true })).toBeFocused();
  await click(page.getByRole('navigation', { name: '게임 메뉴' }), '기록 저장');
  await click(page, '세 가지 작업 표시 조사');
  await select(bench, '○ 관찰 소켓', 'T'); await click(bench, '한 단계 되돌리기'); await expect(bench.getByLabel('○ 관찰 소켓', { exact: true })).toHaveValue('C');
  await click(bench, '이 장치 초기화'); await expect(bench.getByLabel('○ 관찰 소켓', { exact: true })).toHaveValue('');
  await click(bench, '장치 닫기');
  await click(page.getByRole('navigation', { name: '게임 메뉴' }), '설정'); await click(page.locator('#settings'), '수동 저장 불러오기');
  await click(page, '세 가지 작업 표시 조사'); await expect(bench.getByLabel('○ 관찰 소켓', { exact: true })).toHaveValue('C'); await expect(bench.locator('.hint-panel')).toContainText('3/3'); await expect(bench.locator('.pinned-clues')).toBeVisible(); await click(bench, '장치 닫기');
  evidence.diagnostics.push({ id: 'manual-save-undo-hints-pins', state: 'PASS', detail: '수동 저장과 별도 자동 저장, 되돌림·초기화, 힌트3단계와 단서 핀의 복원' });
  await click(page.getByRole('navigation', { name: '게임 메뉴' }), '설정');
  await page.getByLabel('글자 확대', { exact: true }).check();
  await page.getByLabel('움직임 줄이기',{exact:true}).uncheck();await click(page.locator('#settings'),'설정 닫기');
  const movingBefore=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(220);
  expect(await page.locator('canvas').evaluate(c=>c.toDataURL())).not.toBe(movingBefore);
  await click(page.getByRole('navigation',{name:'게임 메뉴'}),'설정');await page.getByLabel('움직임 줄이기',{exact:true}).check();await click(page.locator('#settings'),'설정 닫기');
  const stillBefore=await page.locator('canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(220);
  expect(await page.locator('canvas').evaluate(c=>c.toDataURL())).toBe(stillBefore);
  evidence.diagnostics.push({id:'pixel-ambient-motion',state:'PASS',detail:'움직임 켬에서 실제 픽셀이 변하고 저동작에서 같은 그림을 유지함'});
  await page.setViewportSize({ width: 1920, height: 1080 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  evidence.diagnostics.push({ id: 'keyboard-and-large-text', state: 'PASS', detail: '실제 Tab/Shift+Tab·Esc, 글자 확대, 1920×1080 수평 넘침 없음' });
  await context.close();

  const plainContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  const plain = await plainContext.newPage(); observe(plain); await plain.goto(url); await click(plain, '새 기록 시작');
  const minimal = await solveAll(plain, false, false);
  await click(plain, '발신자 보관함에 반환');
  await expect(plain.getByRole('heading', { name: '남긴 이에게 돌아갈 수 있도록' })).toBeVisible();
  expect(await plain.locator('.source-tags').innerText()).toContain('출처 미확인');
  await plain.screenshot({ path: 'qa/evidence/ending-return.png', fullPage: true });
  await click(plain, '선택대 다시 보기');
  await expect(plain.locator('[data-main-count]')).toHaveAttribute('data-main-count', '23');
  await expect(plain.locator('.ending-choice')).toBeVisible();
  evidence.diagnostics.push({ id: 'optional-skipped-and-return', state: 'PASS', detail: '선택6개를 전부 생략하고 필수23개로 반환 엔딩, 마지막 선택대로 재진입', requiredInputs: minimal, visual: 'qa/evidence/ending-return.png' });
  await plainContext.close();
  expect(errors, 'browser page errors').toEqual([]); expect(failures, 'failed resources').toEqual([]); expect(network, 'external requests').toEqual([]);
  evidence.diagnostics.push({ id: 'browser-health', state: 'PASS', pageErrors: errors, failedResources: failures, externalRequests: network });
  report.status = 'PASS'; report.verify.exitCode = 0;
  console.log('PASS: complete 29-puzzle UI run, both endings, optional-skip path, save/reload, real keyboard traversal and restart');
} catch (error) {
  report.status = 'FAIL'; report.verify.exitCode = 1;
  if (report.checks[stage] !== 'NOT_RUN' || stage !== 'launch') report.checks[stage] = 'FAIL';
  else report.checks.launch = 'FAIL';
  evidence.diagnostics.push({ id: 'failure', stage, message: error.stack || String(error), pageErrors: errors, failedResources: failures });
  if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: 'qa/evidence/failure.png', fullPage: true }).catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await atomic('qa/evidence/run.json', evidence);
  await atomic('qa/verification.json', report);
}
