// Keyboard and mouse input. The game reads this state every frame;
// nothing here touches the scene, the plane, or the HUD.
export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, active: false };
  let wheelDelta = 0;
  let anyPressed = false;

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    keys.add(event.code);
    anyPressed = true;
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    mouse.active = true;
  }
  function onWheel(event) {
    event.preventDefault();
    wheelDelta += event.deltaY;
  }
  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return {
    keys,
    mouse,
    // Pitch: -1 (nose down) .. +1 (nose up). Keyboard beats mouse.
    pitchInput() {
      if (keys.has('KeyW') || keys.has('ArrowUp')) return 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) return -1;
      if (mouse.active) return -mouse.y * 0.8;
      return 0;
    },
    // Roll: -1 (bank left) .. +1 (bank right).
    rollInput() {
      if (keys.has('KeyA') || keys.has('ArrowLeft')) return -1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) return 1;
      if (mouse.active) return mouse.x * 0.9;
      return 0;
    },
    throttleUp() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyR');
    },
    throttleDown() {
      return keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyF');
    },
    // Accumulated wheel scroll since last read, then cleared.
    takeWheel() {
      const d = wheelDelta;
      wheelDelta = 0;
      return d;
    },
    takeAnyPressed() {
      const p = anyPressed;
      anyPressed = false;
      return p;
    },
  };
}
