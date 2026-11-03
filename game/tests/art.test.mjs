import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { painter } from '../src/pixel-art.js';
import { drawScene } from '../src/scenes.js';
import { freshState } from '../src/model.js';
import { ROOMS, MAIN_IDS } from '../src/content.js';

function surface() {
  const operations=[];
  const context={ imageSmoothingEnabled:true,fillStyle:'',fillRect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isInteger));assert.ok(w>=0&&h>=0);operations.push(`${x},${y},${w},${h},${this.fillStyle}`);},save(){},restore(){},beginPath(){},rect(){},clip(){} };
  return {canvas:{getContext:()=>context},operations,context};
}
test('도트 선은 두 끝점을 포함하는 정수 픽셀로 래스터화한다',()=>{
  const {canvas,operations,context}=surface();painter(canvas).line(1,2,6,7,'#abcdef');
  assert.equal(context.imageSmoothingEnabled,false);assert.equal(operations.length,6);
  assert.ok(operations[0].startsWith('1,2,1,1'));assert.ok(operations.at(-1).startsWith('6,7,1,1'));
});
test('삼각형과 타원은 음수 크기나 소수 좌표의 사각형을 만들지 않는다',()=>{
  const {canvas,operations}=surface();const p=painter(canvas);p.polygon([[1,1],[20,5],[5,19]],'#ccc');p.ellipse(17,14,9,6,'#aaa');
  assert.ok(operations.length>20);
});
test('모든 공간의 복구 전후 렌더링은 저장 상태를 변경하지 않는다',()=>{
  for(const room of [...ROOMS.map(r=>r.id),'ending'])for(const done of[false,true]){
    const state=freshState();state.solved=done?[...MAIN_IDS]:[];state.ending=room==='ending'?'return':null;
    Object.freeze(state.solved);Object.freeze(state.settings);Object.freeze(state);
    const before=JSON.stringify(state),{canvas,operations}=surface();drawScene(canvas,room,state,0);
    assert.ok(operations.length>300,room);assert.equal(JSON.stringify(state),before,room);
  }
});
test('같은 상태·프레임의 그림은 재현되며 두 엔딩의 그림은 구분된다',()=>{
  function digest(room,state){const{canvas,operations}=surface();drawScene(canvas,room,state,0);return createHash('sha256').update(operations.join(';')).digest('hex');}
  for(const room of ROOMS)assert.equal(digest(room.id,freshState()),digest(room.id,freshState()),room.id);
  assert.notEqual(digest('ending',{...freshState(),ending:'preserve'}),digest('ending',{...freshState(),ending:'return'}));
});
