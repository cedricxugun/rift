export class GameInput {
  constructor(canvas, renderer, onPause) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.keys = new Set();
    this.pointer = null;
    this.anchor = null;
    this.target = null;
    this.touch = false;
    this.enabled = false;
    this.joystick = document.getElementById('joystick');
    window.addEventListener('keydown', event => {
      if (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) event.preventDefault();
      if (event.code === 'Escape' || event.code === 'KeyP') { onPause(); return; }
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.clear());
    canvas.addEventListener('pointerdown', event => {
      if (!this.enabled || event.button > 0) return;
      this.pointer = event.pointerId;
      this.touch = event.pointerType !== 'mouse';
      this.anchor = { x: event.clientX, y: event.clientY };
      this.target = { ...this.anchor };
      canvas.setPointerCapture(event.pointerId);
      if (this.touch) {
        this.joystick.style.display = 'block';
        this.joystick.style.left = `${event.clientX}px`;
        this.joystick.style.top = `${event.clientY}px`;
        this.joystick.firstElementChild.style.transform = '';
      }
    });
    canvas.addEventListener('pointermove', event => {
      if (this.pointer !== event.pointerId) return;
      this.target = { x: event.clientX, y: event.clientY };
      if (this.touch) {
        const dx = this.target.x - this.anchor.x, dy = this.target.y - this.anchor.y;
        const length = Math.hypot(dx, dy);
        const factor = length > 35 ? 35 / length : 1;
        this.joystick.firstElementChild.style.transform = `translate(${dx * factor}px,${dy * factor}px)`;
      }
    });
    canvas.addEventListener('pointerup', () => this.release());
    canvas.addEventListener('pointercancel', () => this.release());
    canvas.addEventListener('contextmenu', event => event.preventDefault());
  }

  release() { this.pointer = null; this.target = null; this.anchor = null; this.joystick.style.display = 'none'; }
  clear() { this.keys.clear(); this.release(); }

  direction(player) {
    if (!this.enabled) return { x: 0, z: 0 };
    let x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    let z = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    if (!x && !z && this.pointer !== null && this.target) {
      if (this.touch) {
        x = (this.target.x - this.anchor.x) / 38;
        z = (this.target.y - this.anchor.y) / 38;
        if (Math.hypot(x, z) < .12) return { x: 0, z: 0 };
      } else {
        const target = this.renderer.screenToWorld(this.target.x, this.target.y);
        if (!target) return { x: 0, z: 0 };
        x = target.x - player.x; z = target.z - player.z;
        if (Math.hypot(x, z) < .2) return { x: 0, z: 0 };
      }
    }
    const magnitude = Math.hypot(x, z);
    if (magnitude > 1) { x /= magnitude; z /= magnitude; }
    return { x, z };
  }
}
