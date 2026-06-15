import * as THREE from 'three';

/**
 * Convierte un nodo que viene dentro del .glb de una room en un objeto
 * AGARRABLE con fisica real (cuerpo dinamico de Rapier), reutilizando el
 * sistema de interaccion existente (physics.links + interaction.js).
 *
 * Maneja el detalle clave: el nodo viene anidado en el grupo de la room con
 * transforms heredados. Lo "saca" a la escena raiz conservando su posicion,
 * rotacion y escala en el mundo, para que la malla y el cuerpo coincidan.
 *
 * Uso (en main.js, tras cargar la room):
 *   loadStaticMesh(...).then((model) => {
 *     makeGrabbable(scene, physics, model, 'SM_Bed_pillow_A');
 *   });
 */
export function makeGrabbable(scene, physics, model, nodeName, opts = {}) {
  const { RAPIER, world, link } = physics;
  const { restitution = 0.1, friction = 0.8, density = 0.6 } = opts;

  const node = model.getObjectByName(nodeName);
  if (!node) {
    console.warn(`[fenix] no se encontro "${nodeName}" para hacerlo agarrable`);
    return null;
  }

  // 1) Calcular la transformacion del nodo en el MUNDO (no la local).
  model.updateWorldMatrix(true, true);
  const worldPos = new THREE.Vector3();
  const worldQuat = new THREE.Quaternion();
  const worldScale = new THREE.Vector3();
  node.matrixWorld.decompose(worldPos, worldQuat, worldScale);

  // 2) Sacar el nodo de su padre y colgarlo de la escena raiz,
  //    reaplicando su transform mundial para que no se mueva visualmente.
  scene.attach(node); // THREE.attach conserva la posicion en el mundo

  // 3) Calcular el tamano real del nodo (bounding box) para el collider.
  const box = new THREE.Box3().setFromObject(node);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // 4) Crear el cuerpo dinamico en la posicion del centro real del objeto.
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(center.x, center.y, center.z)
      .setLinearDamping(0.3),
  );

  // Collider tipo caja a partir del bounding box (aprox. suficiente).
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
      .setRestitution(restitution)
      .setFriction(friction)
      .setDensity(density),
    body,
  );

  // 5) Importante: el cuerpo fisico esta centrado en el bounding box, pero el
  //    origen del nodo (su pivote) puede no estar en ese centro. Compensamos
  //    metiendo el nodo dentro de un grupo cuyo origen SI sea el centro.
  const pivot = new THREE.Group();
  scene.add(pivot);
  pivot.position.copy(center);
  // recolocar el nodo relativo al nuevo pivote conservando posicion mundial
  node.position.sub(center);
  pivot.add(node);

  // 6) Registrar el pivote (no el nodo) para que physics sincronice bien,
  //    y marcarlo como agarrable para que interaction.js lo detecte.
  const rec = link(pivot, body, { grabbable: true });

  // Sombras, por si el nodo no las traia activas.
  node.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  console.log(`[fenix] "${nodeName}" ahora es agarrable con fisica`);
  return rec;
}
