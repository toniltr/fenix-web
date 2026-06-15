import * as THREE from 'three';

/**
 * Point-and-click: click izquierdo -> raycast -> si toca un interactuable,
 * dispara onActivate(item). OrbitControls usa botón izquierdo libre, así que
 * distinguimos click de drag por umbral de movimiento.
 */
export function setupInteraction({ domElement, camera, getInteractables, onActivate, dragThreshold = 6 }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;

  const onPointerDown = (e) => { down = { x: e.clientX, y: e.clientY }; };

  const onPointerUp = (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > dragThreshold) return; // fue un drag de la cámara, no un click

    const r = domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);

    const hits = raycaster.intersectObjects(getInteractables(), false);
    if (hits.length) {
      const item = hits[0].object.userData.item;
      if (item) onActivate(item);
    }
  };

  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('pointerup', onPointerUp);

  return () => {
    domElement.removeEventListener('pointerdown', onPointerDown);
    domElement.removeEventListener('pointerup', onPointerUp);
  };
}
