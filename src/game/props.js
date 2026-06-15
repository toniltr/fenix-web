import * as THREE from 'three';

/**
 * Caja dinámica agarrable. Útil para llenar la sala y estresar la física
 * (botón "+10 cajas" del panel de debug). Rapier duerme las que quedan en
 * reposo, así que tener muchas quietas casi no cuesta.
 */
export function spawnBox(scene, physics, x, y, z, size = 0.5) {
  const { RAPIER, world, link } = physics;

  const color = new THREE.Color().setHSL(0.08 + Math.random() * 0.08, 0.5, 0.55);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2)
      .setRestitution(0.15)
      .setFriction(0.9),
    body,
  );

  return link(mesh, body, { grabbable: true });
}
