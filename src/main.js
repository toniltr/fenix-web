import { createRenderer } from './engine/renderer.js';
import { createPhysics } from './engine/physics.js';
import { createLoop } from './engine/loop.js';
import { createDebug } from './debug/debug.js';
import * as THREE from 'three';

import { buildLighting } from './game/lighting.js';
import { createInteraction } from './game/interaction.js';
import { loadStaticMesh } from './game/loadModel.js';
import { loadCharacter } from './game/loadCharacter.js';
import { createInteractables } from './game/interactables.js';

// --- capa de historia (datos -> escena) ---
import {
  loadStory,
  indexStory,
  applyPlacement,
  ueVecToThree,
  ueRotToThree,
} from './game/story/loader.js';
import { FenixState } from './game/story/gameState.js';
import { setupInteraction } from './game/story/interaction.js';

/* ------------------------------------------------------------------ *
 * EL JUEGO
 * La ESCENA la dirige la historia (fenix_prototype.v4.json): carga el
 * level_path como un modelo y solo coloca los items con logica.
 * Clic izq.: interactua/orbita · clic der.: orbita · rueda: zoom.
 * ------------------------------------------------------------------ */

const { renderer, scene, camera, controls } = createRenderer(
  document.getElementById('app'),
);
camera.position.set(7, 5.5, 8);
controls.target.set(0, 0, 0);
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 20;
controls.update();
const polar = controls.getPolarAngle();
controls.minPolarAngle = polar; // bloquea la inclinacion vertical...
controls.maxPolarAngle = polar; // ...solo rotacion izquierda-derecha

const physics = await createPhysics();
const debug = createDebug();

const daylight = buildLighting(scene, renderer); // sol + cielo + tone mapping

loadStaticMesh(scene, renderer, '/models/SM_Base.glb', {
  position: [0, 0, 0],
  scale: 1, // si entra gigante, prueba 0.01
  physics,
});

const hotspots = createInteractables(renderer, camera);

/* ================================================================== *
 * HISTORIA FENIX
 * ================================================================== */

const fenix = indexStory(await loadStory('/story/fenix_prototype.v4.json'));
const state = new FenixState(fenix);

// "/Game/Scenes/L_Bedroom" -> "/models/L_Bedroom.glb"  (ajusta si tu naming cambia)
const levelUrl = (lp) => `/models/${(lp ?? '').split('/').pop()}.glb`;

let player = null; // se rellena al cargar el personaje
let pendingSpawn = null; // spawn a aplicar cuando el player exista
let sceneGroup = null; // contenedor de la escena actual (para limpiar)
let storyInteractables = []; // proxies clicables de la escena actual
let currentSceneName = ''; // para el HUD

const applySpawn = (spawn) => {
  if (!spawn) return;
  if (!player) {
    pendingSpawn = spawn;
    return;
  }
  // loadCharacter puede devolver el Object3D o un wrapper { root/model, update }
  const obj = player.root ?? player.model ?? player;
  if (obj?.position) {
    obj.position.copy(spawn.position);
    obj.quaternion?.copy(spawn.quaternion);
  }
  controls.target.copy(spawn.position).add(new THREE.Vector3(0, 1, 0));
};

const disposeGroup = (g) => {
  g.traverse((o) => {
    o.geometry?.dispose?.();
    o.material?.dispose?.();
  });
  scene.remove(g);
};

// Hooks por escena para hotspots de mallas con nombre (como el ejemplo de la cama).
const onSceneLoaded = {
  'escena-bedroom': (model) => {
    hotspots.register(model, 'SM_Bed', {
      label: 'Cama',
      onClick: () => console.log('[fenix] clic en la cama'),
    });
  },
};

async function loadScene(uuid) {
  const def = fenix.getScene(uuid);
  if (!def) throw new Error(`Escena inexistente: ${uuid}`);

  if (sceneGroup) disposeGroup(sceneGroup);
  // TODO: limpiar tambien los colliders de physics del nivel anterior
  sceneGroup = new THREE.Group();
  sceneGroup.name = `escena:${def.name}`;
  currentSceneName = def.name;
  scene.add(sceneGroup);
  storyInteractables = [];

  // 1) modelo de la escena (tu helper, con physics)
  const model = await loadStaticMesh(
    sceneGroup,
    renderer,
    levelUrl(def.level_path),
    { position: [0, 0, 0], scale: 1, physics },
  );
  onSceneLoaded[def.uuid]?.(model);

  // 2) items con logica -> proxies clicables (la geometria va en el modelo)
  for (const item of def.items ?? []) {
    if (!state.evaluateConditions(item.conditions)) continue;
    if (!(item.events?.length || item.intercept_character)) continue;

    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 2, 0.2),
      new THREE.MeshBasicMaterial({
        color: 0x44aaff,
        transparent: true,
        opacity: debug.gui ? 0.35 : 0.0,
        depthWrite: false,
      }),
    );
    proxy.name = item.uuid;
    proxy.userData.item = item;
    applyPlacement(proxy, item.placement);
    sceneGroup.add(proxy);
    storyInteractables.push(proxy);
  }

  // 3) spawn del jugador
  if (def.player) {
    applySpawn({
      position: ueVecToThree(def.player.location),
      quaternion: ueRotToThree(def.player.rotation),
    });
  }

  renderHud?.();
  console.log(
    `[fenix] escena "${def.name}" cargada (${storyInteractables.length} interactuables)`,
  );
}

// Activar un item: ejecuta sus eventos; TRAVEL_TO cambia de escena.
const activateItem = (item) => {
  state.applyEvents(item.events ?? [], {
    onTravel: (target) => loadScene(target),
  });
};

// Raycast point-and-click solo para los items de la historia.
setupInteraction({
  domElement: renderer.domElement,
  camera,
  getInteractables: () => storyInteractables,
  onActivate: activateItem,
});

// Personaje del jugador (tu loader). El spawn lo pone la escena.
loadCharacter(scene, renderer, '/models/Player_Idle.glb', {
  position: [0, 0.5, 0],
  scale: 1,
  rotationY: 15,
}).then((p) => {
  player = p;
  if (pendingSpawn) {
    applySpawn(pendingSpawn);
    pendingSpawn = null;
  }
});

createInteraction(renderer, camera, physics, controls);

// HUD de estado (solo en dev)
let renderHud = null;
if (debug.gui) {
  const hud = document.createElement('pre');
  hud.style.cssText =
    'position:fixed;bottom:8px;left:8px;margin:0;padding:8px;background:#0008;color:#fff;font:12px monospace;z-index:10';
  document.body.appendChild(hud);
  renderHud = () => {
    const t = state.time;
    hud.textContent =
      `escena: ${currentSceneName}  ` +
      `| ${t.day} ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}  ` +
      `| monedas: ${state.getStat('monedas')}  deuda: ${state.getStat('deuda')}  ` +
      `| inv: ${Object.keys(state.inventory).join(', ') || '—'}`;
  };
  state.addEventListener('change', renderHud);
}

// Arrancar en la escena inicial de la historia
await loadScene(fenix.startScene);

/* --- Panel de depuracion (solo en dev) --- */
if (debug.gui) {
  const params = {
    sombras: true,
    reiniciar: () => location.reload(),
  };

  // --- Sol / cielo ---
  const sky = { elevacion: 35, azimut: 150, exposicion: 0.6 };
  const sunFolder = debug.gui.addFolder('Sol / cielo');
  const refresh = () =>
    sunFolder.controllers.forEach((c) => c.updateDisplay());
  const applySun = () => daylight.setSun(sky.elevacion, sky.azimut);
  sunFolder
    .add(sky, 'elevacion', -6, 90, 1)
    .name('elevacion sol')
    .onChange(applySun);
  sunFolder.add(sky, 'azimut', 0, 360, 1).name('azimut').onChange(applySun);
  sunFolder
    .add(sky, 'exposicion', 0.2, 1.6, 0.01)
    .name('exposicion')
    .onChange((v) => (renderer.toneMappingExposure = v));

  const horas = {
    amanecer: () => { sky.elevacion = 4; sky.azimut = 95; applySun(); refresh(); },
    mediodia: () => { sky.elevacion = 75; sky.azimut = 180; applySun(); refresh(); },
    atardecer: () => { sky.elevacion = 3; sky.azimut = 255; applySun(); refresh(); },
    noche: () => { sky.elevacion = -5; sky.azimut = 255; applySun(); refresh(); },
  };
  sunFolder.add(horas, 'amanecer');
  sunFolder.add(horas, 'mediodia');
  sunFolder.add(horas, 'atardecer');
  sunFolder.add(horas, 'noche');

  // --- Escena ---
  const sceneFolder = debug.gui.addFolder('Escena');
  sceneFolder
    .add(params, 'sombras')
    .name('sombras')
    .onChange((v) => {
      renderer.shadowMap.enabled = v;
      daylight.sun.castShadow = v;
      scene.traverse((o) => {
        if (o.isMesh) o.material.needsUpdate = true;
      });
    });
  sceneFolder.add(params, 'reiniciar').name('reiniciar');

  // --- Historia: saltos rapidos entre escenas para probar ---
  const storyFolder = debug.gui.addFolder('Historia');
  const viajes = {};
  for (const s of fenix.scenes.values()) viajes[s.name] = () => loadScene(s.uuid);
  for (const name of Object.keys(viajes)) storyFolder.add(viajes, name);

  applySun(); // estado inicial coherente
  renderHud?.();
}

/* --- Bucle --- */
createLoop((dt, now) => {
  debug.begin();
  physics.step();
  if (player) player.update(dt);

  controls.update();
  renderer.render(scene, camera);

  debug.end();
});

console.log('[fenix] juego con historia listo');
