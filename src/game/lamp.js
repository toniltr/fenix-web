import * as THREE from 'three';

/**
 * La lámpara: objeto estrella de la PoC. Es un Group de mallas, un cuerpo
 * dinámico (se puede agarrar y empujar) y una PointLight que la acompaña.
 * Esa PointLight es la ÚNICA luz que proyecta sombras en tiempo real; al
 * arrastrar la lámpara, las sombras de la sala se recalculan cada frame.
 */
export function buildLamp(scene, physics, x, y, z) {
  const { RAPIER, world, link } = physics;

  const g = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 0.12, 20),
    new THREE.MeshStandardMaterial({
      color: '#2a2f37',
      roughness: 0.6,
      metalness: 0.4,
    }),
  );
  base.position.y = 0.06;
  base.castShadow = true;
  g.add(base);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.7, 12),
    new THREE.MeshStandardMaterial({
      color: '#3a4049',
      roughness: 0.5,
      metalness: 0.5,
    }),
  );
  stem.position.y = 0.42;
  stem.castShadow = true;
  g.add(stem);

  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.4, 24, 1, true),
    new THREE.MeshStandardMaterial({
      color: '#ffb347',
      roughness: 0.4,
      emissive: '#ffb347',
      emissiveIntensity: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  shade.position.y = 0.82;
  shade.castShadow = true;
  g.add(shade);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 12),
    new THREE.MeshStandardMaterial({
      color: '#fff4d6',
      emissive: '#ffd98a',
      emissiveIntensity: 2.5,
    }),
  );
  bulb.position.y = 0.78;
  g.add(bulb);

  g.position.set(x, y, z);
  scene.add(g);

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinearDamping(0.4),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.3, 0.5, 0.3).setDensity(2).setFriction(1.0),
    body,
  );

  const light = new THREE.PointLight('#ffb347', 26, 16, 1.6);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0015;
  scene.add(light);

  const rec = link(g, body, { grabbable: true, isLamp: true });
  rec.light = light;

  // Mantiene la luz pegada a la lámpara. Llamar tras physics.step().
  rec.syncLight = () => {
    light.position.set(g.position.x, g.position.y + 0.8, g.position.z);
  };

  return rec;
}
