import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { startServer } from '../server.mjs';
import { ROOM_BY_ID } from '../src/content.js';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const baseline = process.argv.includes('--baseline');
const folder = `qa/art-${baseline ? 'before' : 'after'}`;
await mkdir(folder, { recursive: true });
const server = await startServer({ port: 0 });
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1320, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const measurements = await page.evaluate(async () => {
    const { drawScene } = await import('/src/scenes.js');
    const { freshState } = await import('/src/model.js');
    const { ROOMS, MAIN_IDS, PREFIX } = await import('/src/content.js');
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;background:#12202a;color:#e8d7b2;font-family:system-ui';
    const style = document.createElement('style');
    style.textContent = '.art-review{width:1312px;margin:4px}.art-review h1{font-size:23px;padding:16px}.art-review>p{padding:0 16px 20px;font-size:14px}.art-pair{display:grid;grid-template-columns:640px 640px;gap:16px;margin-bottom:22px}.art-frame h2{font-size:13px;font-weight:400;padding:8px 4px}.art-frame canvas{width:640px;height:360px;display:block;image-rendering:pixelated}';
    document.head.append(style);
    const root = document.createElement('main');root.className = 'art-review';
    root.innerHTML = '<h1>폐관 기록 · 도트 공간 검토</h1><p>고정 상태로 원본 렌더러를 비교하는 미술 검토 프레임. 실제 플레이 진행의 증거는 별도 전체 검증에 기록합니다.</p>';
    document.body.append(root);
    const output=[];
    for (const room of ROOMS) {
      const pair = document.createElement('section');pair.className='art-pair';root.append(pair);
      for(const complete of [false,true]) {
        const state=freshState();
        if(complete) state.solved=room.id==='hall'||room.id==='exit'?[...MAIN_IDS]:room.id==='reception'?['P00-1','P00-2']:PREFIX[room.id]?[1,2,3].map(n=>`R${PREFIX[room.id]}-${n}`):[];
        else if(room.id==='hall')state.solved=['P00-1','P00-2'];
        const id=`${room.id}-${complete?'restored':'initial'}`;
        const article=document.createElement('article');article.className='art-frame';
        const heading=document.createElement('h2');heading.textContent=`${room.name} · ${complete?'복구 후':'복구 전'}`;article.append(heading);
        const canvas=document.createElement('canvas');canvas.id=id;canvas.width=640;canvas.height=360;article.append(canvas);pair.append(article);
        drawScene(canvas,room.id,state,0);
        const samples=[];for(let i=0;i<7;i++){const start=performance.now();drawScene(canvas,room.id,state,i);samples.push(performance.now()-start);}drawScene(canvas,room.id,state,0);
        const pixels=canvas.getContext('2d').getImageData(0,0,640,360).data;
        const colors=new Set();for(let i=0;i<pixels.length;i+=16)colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);
        output.push({id,room:room.id,restored:complete,colors:colors.size,renderMs:samples});
      }
    }
    const pair=document.createElement('section');pair.className='art-pair';root.append(pair);
    for(const ending of ['preserve','return']) {
      const state=freshState();state.solved=[...MAIN_IDS];state.ending=ending;
      const article=document.createElement('article');article.className='art-frame';article.innerHTML=`<h2>아침 · ${ending==='preserve'?'공용 보존':'개인 반환'}</h2>`;
      const canvas=document.createElement('canvas');canvas.id=`ending-${ending}`;canvas.width=640;canvas.height=360;article.append(canvas);pair.append(article);drawScene(canvas,'ending',state,0);
      output.push({id:canvas.id,room:'ending',ending});
    }
    return output;
  });
  for(const frame of measurements) {
    frame.file=`${folder}/${frame.id}.png`;
    await page.locator(`#${frame.id}`).screenshot({path:frame.file});
    const png=await readFile(frame.file);
    frame.captureSize={width:png.readUInt32BE(16),height:png.readUInt32BE(20)};
    frame.sha256=createHash('sha256').update(png).digest('hex');
  }
  await page.screenshot({path:`${folder}/contact-sheet.png`,fullPage:true});
  const manifest={scope:'code-native-art-review-fixtures',generatedAt:new Date().toISOString(),sourceCanvasSize:{width:640,height:360},browser:browser.version(),frames:measurements,sceneSourceHash:createHash('sha256').update(await readFile('src/scenes.js')).digest('hex')};
  if(!baseline) {
    const previous=JSON.parse(await readFile('qa/art-before/manifest.json','utf8'));
    manifest.changedFrames=measurements.filter(frame=>previous.frames.find(other=>other.id===frame.id)?.sha256!==frame.sha256).map(frame=>frame.id);
    manifest.totalFrames=measurements.length;
    for(const frame of measurements){const before=await readFile(previous.frames.find(other=>other.id===frame.id).file);if(before.readUInt32BE(16)!==frame.captureSize.width||before.readUInt32BE(20)!==frame.captureSize.height)throw new Error(`Comparison size mismatch: ${frame.id}`);}
    const pairs=measurements.map(frame=>({id:frame.id,label:frame.room==='ending'?`아침 · ${frame.ending==='preserve'?'공용 보존':'개인 반환'}`:`${ROOM_BY_ID[frame.room].name} · ${frame.restored?'복구 후':'복구 전'}`,before:previous.frames.find(other=>other.id===frame.id).file.replace(/^qa\//,''),after:frame.file.replace(/^qa\//,'')}));
    const gallery=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>폐관 기록 · 도트 그래픽 전후 비교</title><style>*{box-sizing:border-box}body{margin:0;background:#142b31;color:#e4d6b1;font:16px/1.7 'Malgun Gothic',sans-serif}main{max-width:1350px;margin:auto;padding:26px}h1{font:30px/1.5 Batang,serif;margin:0}p{color:#b8c6ad;font-size:14px}label{display:block;margin:24px 0}select{font:inherit;min-width:270px;background:#29433c;color:#e4d6b1;border:1px solid #9f9f70;padding:9px;margin-left:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}.frame{min-width:0}h2{font-size:15px;font-weight:400;letter-spacing:.06em}img{width:100%;height:auto;image-rendering:pixelated;border:1px solid #7f906b;display:block}.after h2{color:#ecd295}small{font-size:12px;color:#afc1a6}@media(max-width:900px){.pair{grid-template-columns:1fr}main{padding:16px}select{display:block;margin:8px 0 0}}</style><main><h1>여섯 번째 새벽 · 도트 그래픽 고도화</h1><p>640×360 원본, 동일한 상태와 프레임의 변경 전·후 비교. 아래 이미지는 미술 검토용 고정 상태이며 실제 정상 플레이 검증과 구분합니다.</p><label>비교할 공간<select id="scene"></select></label><div class="pair"><section class="frame"><h2>변경 전 · v1.0</h2><img id="before" alt="변경 전 도트 공간"></section><section class="frame after"><h2>변경 후 · v1.1</h2><img id="after" alt="변경 후 도트 공간"></section></div><p id="caption"></p><small>이 파일과 art-before·art-after 폴더를 함께 보관하면 인터넷 없이 볼 수 있습니다.</small></main><script>const frames=${JSON.stringify(pairs)};const select=document.querySelector('#scene');for(const [i,frame]of frames.entries()){const option=document.createElement('option');option.value=i;option.textContent=frame.label;select.append(option);}function show(){const frame=frames[Number(select.value)];document.querySelector('#before').src=frame.before;document.querySelector('#after').src=frame.after;document.querySelector('#caption').textContent=frame.label+' · 정수 픽셀 윤곽, 재질 명암, 조명, 소품과 복구 상태를 비교하세요.';}select.addEventListener('change',show);show();</script></html>`;
    await writeFile('qa/art-review.html',gallery,'utf8');
    const galleryPage=await browser.newPage();
    await galleryPage.goto(new URL('../qa/art-review.html',import.meta.url).href);
    for(let i=0;i<pairs.length;i++){
      await galleryPage.locator('#scene').selectOption(String(i));
      const{width,height}=measurements[i].captureSize;
      await galleryPage.waitForFunction(({width,height})=>[...document.querySelectorAll('img')].every(image=>image.complete&&image.naturalWidth===width&&image.naturalHeight===height),{width,height});
    }
    manifest.galleryValidation={status:'PASS',selectedPairs:pairs.length,matchingCaptureDimensions:true};
    console.log(`ART: ${manifest.changedFrames.length}/${measurements.length} frames changed; review sheet saved.`);
  }
  await writeFile(`${folder}/manifest.json`,JSON.stringify(manifest,null,2),'utf8');
  console.log(`Saved ${measurements.length} fixed-state art frames: ${folder}`);
} finally {
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
