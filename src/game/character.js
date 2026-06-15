import * as THREE from 'three';

/**
 * Personaje provisional. NO es animación esqueletal real: es un placeholder
 * que "respira" con animación procedural, para que veas el coste de tener
 * algo animándose cada frame sin montar todavía el pipeline UE5 -> glTF.
 * Cuando tengas un personaje real, esto se sustituye por GLTFLoader +
 * AnimationMixer.
 */
export function buildCharacter(scene, x, z) {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.7, 4, 12),
    new THREE.MeshStandardMaterial({ color: '#5a6b8c', roughness: 0.8 }),
  );
  torso.position.y = 0.7;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 16),
    new THREE.MeshStandardMaterial({ color: '#8b97b3', roughness: 0.7 }),
  );
  head.position.y = 1.35;
  head.castShadow = true;
  //group.add(head);

  group.position.set(x, 0, z);
 // scene.add(group);

  return {
    group,
    update(now) {
      const b = Math.sin(now * 0.002);
      torso.scale.y = 1 + b * 0.03;
      head.position.y = 1.35 + b * 0.03;
      group.rotation.y = Math.sin(now * 0.0007) * 0.3;
    },
  };
}
