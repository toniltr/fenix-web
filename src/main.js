import { createRenderer } from './engine/renderer.js';
import { createPhysics } from './engine/physics.js';
import { createLoop } from './engine/loop.js';
import { createDebug } from './debug/debug.js';

import { buildRoom } from './game/room.js';
import { buildLighting } from './game/lighting.js';
import { buildLamp } from './game/lamp.js';
import { spawnBox } from './game/props.js';
import { buildCharacter } from './game/character.js';
import { createInteraction } from './game/interaction.js';
import { loadStaticMesh } from './game/loadModel.js';
import { loadCharacter } from './game/loadCharacter.js';
import { createInteractables } from './game/interactables.js';
import { makeGrabbable } from './game/makeGrabbable.js';

/* ------------------------------------------------------------------ *
 * EL JUEGO (PoC)
 * Sala con luz natural de dia (sol + cielo) y la lampara dinamica.
 * Clic izq. agarra y arrastra · clic der. orbita · rueda zoom.
 * ------------------------------------------------------------------ */

const { renderer, scene, camera, controls } = createRenderer(
  document.getElementById('app'),
);
camera.position.set(7, 5.5, 8);
controls.target.set(0, 0, 0);      // rota alrededor del origen (0,0,0)
controls.enablePan = false;        // sin desplazamiento lateral
controls.minDistance = 5;
controls.maxDistance = 20;
controls.update();
const polar = controls.getPolarAngle();
controls.minPolarAngle = polar;    // bloquea la inclinación vertical...
controls.maxPolarAngle = polar;    // ...solo rotación izquierda-derecha

const physics = await createPhysics();
const debug = createDebug();

const daylight = buildLighting(scene, renderer); // sol + cielo + tone mapping
buildRoom(scene, physics);
loadStaticMesh(scene, renderer, '/models/SM_Base.glb', {
  position: [0, 0, 0],
  scale: 1,        // si entra gigante, prueba 0.01
  physics,         // quita esto si no quieres collider, solo decoración
});

const hotspots = createInteractables(renderer, camera);

loadStaticMesh(scene, renderer, '/models/L_Bedroom.glb', {
  position: [0, 0, 0],
  scale: 1,
  physics,
}).then((model) => {
  hotspots.register(model, 'SM_Bed', {
    label: 'Cama',
    onClick: () => console.log('[fenix] clic en la cama'),
  });
});

let player = null;
loadCharacter(scene, renderer, '/models/Player_Idle.glb', {
  position: [0, 0.5, 0],
  scale: 1,
  rotationY: 15,
}).then((p) => {
  player = p;
});


const lamp = buildLamp(scene, physics, -1.6, 1.2, 1.4);
const character = buildCharacter(scene, 2.2, 1.8);


createInteraction(renderer, camera, physics, controls);

/* --- Panel de depuracion (solo en dev) --- */
if (debug.gui) {
  const params = {
    sombras: true,
    luzLampara: true,
    soltarMasCajas: () => {
      for (let i = 0; i < 10; i++) {
        spawnBox(scene, physics, -1.5 + Math.random() * 3, 3 + Math.random() * 2, -1 + Math.random() * 2.5, 0.45);
      }
    },
    reiniciar: () => location.reload(),
  };

  // De dia, la sombra de la lampara apenas se nota y la luz puntual con sombras
  // es cara: la apagamos cuando el sol esta alto y la recuperamos de noche.
  const syncLampShadow = () => {
    const esDeDia = sky.elevacion > 8;
    lamp.light.castShadow = params.sombras && params.luzLampara && !esDeDia;
  };

  // --- Sol / cielo ---
  const sky = { elevacion: 35, azimut: 150, exposicion: 0.6 };
  const sunFolder = debug.gui.addFolder('Sol / cielo');
  const refresh = () => sunFolder.controllers.forEach((c) => c.updateDisplay());
  const applySun = () => {
    daylight.setSun(sky.elevacion, sky.azimut);
    syncLampShadow();
  };
  sunFolder.add(sky, 'elevacion', -6, 90, 1).name('elevacion sol').onChange(applySun);
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
  sceneFolder.add(params, 'soltarMasCajas').name('+10 cajas');
  sceneFolder
    .add(params, 'sombras')
    .name('sombras')
    .onChange((v) => {
      renderer.shadowMap.enabled = v;
      daylight.sun.castShadow = v;
      syncLampShadow();
      scene.traverse((o) => {
        if (o.isMesh) o.material.needsUpdate = true;
      });
    });
  sceneFolder
    .add(params, 'luzLampara')
    .name('luz lampara')
    .onChange((v) => {
      lamp.light.visible = v;
      syncLampShadow();
    });
  sceneFolder.add(params, 'reiniciar').name('reiniciar');

  applySun(); // estado inicial coherente
}

/* --- Bucle --- */
createLoop((dt, now) => {
  debug.begin();
  physics.step();
  lamp.syncLight();
  character.update(now);
  if (player) player.update(dt);

  controls.update();
  renderer.render(scene, camera);
  
  debug.end();
});

console.log('[fenix] juego con luz de dia listo');
