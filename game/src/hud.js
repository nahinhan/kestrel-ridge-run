// The HUD: DOM instruments over the 3D canvas — altitude, speed,
// heading with a compass strip, throttle and fuel bars, score, rings,
// time, a message line, a navigation arrow to the next ring, and the
// start / end overlays. Plain DOM, so it stays crisp in screenshots.
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);

function compassStrip(headingDeg) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  let out = '';
  for (let d = -45; d <= 45; d += 15) {
    const h = ((Math.round(headingDeg) + d) % 360 + 360) % 360;
    const label = h % 45 === 0 ? points[Math.round(h / 45) % 8] : String(h);
    out += `<span style="opacity:${d === 0 ? 1 : 0.55}">${label}</span>`;
  }
  return out;
}

export function createHud() {
  const els = {
    alt: $('hud-alt'),
    spd: $('hud-spd'),
    hdg: $('hud-hdg'),
    compass: $('hud-compass'),
    score: $('hud-score'),
    rings: $('hud-rings'),
    time: $('hud-time'),
    thr: $('hud-thr'),
    fuel: $('hud-fuel'),
    msg: $('hud-msg'),
    arrow: $('nav-arrow'),
    start: $('overlay-start'),
    end: $('overlay-end'),
    endTitle: $('end-title'),
    endStats: $('end-stats'),
    startBtn: $('start-btn'),
    againBtn: $('again-btn'),
  };

  return {
    // state: {alt, speed, headingDeg, throttle, fuel, score, ringsPassed,
    //   ringTotal, time, message} — camera + ringPos are THREE objects
    // used to place the navigation arrow.
    update(state, camera, ringPos) {
      els.alt.textContent = `${Math.max(0, Math.round(state.alt))} m`;
      els.spd.textContent = `${Math.round(state.speed * 3.6)} km/h`;
      els.hdg.textContent = `${String(Math.round(state.headingDeg)).padStart(3, '0')}°`;
      els.compass.innerHTML = compassStrip(state.headingDeg);
      els.score.textContent = String(state.score);
      els.rings.textContent = `${state.ringsPassed}/${state.ringTotal}`;
      const t = Math.floor(state.time);
      els.time.textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      els.thr.style.width = `${Math.round(state.throttle * 100)}%`;
      els.fuel.style.width = `${Math.max(0, Math.round(state.fuel))}%`;
      els.fuel.style.background = state.fuel < 25 ? '#e33' : '#3c6';
      els.msg.textContent = state.message || '';
      // Navigation arrow: point at the next ring on screen, or at the
      // screen edge in its direction when it is behind the camera.
      if (ringPos && camera) {
        const v = ringPos.clone().project(camera);
        const behind = v.z > 1;
        let nx = behind ? -v.x : v.x;
        let ny = behind ? -v.y : v.y;
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;
        const angle = Math.atan2(-ny, nx);
        els.arrow.style.display = 'block';
        els.arrow.style.left = `calc(50% + ${nx * 150}px)`;
        els.arrow.style.top = `calc(50% + ${-ny * 110}px)`;
        els.arrow.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
        els.arrow.style.opacity = behind ? '0.65' : '1';
      } else {
        els.arrow.style.display = 'none';
      }
    },
    showStart() {
      els.start.classList.remove('hidden');
      els.end.classList.add('hidden');
    },
    showEnd(title, statsHtml) {
      els.endTitle.textContent = title;
      els.endStats.innerHTML = statsHtml;
      els.end.classList.remove('hidden');
      els.start.classList.add('hidden');
    },
    hideOverlays() {
      els.start.classList.add('hidden');
      els.end.classList.add('hidden');
    },
    onStart(fn) {
      els.startBtn.addEventListener('click', fn);
    },
    onAgain(fn) {
      els.againBtn.addEventListener('click', fn);
    },
  };
}

// Keep THREE imported for the projection math above (tree-shaken in the
// dossier outline only by name; the import is used at run time).
void THREE;
