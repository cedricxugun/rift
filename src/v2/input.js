export class BattleInput{
  constructor(canvas,renderer,pause,ability){
    this.canvas=canvas;this.renderer=renderer;this.pause=pause;this.activateAbility=ability;this.keys=new Set();this.enabled=false;this.pointer=null;this.anchor=null;this.target=null;this.touch=false;
    this.joystick=document.getElementById('joystick');
    window.addEventListener('keydown',event=>{
      if(/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
      if(event.code==='Escape'||event.code==='KeyP'){this.pause();return;}
      if(event.code==='Space'&&this.enabled){event.preventDefault();if(!event.repeat)this.activateAbility();return;}
      if(event.code.startsWith('Arrow'))event.preventDefault();this.keys.add(event.code);
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clear());
    canvas.addEventListener('pointerdown',e=>{
      if(!this.enabled)return;if(e.button===2){this.activateAbility();return;}if(e.button>0)return;
      this.pointer=e.pointerId;this.touch=e.pointerType!=='mouse'||Boolean(window.__PHONE_PREVIEW__);this.anchor={x:e.clientX,y:e.clientY};this.target={...this.anchor};canvas.setPointerCapture(e.pointerId);
      if(this.touch){this.joystick.style.display='block';this.joystick.style.left=`${e.clientX}px`;this.joystick.style.top=`${e.clientY}px`;this.joystick.firstElementChild.style.transform='';}
    });
    canvas.addEventListener('pointermove',e=>{
      if(e.pointerId!==this.pointer)return;this.target={x:e.clientX,y:e.clientY};
      if(this.touch){const x=e.clientX-this.anchor.x,y=e.clientY-this.anchor.y,factor=Math.min(1,37/Math.hypot(x,y));this.joystick.firstElementChild.style.transform=`translate(${x*factor}px,${y*factor}px)`;}
    });
    canvas.addEventListener('pointerup',()=>this.release());canvas.addEventListener('pointercancel',()=>this.release());canvas.addEventListener('contextmenu',e=>e.preventDefault());
  }
  release(){this.pointer=null;this.target=null;this.anchor=null;this.joystick.style.display='none';}
  clear(){this.keys.clear();this.release();}
  direction(player){
    if(!this.enabled)return{x:0,z:0};
    let x=Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'));
    let z=Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))-Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'));
    if(!x&&!z&&this.pointer!==null&&this.target){
      if(this.touch){x=(this.target.x-this.anchor.x)/42;z=(this.target.y-this.anchor.y)/42;if(Math.hypot(x,z)<.1)return{x:0,z:0};}
      else{const target=this.renderer.screenToWorld(this.target.x,this.target.y);x=target.x-player.x;z=target.z-player.z;if(Math.hypot(x,z)<.2)return{x:0,z:0};}
    }
    const d=Math.hypot(x,z);return d>1?{x:x/d,z:z/d}:{x,z};
  }
}
