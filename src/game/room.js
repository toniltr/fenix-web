import * as THREE from 'three';

export const ROOM = 9; // lado de la sala (para acotar el arrastre)

/**
 * Sala: suelo, tres paredes y una mesa. Cuerpos estáticos (fixed) con collider.
 *
 * Truco de iluminación:
 *  - Las PAREDES no proyectan sombra (cast:false) -> el sol las atraviesa e
 *    ilumina toda la estancia, sin bloquearse. Pero SÍ reciben sombra
 *    (receiveShadow), así que la luz puntual de la lámpara rebota en ellas
 *    con su degradado y sus sombras.
 *  - El resto de objetos (lámpara, cajas, mesa, personaje) siguen proyectando
 *    sombra con normalidad.
 */
export function buildRoom(scene, physics) {
  const { RAPIER, world } = physics;

  function addStaticBox(w, h, d, x, y, z, color, opts = {}) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }),
    );
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;          // recibe sombra (la lámpara rebota aquí)
    mesh.castShadow = opts.cast !== false; // por defecto proyecta; paredes no
    scene.add(mesh);

    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z),
    );
    world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2), body);
    return mesh;
  }

  return { addStaticBox };
}
