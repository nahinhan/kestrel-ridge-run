// The island: terrain, sea, runway, trees, rocks, clouds and light.
// heightAt(x, z) is the single source of truth for the ground — the
// plane, the rings and the crash check all ask it the same question.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeNoise2D, mulberry32 } from './random.js';

const SIZE = CONFIG.worldSize;
const HALF = SIZE / 2;

export function createWorld(scene, seed) {
  const noise = makeNoise2D(seed);
  const rand = mulberry32(seed + 77);
  const runway = CONFIG.runway;

  function rawHeight(x, z) {
    // Broad hills, a tall mountain in the north-west, a beach in the south.
    const hills = noise(x * 0.004 + 10, z * 0.004 + 10);
    const bumps = noise(x * 0.013 + 40, z * 0.013 + 40);
    let h = 3 + hills * 32 + bumps * 10;
    const dx = x + 260;
    const dz = z + 280;
    h += 72 * Math.exp(-(dx * dx + dz * dz) / (2 * 190 * 190));
    // A second ridge in the south-east, so the island reads from any side.
    const ex = x - 300;
    const ez = z + 60;
    h += 30 * Math.exp(-(ex * ex + ez * ez) / (2 * 160 * 160));
    // The sea eats the southern edge into a beach.
    if (z > 480) h -= (z - 480) * 0.09;
    h = Math.max(0.4, h);
    // A valley along the flight corridor (the runway's north approach
    // and the ring route): the take-off climb-out stays clear, and the
    // course reads as a valley run between higher ground.
    const vx = Math.max(0, Math.abs(x) - 100);
    const vz = Math.max(0, Math.max(-460 - z, z - 300));
    const valley = Math.min(1, Math.hypot(vx, vz) / 120);
    const ve = valley * valley * (3 - 2 * valley);
    return 3 + (h - 3) * (0.35 + 0.65 * ve);
  }

  function heightAt(x, z) {
    // The runway strip is exactly flat; the ground blends back to the
    // island's hills over 45 m beyond the strip's rectangle.
    const flatHalf = runway.halfWidth + 8;
    const z0 = runway.zStart - 10;
    const z1 = runway.zEnd + 10;
    if (Math.abs(x) < flatHalf && z > z0 && z < z1) return runway.height;
    const dx = Math.max(0, Math.abs(x) - flatHalf);
    const dz = Math.max(0, Math.max(z0 - z, z - z1));
    const t = Math.min(1, Math.hypot(dx, dz) / 45);
    const edge = t * t * (3 - 2 * t);
    return rawHeight(x, z) * edge + runway.height * (1 - edge);
  }

  // --- Sky, fog and light -------------------------------------------
  scene.background = new THREE.Color(0x8ec3e8);
  scene.fog = new THREE.Fog(0x9fc8e8, 260, 1050);
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5d7a4a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 2.1);
  sun.position.set(220, 320, 140);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -320;
  sun.shadow.camera.right = 320;
  sun.shadow.camera.top = 320;
  sun.shadow.camera.bottom = -320;
  sun.shadow.camera.far = 900;
  scene.add(sun);
  scene.add(sun.target);

  // --- Terrain -------------------------------------------------------
  const segments = 120;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const grass = new THREE.Color(0x5d8a3c);
  const dry = new THREE.Color(0x9aa050);
  const rock = new THREE.Color(0x7d7a72);
  const sand = new THREE.Color(0xd8c28a);
  const snow = new THREE.Color(0xe8eef2);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const n = noise(x * 0.02 + 3, z * 0.02 + 3);
    if (h < 2.2) tmp.copy(sand);
    else if (h > 85) tmp.copy(snow).lerp(rock, 0.35);
    else if (h > 50) tmp.copy(rock).lerp(grass, 0.3 + n * 0.25);
    else if (h > 38) tmp.copy(rock).lerp(grass, 0.35);
    else tmp.copy(grass).lerp(dry, n * 0.55);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  );
  terrain.receiveShadow = true;
  scene.add(terrain);

  // --- Sea ------------------------------------------------------------
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE * 3, SIZE * 3),
    new THREE.MeshStandardMaterial({
      color: 0x2a6f9e, roughness: 0.18, metalness: 0.25, transparent: true, opacity: 0.92,
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = CONFIG.waterLevel;
  scene.add(sea);

  // --- Runway ---------------------------------------------------------
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(runway.halfWidth * 2, 0.4, runway.zEnd - runway.zStart),
    new THREE.MeshStandardMaterial({ color: 0x33363b, roughness: 0.9 }),
  );
  strip.position.set(runway.x, runway.height + 0.1, (runway.zStart + runway.zEnd) / 2);
  strip.receiveShadow = true;
  scene.add(strip);
  // Centre dashes and threshold bars, as small white slabs.
  const markMat = new THREE.MeshStandardMaterial({ color: 0xf2f2e8, roughness: 0.8 });
  for (let z = runway.zStart + 20; z < runway.zEnd - 10; z += 28) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 13), markMat);
    dash.position.set(runway.x, runway.height + 0.35, z);
    scene.add(dash);
  }
  for (const z of [runway.zStart + 8, runway.zEnd - 8]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(runway.halfWidth * 2 - 3, 0.12, 4), markMat);
    bar.position.set(runway.x, runway.height + 0.35, z);
    scene.add(bar);
  }
  // Windsock beside the runway, and a small hangar + tower.
  const sockPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 9, 6),
    new THREE.MeshStandardMaterial({ color: 0xdddddd }),
  );
  sockPole.position.set(18, runway.height + 4.5, runway.zStart + 30);
  scene.add(sockPole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 4.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.7 }),
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(20.5, runway.height + 8.4, runway.zStart + 30);
  scene.add(sock);
  const hangar = new THREE.Mesh(
    new THREE.BoxGeometry(26, 10, 18),
    new THREE.MeshStandardMaterial({ color: 0xb8452e, roughness: 0.85 }),
  );
  hangar.position.set(-30, runway.height + 5, runway.zStart + 42);
  hangar.castShadow = true;
  scene.add(hangar);
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(7, 22, 7),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.85 }),
  );
  tower.position.set(28, runway.height + 11, runway.zStart + 70);
  tower.castShadow = true;
  scene.add(tower);

  // --- Trees and rocks (instanced, seeded) ---------------------------
  const treeSpots = [];
  let guard = 0;
  while (treeSpots.length < 170 && guard++ < 4000) {
    const x = (rand() - 0.5) * (SIZE - 80);
    const z = (rand() - 0.5) * (SIZE - 80);
    const h = heightAt(x, z);
    if (h < 3 || h > 34) continue;
    if (Math.abs(x) < runway.halfWidth + 18 && z > runway.zStart - 30 && z < runway.zEnd + 30) continue;
    treeSpots.push([x, h, z, 0.8 + rand() * 0.9]);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 4, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 });
  const leafGeo = new THREE.ConeGeometry(3.2, 9, 7);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3e6b28, roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, treeSpots.length);
  const m4 = new THREE.Matrix4();
  treeSpots.forEach(([x, h, z, s], i) => {
    m4.makeScale(s, s, s);
    m4.setPosition(x, h + 2 * s, z);
    trunks.setMatrixAt(i, m4);
    m4.makeScale(s, s, s);
    m4.setPosition(x, h + (4 + 4.5) * s, z);
    leaves.setMatrixAt(i, m4);
  });
  trunks.castShadow = true;
  leaves.castShadow = true;
  scene.add(trunks);
  scene.add(leaves);

  const rockGeo = new THREE.DodecahedronGeometry(2.2, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 1 });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 70);
  for (let i = 0; i < 70; i++) {
    const x = (rand() - 0.5) * (SIZE - 60);
    const z = (rand() - 0.5) * (SIZE - 60);
    const s = 0.6 + rand() * 1.8;
    m4.makeScale(s, s * 0.7, s);
    m4.setPosition(x, heightAt(x, z) + 0.8, z);
    rocks.setMatrixAt(i, m4);
  }
  rocks.castShadow = true;
  scene.add(rocks);

  // --- Clouds (slow drift) -------------------------------------------
  // Plain white, unlit: they read as clouds against the sky at any hour.
  const clouds = [];
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 18; i++) {
    const group = new THREE.Group();
    const puffs = 3 + Math.floor(rand() * 3);
    for (let p = 0; p < puffs; p++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(8 + rand() * 9, 10, 8), cloudMat);
      s.position.set((rand() - 0.5) * 24, (rand() - 0.5) * 4, (rand() - 0.5) * 11);
      s.scale.y = 0.55;
      group.add(s);
    }
    group.position.set((rand() - 0.5) * 1100, 175 + rand() * 60, (rand() - 0.5) * 1100);
    scene.add(group);
    clouds.push(group);
  }

  return {
    heightAt,
    runway,
    update(dt) {
      for (const c of clouds) {
        c.position.x += dt * 2.2;
        if (c.position.x > HALF + 80) c.position.x = -HALF - 80;
      }
      sock.rotation.y += dt * 0.6;
    },
  };
}
