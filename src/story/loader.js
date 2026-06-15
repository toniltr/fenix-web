import * as THREE from 'three';

/**
 * Carga, indexa y transforma una historia Fenix (schema 2.x).
 *
 * Punto crítico = conversión de coordenadas. El JSON guarda transforms en
 * espacio UE (cm, Z-up, left-handed). Tus .glb exportados con el glTF Exporter
 * ya vienen en espacio glTF (m, Y-up, right-handed). Para que un item del JSON
 * caiga donde toca dentro del modelo, aplicamos AQUÍ la misma conversión.
 *
 * Si algo aparece girado o reflejado, ajusta SOLO estas dos funciones contra
 * un item conocido (p.ej. una puerta). Es el único sitio que toca tocar.
 */

export const UE_SCALE = 0.01; // cm -> m (igual que "Export Uniform Scale: 0.01")

/** UE (X fwd, Y right, Z up) -> three (Y up, right-handed). */
export function ueVecToThree(v) {
  return new THREE.Vector3(v.x * UE_SCALE, v.z * UE_SCALE, -v.y * UE_SCALE);
}

/** pitch=Y, yaw=Z, roll=X en UE (grados). Verifica signos contra una puerta. */
export function ueRotToThree({ pitch = 0, yaw = 0, roll = 0 } = {}) {
  const d = THREE.MathUtils.degToRad;
  const e = new THREE.Euler(d(pitch), d(-yaw), d(roll), 'YXZ');
  return new THREE.Quaternion().setFromEuler(e);
}

/** Aplica un bloque placement {location,rotation,scale} a un Object3D. */
export function applyPlacement(obj, placement) {
  if (!placement) return obj;
  obj.position.copy(ueVecToThree(placement.location ?? { x: 0, y: 0, z: 0 }));
  obj.quaternion.copy(ueRotToThree(placement.rotation));
  const s = placement.scale ?? { x: 1, y: 1, z: 1 };
  obj.scale.set(s.x, s.y, s.z); // escala uniforme, sin swap de ejes
  return obj;
}

export async function loadStory(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No pude cargar la historia: ${url} (${res.status})`);
  return res.json();
}

/** Construye índices por uuid para acceso O(1). */
export function indexStory(story) {
  const byUuid = (arr) => new Map((arr ?? []).map((x) => [x.uuid, x]));
  return {
    story,
    settings: story.settings ?? {},
    startScene: story.start_scene,
    scenes: byUuid(story.scenes),
    characters: byUuid(story.characters),
    dialogues: byUuid(story.dialogues),
    routines: byUuid(story.routines),
    quests: byUuid(story.quests),
    items: byUuid(story.items),   // catálogo de items
    stats: byUuid(story.stats),   // catálogo de stats
    player: (story.characters ?? []).find((c) => c.is_player) ?? null,
    getScene(uuid) { return this.scenes.get(uuid); },
  };
}
