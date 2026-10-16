import {test,expect} from 'bun:test';
import {BattleInput} from '../src/v2/input.js';

function inputSurface(run){
  const savedWindow=globalThis.window,savedDocument=globalThis.document;
  const handlers={},windowHandlers={},captured=new Set();
  const joystick={style:{display:'none'},firstElementChild:{style:{}}};
  const canvas={addEventListener:(event,fn)=>handlers[event]=fn,setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)};
  globalThis.window={addEventListener:(event,fn)=>windowHandlers[event]=fn};
  globalThis.document={getElementById:()=>joystick};
  try{const input=new BattleInput(canvas,{},()=>{},()=>{});input.enabled=true;run({input,handlers,windowHandlers,joystick,captured});}
  finally{if(savedWindow===undefined)delete globalThis.window;else globalThis.window=savedWindow;if(savedDocument===undefined)delete globalThis.document;else globalThis.document=savedDocument;}
}

test('a second finger cannot take over or release the movement finger',()=>inputSurface(({input,handlers,joystick})=>{
  handlers.pointerdown({pointerId:1,pointerType:'touch',button:0,clientX:80,clientY:500});
  handlers.pointermove({pointerId:1,clientX:122,clientY:500});expect(input.direction({})).toEqual({x:1,z:0});
  handlers.pointerdown({pointerId:2,pointerType:'touch',button:0,clientX:310,clientY:600});
  handlers.pointerup({pointerId:2});expect(input.direction({})).toEqual({x:1,z:0});expect(joystick.style.display).toBe('block');
  handlers.pointerup({pointerId:1});expect(input.direction({})).toEqual({x:0,z:0});expect(joystick.style.display).toBe('none');
}));

test('rotating or losing touch capture releases movement and its captured pointer',()=>inputSurface(({input,handlers,windowHandlers,captured})=>{
  handlers.pointerdown({pointerId:3,pointerType:'touch',button:0,clientX:80,clientY:500});
  handlers.pointermove({pointerId:3,clientX:80,clientY:540});windowHandlers.resize();
  expect(input.direction({})).toEqual({x:0,z:0});expect(captured.size).toBe(0);
  handlers.pointerdown({pointerId:4,pointerType:'touch',button:0,clientX:80,clientY:500});handlers.lostpointercapture({pointerId:4});
  expect(input.pointer).toBe(null);expect(captured.size).toBe(0);
}));
