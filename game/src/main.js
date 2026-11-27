// Kestrel Ridge Run — game loop, flight model and mission state.
// Start on the runway, fly the eight gold rings out over the island,
// then land back on the runway. Crash into the ground, stall out, or
// run dry on fuel and the sortie is over.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createWorld } from './world.js';
import { createPlane } from './plane.js';
import { createRings } from './rings.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1) || 1;
const shot = params.get('shot') || '';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 3000);

const world = createWorld(scene, seed);
const plane = createPlane(scene);
const rings = createRings(scene, world);
const input = createInput(canvas);
const hud = createHud();
const audio = createAudio();

const RUNWAY = CONFIG.runway;
const START_POS = new THREE.Vector3(RUNWAY.x, RUNWAY.height + 1.6, 470);
const START_YAW = 0; // face north (-Z), down the runway toward the rings

const flight = {
  mode: 'start', // start | playing | paused | crashed | landed
  pos: START_POS.clone(),
  yaw: START_YAW,
  pitch: 0,
  roll: 0,
  speed: 0,
  throttle: 0,
  fuel: CONFIG.fuelStart,
  score: 0,
  time: 0,
  airborne: false, // true once the plane has left the ground: only then can it land
  message: 'Fly through the gold rings, then land on the runway.',
  crashed: false,
};

function resetFlight(atPos, yaw, speed, throttle) {
  flight.pos.copy(atPos || START_POS);
  flight.yaw = yaw ?? START_YAW;
  flight.pitch = 0;
  flight.roll = 0;
  flight.speed = speed ?? 0;
  flight.throttle = throttle ?? 0;
  flight.fuel = CONFIG.fuelStart;
  flight.score = 0;
  flight.time = 0;
  flight.airborne = (atPos && atPos.y > RUNWAY.height + 10) || speed > 30;
  flight.crashed = false;
  rings.reset();
}

function startGame() {
  audio.start();
  resetFlight();
  flight.mode = 'playing';
  flight.throttle = 0.55;
  flight.message = 'Full throttle! First ring straight ahead.';
  hud.hideOverlays();
  snapCamera();
}

function endGame(title, statsHtml) {
  flight.mode = flight.crashed ? 'crashed' : 'landed';
  audio.stopHum();
  hud.showEnd(title, statsHtml);
}

function statsHtml() {
  const t = Math.floor(flight.time);
  return [
    `Score: <b>${flight.score}</b>`,
    `Rings: <b>${rings.passedCount}/${rings.count}</b>`,
    `Time: <b>${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}</b>`,
    `Fuel left: <b>${Math.max(0, Math.round(flight.fuel))}%</b>`,
  ].join('<br>');
}

function crash(reason) {
  if (flight.mode !== 'playing') return;
  flight.crashed = true;
  flight.message = reason;
  audio.crash();
  endGame('Crashed!', `${reason}<br><br>${statsHtml()}`);
}

function land() {
  const bonus = rings.allPassed ? CONFIG.landingScore : 150;
  const fuelBonus = Math.round(flight.fuel) * 2;
  const timeBonus = Math.max(0, Math.round(240 - flight.time)) * 2;
  flight.score += bonus + fuelBonus + timeBonus;
  flight.message = rings.allPassed ? 'Mission complete — welcome home.' : 'Down safe, but rings were left behind.';
  audio.land();
  endGame(
    rings.allPassed ? 'Mission Complete!' : 'Landed',
    `${flight.message}<br>Landing bonus: <b>${bonus}</b> · Fuel bonus: <b>${fuelBonus}</b> · Time bonus: <b>${timeBonus}</b><br><br>${statsHtml()}`,
  );
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

hud.onStart(startGame);
hud.onAgain(() => {
  resetFlight();
  flight.mode = 'start';
  hud.showStart();
});
window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' && flight.mode === 'start') startGame();
  if (event.code === 'KeyR' && (flight.mode === 'crashed' || flight.mode === 'landed')) {
    resetFlight();
    flight.mode = 'start';
    hud.showStart();
  }
  if (event.code === 'KeyP' && flight.mode === 'playing') {
    flight.mode = 'paused';
    flight.message = 'Paused — press P to keep flying.';
  } else if (event.code === 'KeyP' && flight.mode === 'paused') {
    flight.mode = 'playing';
  }
  if (event.code === 'KeyM') {
    const muted = audio.toggleMute();
    flight.message = muted ? 'Sound off (M to turn it back on).' : 'Sound on.';
  }
});

function forwardVector() {
  // Nose direction from yaw and pitch (yaw 0 = -Z, yaw PI = +Z).
  return new THREE.Vector3(
    -Math.sin(flight.yaw) * Math.cos(flight.pitch),
    Math.sin(flight.pitch),
    -Math.cos(flight.yaw) * Math.cos(flight.pitch),
  );
}

function updateFlight(dt) {
  // Throttle: Shift/R to spool up, Ctrl/F to spool down, wheel too.
  if (input.throttleUp()) flight.throttle = Math.min(1, flight.throttle + dt * 0.45);
  if (input.throttleDown()) flight.throttle = Math.max(0, flight.throttle - dt * 0.6);
  const wheel = input.takeWheel();
  if (wheel) flight.throttle = Math.max(0, Math.min(1, flight.throttle - wheel * 0.0004));

  // On the runway, the plane only rolls once the throttle is up.
  const onGround = flight.pos.y <= RUNWAY.height + 1.7
    && Math.abs(flight.pos.x) < RUNWAY.halfWidth + 4
    && flight.pos.z > RUNWAY.zStart - 10 && flight.pos.z < RUNWAY.zEnd + 10;
  const targetSpeed = flight.throttle * CONFIG.maxSpeed - Math.sin(flight.pitch) * CONFIG.climbPenalty;
  flight.speed += (Math.max(0, targetSpeed) - flight.speed) * Math.min(1, 0.45 * dt);
  if (onGround && flight.speed < 26) {
    // Rolling down the strip: no pitch authority yet, stay on the ground.
    flight.pitch = 0;
  } else if (!flight.airborne && flight.speed > 26) {
    // Take-off assist: once fast, the nose comes up on its own and the
    // plane climbs out until it is properly airborne (10 m up), even
    // after it leaves the strip — the pilot then flies it by hand.
    flight.pitch += (0.18 - flight.pitch) * Math.min(1, 2 * dt);
    const targetRoll = input.rollInput() * CONFIG.maxRoll;
    flight.roll += (targetRoll - flight.roll) * Math.min(1, 3.2 * dt);
  } else {
    const targetPitch = input.pitchInput() * CONFIG.maxPitch;
    const targetRoll = input.rollInput() * CONFIG.maxRoll;
    flight.pitch += (targetPitch - flight.pitch) * Math.min(1, 3.2 * dt);
    flight.roll += (targetRoll - flight.roll) * Math.min(1, 3.2 * dt);
  }
  // Banking turns the plane; the turn bites harder the faster you fly.
  const speedFactor = Math.max(0.25, Math.min(1, flight.speed / CONFIG.cruiseSpeed));
  flight.yaw -= flight.roll * CONFIG.turnRate * speedFactor * dt;

  // Stall: too slow and the nose drops on its own.
  if (flight.speed < CONFIG.stallSpeed && !onGround) {
    flight.pitch = Math.max(flight.pitch - 0.45 * dt, -0.5);
  }

  const fwd = forwardVector();
  flight.pos.addScaledVector(fwd, flight.speed * dt);
  if (flight.pos.y > CONFIG.ceiling) {
    flight.pos.y = CONFIG.ceiling;
    flight.pitch = Math.min(flight.pitch, 0);
  }
  if (flight.pos.y > RUNWAY.height + 10) flight.airborne = true;

  flight.fuel -= flight.throttle * CONFIG.fuelDrain * dt;
  flight.time += dt;

  // Rings.
  if (rings.checkPass(flight.pos)) {
    flight.score += CONFIG.ringScore;
    flight.fuel = Math.min(100, flight.fuel + CONFIG.fuelPerRing);
    audio.ring();
    flight.message = rings.allPassed
      ? 'All rings! Turn back and land on the runway.'
      : `Ring ${rings.passedCount} of ${rings.count} — nice flying!`;
  }

  // Ground and runway.
  const ground = world.heightAt(flight.pos.x, flight.pos.z);
  const overRunway = Math.abs(flight.pos.x) < RUNWAY.halfWidth
    && flight.pos.z > RUNWAY.zStart && flight.pos.z < RUNWAY.zEnd;
  if (overRunway && flight.airborne && flight.pos.y <= RUNWAY.height + 1.7 && flight.speed < 46 && Math.abs(flight.pitch) < 0.22) {
    // Landing roll-out: bleed speed, stay level, stop to finish.
    flight.pos.y = RUNWAY.height + 1.6;
    flight.speed = Math.max(0, flight.speed - 22 * dt);
    flight.pitch = 0;
    flight.roll *= 0.9;
    if (flight.speed < 12) {
      land();
      return;
    }
  } else if (flight.pos.y < ground + 1.6) {
    flight.pos.y = ground + 1.6;
    crash('You hit the ground.');
    return;
  }

  if (flight.fuel <= 0) {
    flight.fuel = 0;
    flight.throttle = 0;
    flight.message = 'Fuel empty — gliding. Find the runway!';
    if (flight.speed < 12 && flight.pos.y < ground + 6) crash('Out of fuel.');
  }
  audio.setThrottle(flight.throttle, flight.speed / CONFIG.maxSpeed);
}

const cameraTarget = new THREE.Vector3();
const desiredCam = new THREE.Vector3();
let orbitAngle = -0.72; // so the cover shot ends up south of the plane

function desiredCameraPosition() {
  const fwd = forwardVector();
  if (flight.mode === 'start' || flight.mode === 'landed' || flight.mode === 'crashed') {
    const r = 30;
    desiredCam.set(
      flight.pos.x + Math.sin(orbitAngle) * r,
      flight.pos.y + 14,
      flight.pos.z + Math.cos(orbitAngle) * r,
    );
  } else {
    // Chase camera: behind and above the plane.
    desiredCam.copy(flight.pos).addScaledVector(fwd, -19).add(new THREE.Vector3(0, 5.5, 0));
  }
  return desiredCam;
}

function snapCamera() {
  camera.position.copy(desiredCameraPosition());
}

function updateCamera(dt) {
  const fwd = forwardVector();
  if (flight.mode === 'start') {
    // Slow orbit around the parked plane on the runway.
    orbitAngle += dt * 0.12;
  }
  desiredCameraPosition();
  camera.position.lerp(desiredCam, Math.min(1, 6 * dt));
  if (flight.mode === 'start' || flight.mode === 'landed' || flight.mode === 'crashed') {
    // Look past the plane, so it sits below the title/results card.
    const ahead = forwardVector().multiplyScalar(30);
    camera.lookAt(flight.pos.x + ahead.x, flight.pos.y + 12, flight.pos.z + ahead.z);
    return;
  }
  cameraTarget.copy(flight.pos).addScaledVector(fwd, 34);
  cameraTarget.y += 1.5;
  camera.lookAt(cameraTarget);
}

function updateHud() {
  const headingDeg = ((-(flight.yaw * 180) / Math.PI) % 360 + 360) % 360;
  hud.update(
    {
      alt: flight.pos.y - world.heightAt(flight.pos.x, flight.pos.z),
      speed: flight.speed,
      headingDeg,
      throttle: flight.throttle,
      fuel: flight.fuel,
      score: flight.score,
      ringsPassed: rings.passedCount,
      ringTotal: rings.count,
      time: flight.time,
      message: flight.message,
    },
    camera,
    flight.mode === 'playing' ? rings.nextPosition() : null,
  );
}

// --- Screenshot states -------------------------------------------------
// ?shot=start shows the title screen, ?shot=play drops the plane into
// the course mid-flight, ?shot=end shows the landed results screen.
// ?seed=N rebuilds the same island. These are the game's own states,
// used by shots.json to take the entry screenshots.
if (shot === 'play') {
  // Seed 7 drops the plane by the mountain ring instead, for a second
  // in-flight screenshot with different terrain in frame.
  const mountainShot = seed === 7;
  resetFlight(
    mountainShot ? new THREE.Vector3(-150, 125, -160) : new THREE.Vector3(20, 62, 190),
    mountainShot ? Math.PI / 4 : 0,
    58,
    0.72,
  );
  flight.mode = 'playing';
  flight.time = mountainShot ? 96 : 38;
  flight.score = mountainShot ? 750 : 300;
  flight.message = mountainShot ? 'Ring 6 of 8 — around the mountain!' : 'Ring 3 of 8 — nice flying!';
  rings.checkPass(new THREE.Vector3(70, world.heightAt(70, 260) + 26, 260));
  rings.checkPass(new THREE.Vector3(-90, world.heightAt(-90, 120) + 26, 120));
  if (mountainShot) {
    rings.checkPass(new THREE.Vector3(50, world.heightAt(50, -40) + 26, -40));
    rings.checkPass(new THREE.Vector3(-150, world.heightAt(-150, -180) + 26, -180));
    rings.checkPass(new THREE.Vector3(-230, world.heightAt(-230, -300) + 26, -300));
  }
  hud.hideOverlays();
} else if (shot === 'end') {
  resetFlight();
  flight.mode = 'landed';
  flight.score = 1740;
  flight.time = 142;
  flight.fuel = 41;
  rings.reset();
  for (let i = 0; i < 8; i++) rings.checkPass(rings.nextPosition());
  hud.showEnd('Mission Complete!', `All rings flown, wheels down on the runway.<br><br>${statsHtml()}`);
} else {
  hud.showStart();
}
snapCamera();

const clock = new THREE.Clock();
// Debug hook for local play-testing: lets a test driver read and move
// the plane. It holds no secrets and changes nothing about the game.
window.__flight = flight;
window.__rings = rings;
window.__world = world;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (flight.mode === 'playing') updateFlight(dt);
  if (flight.mode !== 'paused') {
    world.update(dt);
    rings.update(dt, clock.elapsedTime);
    plane.pose(flight.pos, flight.yaw, flight.pitch, flight.roll);
    plane.spinPropeller(dt, flight.mode === 'playing' ? flight.throttle : 0.15);
  }
  updateCamera(dt);
  updateHud();
  renderer.render(scene, camera);
}
frame();
