import * as THREE from 'three';
import { ROOM } from './room.js';

/**
 * Agarrar y arrastrar objetos con el raton.
 * - Boton IZQUIERDO: raycast; si toca un objeto agarrable, lo vuelve
 *   cinematico y lo arrastra sobre un plano horizontal a su altura.
 *   Al soltar, vuelve a dinamico y la fisica retoma el control.
 * - Boton DERECHO queda libre para que OrbitControls orbite la camara.
 *
 * Cursor contextual: 'grab' (mano abierta) cuando el raton esta sobre algo
 * agarrable, 'grabbing' (mano cerrada) mientras se arrastra, y normal si no.
 */
export function createInteraction(renderer, camera, physics, controls) {
  const { RAPIER } = physics;
  const dom = renderer.domElement;

  const DEFAULT_CURSOR = "url('/cursors/cursor_default.png') 0 0, auto";


  // Reparto de botones: izq. libre (para agarrar), der. orbita, rueda zoom.
  controls.mouseButtons = {
    LEFT: null,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  };

  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const hitPoint = new THREE.Vector3();
  let grabbed = null;

  const grabbables = () => physics.links.filter((l) => l.grabbable);

  function setPointer(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  function pick(e) {
    setPointer(e);
    ray.setFromCamera(pointer, camera);
    const recs = grabbables();
    const meshes = recs.map((r) => r.mesh);
    const hits = ray.intersectObjects(meshes, true);
    if (!hits.length) return null;
    // Subir desde la malla golpeada hasta el objeto registrado (la lampara es un Group).
    let o = hits[0].object;
    while (o.parent && !meshes.includes(o)) o = o.parent;
    return recs.find((r) => r.mesh === o) || null;
  }

  // Helper para fijar el cursor sobre el canvas.
  function setCursor(type) {
    dom.style.cursor = type;
  }

  dom.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const rec = pick(e);
    if (!rec) return;
    grabbed = rec;
    setCursor('grabbing'); // mano cerrada al agarrar
    rec.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    const p = rec.body.translation();
    dragPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(p.x, p.y, p.z),
    );
  });

  window.addEventListener('pointermove', (e) => {
    if (grabbed) {
      // Arrastrando: mover el objeto y mantener la mano cerrada.
      setPointer(e);
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(dragPlane, hitPoint)) {
        const x = THREE.MathUtils.clamp(hitPoint.x, -ROOM / 2 + 0.4, ROOM / 2 - 0.4);
        const z = THREE.MathUtils.clamp(hitPoint.z, -ROOM / 2 + 0.4, ROOM / 2 - 0.4);
        grabbed.body.setNextKinematicTranslation({
          x,
          y: Math.max(0.6, hitPoint.y),
          z,
        });
      }
      return;
    }

    // No se esta arrastrando: el cursor refleja si hay algo agarrable debajo.
    setCursor(pick(e) ? 'grab' : DEFAULT_CURSOR);
  });

  window.addEventListener('pointerup', () => {
    if (!grabbed) return;
    grabbed.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    grabbed.body.wakeUp();
    grabbed = null;
    setCursor(DEFAULT_CURSOR); // se actualizara al 'grab' en el siguiente move si procede
  });
}
