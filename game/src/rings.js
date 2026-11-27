// The mission rings: eight glowing hoops strung out from the runway,
// over the valley and around the north-west mountain, then back.
// Each ring hangs a fixed height above the ground beneath it, so the
// course is always flyable. Only the next ring is gold; passed rings
// turn green and the rest stay dim blue.
import * as THREE from 'three';
import { CONFIG } from './config.js';

const PATH = [
  [70, 260],
  [-90, 120],
  [50, -40],
  [-150, -180],
  [-230, -300],
  [-40, -430],
  [170, -290],
  [210, -90],
];

export function createRings(scene, world) {
  const meshes = [];
  const passed = new Array(CONFIG.ringCount).fill(false);
  let nextIndex = 0;

  const gold = new THREE.MeshStandardMaterial({
    color: 0xffb020, emissive: 0xff9500, emissiveIntensity: 1.4, roughness: 0.4,
  });
  const dim = new THREE.MeshStandardMaterial({
    color: 0x3a6fd8, emissive: 0x1a3a8a, emissiveIntensity: 0.7, roughness: 0.4,
  });
  const done = new THREE.MeshStandardMaterial({
    color: 0x2ecc71, emissive: 0x1d8a4a, emissiveIntensity: 0.9, roughness: 0.4,
  });

  PATH.forEach(([x, z], i) => {
    const y = world.heightAt(x, z) + 26;
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(CONFIG.ringRadius, 1.3, 10, 40), dim.clone());
    mesh.position.set(x, y, z);
    // Face the ring along the course: look at the previous point.
    const prev = i === 0 ? [0, 430] : PATH[i - 1];
    mesh.lookAt(new THREE.Vector3(prev[0], y, prev[1]));
    scene.add(mesh);
    meshes.push(mesh);
  });

  function paint() {
    meshes.forEach((mesh, i) => {
      if (passed[i]) mesh.material = done;
      else if (i === nextIndex) mesh.material = gold;
      else mesh.material = dim;
    });
    // A light beam over the next ring, so the pilot can spot it from far.
    if (nextIndex < meshes.length) {
      beam.visible = true;
      beam.position.set(meshes[nextIndex].position.x, meshes[nextIndex].position.y + 45, meshes[nextIndex].position.z);
    } else {
      beam.visible = false;
    }
  }

  // Tall translucent beam marking the next ring.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 160, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffb020, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  scene.add(beam);
  paint();

  return {
    get nextIndex() {
      return nextIndex;
    },
    get count() {
      return CONFIG.ringCount;
    },
    get passedCount() {
      return passed.filter(Boolean).length;
    },
    get allPassed() {
      return nextIndex >= CONFIG.ringCount;
    },
    nextPosition() {
      if (nextIndex >= meshes.length) return null;
      return meshes[nextIndex].position;
    },
    reset() {
      passed.fill(false);
      nextIndex = 0;
      paint();
    },
    // True when the plane flew through the next ring.
    checkPass(position) {
      if (nextIndex >= meshes.length) return false;
      const ring = meshes[nextIndex].position;
      if (position.distanceTo(ring) < CONFIG.ringRadius - 1) {
        passed[nextIndex] = true;
        nextIndex += 1;
        paint();
        return true;
      }
      return false;
    },
    update(dt, time) {
      // The next ring breathes; passed rings sit still.
      if (nextIndex < meshes.length) {
        const s = 1 + Math.sin(time * 3.2) * 0.06;
        meshes[nextIndex].scale.setScalar(s);
      }
    },
  };
}
