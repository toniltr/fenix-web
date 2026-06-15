import * as THREE from 'three';

/**
 * Convierte nodos concretos de una room (cargada como un solo glTF) en
 * hotspots interactivos al estilo point-and-click:
 *  - se resaltan al pasar el cursor por encima (emisivo) y muestran 'pointer'
 *  - lanzan una accion (onClick) al hacer clic
 *
 * El decorado (paredes, suelo) se queda como esta; solo los nodos que
 * registres aqui reaccionan.
 *
 * Uso (en main.js, tras cargar la room):
 *   const hotspots = createInteractables(renderer, camera);
 *   loadStaticMesh(...).then((model) => {
 *     hotspots.register(model, 'SM_Bed', {
 *       label: 'Cama',
 *       onClick: () => console.log('clic en la cama'),
 *     });
 *   });
 */
export function createInteractables(renderer, camera) {
  const dom = renderer.domElement;
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // Lista de hotspots: { object, label, onClick, _mats }
  const spots = [];
  let hovered = null;

  // Busca un nodo por nombre dentro de un modelo y lo registra como hotspot.
  function register(model, nodeName, { label = nodeName, onClick = null } = {}) {
    const node = model.getObjectByName(nodeName);
    if (!node) {
      console.warn(`[fenix] no se encontro el nodo "${nodeName}" en la room`);
      return null;
    }
    // Guardar referencia a los materiales para poder resaltar/restaurar.
    const meshes = [];
    node.traverse((o) => {
      if (o.isMesh) {
        o.userData._hotspotRoot = node; // para subir desde la malla al nodo
        meshes.push(o);
      }
    });
    const spot = { object: node, meshes, label, onClick };
    spots.push(spot);
    return spot;
  }

  function setPointer(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  // Devuelve el hotspot bajo el cursor, o null.
  function pick(e) {
    setPointer(e);
    ray.setFromCamera(pointer, camera);
    const allMeshes = spots.flatMap((s) => s.meshes);
    const hits = ray.intersectObjects(allMeshes, false);
    if (!hits.length) return null;
    const root = hits[0].object.userData._hotspotRoot;
    return spots.find((s) => s.object === root) || null;
  }

  // Resaltado: sube un poco el emisivo del nodo.
  function setHighlight(spot, on) {
    spot.meshes.forEach((m) => {
      if (!m.material) return;
      if (on) {
        m.material.emissive?.setHex?.(0x332200);
      } else {
        m.material.emissive?.setHex?.(0x000000);
      }
    });
  }

  dom.addEventListener('pointermove', (e) => {
    const spot = pick(e);
    if (spot !== hovered) {
      if (hovered) setHighlight(hovered, false);
      if (spot) setHighlight(spot, true);
      hovered = spot;
      dom.style.cursor = spot ? 'pointer' : '';
    }
  });

  dom.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const spot = pick(e);
    if (spot && spot.onClick) spot.onClick(spot);
  });

  return { register, spots };
}
