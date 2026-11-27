// The kestrel: a small prop plane built from primitives — fuselage,
// wings, tail and a spinning propeller. No model files, no textures.
import * as THREE from 'three';

export function createPlane(scene) {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xd8402e, roughness: 0.55, metalness: 0.15 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.6, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.5, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd4e8, roughness: 0.15, metalness: 0.4 });

  // Fuselage: a tapered body pointing along -Z when yaw is 0.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.45, 5.6, 10), paint);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 10), cream);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.5;
  nose.castShadow = true;
  group.add(nose);
  // Canopy.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 8), glass);
  canopy.scale.set(0.9, 0.75, 1.5);
  canopy.position.set(0, 0.75, -0.6);
  group.add(canopy);
  // Main wings and tailplane.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.22, 1.9), cream);
  wing.position.set(0, 0.05, -0.4);
  wing.castShadow = true;
  group.add(wing);
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 1.1), paint);
  tailWing.position.set(0, 0.25, 2.5);
  group.add(tailWing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 1.3), paint);
  fin.position.set(0, 0.85, 2.5);
  group.add(fin);
  // Wingtip lights: red left, green right, lit from the start.
  const tipMatL = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
  const tipMatR = new THREE.MeshBasicMaterial({ color: 0x2aff66 });
  const tipL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), tipMatL);
  tipL.position.set(-5.5, 0.05, -0.4);
  group.add(tipL);
  const tipR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), tipMatR);
  tipR.position.set(5.5, 0.05, -0.4);
  group.add(tipR);
  // Propeller: hub plus two blades, spun every frame by throttle.
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8), dark);
  hub.rotation.x = Math.PI / 2;
  prop.add(hub);
  const bladeGeo = new THREE.BoxGeometry(0.28, 3.4, 0.1);
  const bladeA = new THREE.Mesh(bladeGeo, dark);
  const bladeB = new THREE.Mesh(bladeGeo, dark);
  bladeB.rotation.z = Math.PI / 2;
  prop.add(bladeA);
  prop.add(bladeB);
  prop.position.z = -4.5;
  group.add(prop);
  // Landing gear: two fixed wheels, visible on the runway.
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 1.1, -0.95, -0.6);
    group.add(wheel);
  }

  scene.add(group);

  return {
    group,
    // Place the plane: position is a THREE.Vector3, yaw/pitch/roll radians.
    pose(position, yaw, pitch, roll) {
      group.position.copy(position);
      group.rotation.set(0, 0, 0);
      group.rotateY(yaw);
      group.rotateX(-pitch);
      group.rotateZ(roll);
    },
    spinPropeller(dt, throttle) {
      prop.rotation.z += dt * (6 + throttle * 55);
    },
  };
}
