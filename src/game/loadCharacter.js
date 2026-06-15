import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

// Mismo loader configurado que en loadModel.js (meshopt + KTX2).
let loader = null;
function getLoader(renderer) {
  if (loader) return loader;
  loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const ktx2 = new KTX2Loader()
    .setTranscoderPath(
      'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/',
    )
    .detectSupport(renderer);
  loader.setKTX2Loader(ktx2);
  return loader;
}

/**
 * Carga un personaje skeletal con animaciones y reproduce un clip (idle).
 *
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer} renderer
 * @param {string} url
 * @param {object} [opts]
 * @param {[number,number,number]} [opts.position=[0,0,0]]
 * @param {number} [opts.scale=1]
 * @param {number} [opts.rotationY=0]
 * @param {string} [opts.clip]  nombre del clip a reproducir; si no, busca "idle" o usa el primero
 * @returns {Promise<{ model, mixer, actions, update }>}
 */
export async function loadCharacter(scene, renderer, url, opts = {}) {
  const {
    position = [0, 0, 0],
    scale = 1,
    rotationY = 0,
    clip = null,
  } = opts;

  const gltf = await getLoader(renderer).loadAsync(url);
  const model = gltf.scene;

  model.scale.setScalar(scale);
  model.rotation.y = rotationY;
  model.position.set(position[0], position[1], position[2]);

  model.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // evita que desaparezca al animarse fuera del bbox original
    }
  });

  scene.add(model);

  // --- Animacion ---
  console.log(
    '[fenix] clips disponibles:',
    gltf.animations.map((c) => c.name),
  );

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const c of gltf.animations) actions[c.name] = mixer.clipAction(c);

  // Elegir clip: el pedido, o uno que contenga "idle", o el primero.
  let chosen = null;
  if (clip && actions[clip]) chosen = actions[clip];
  else {
    const idle = gltf.animations.find((c) =>
      c.name.toLowerCase().includes('idle'),
    );
    chosen = idle ? actions[idle.name] : Object.values(actions)[0] || null;
  }
  if (chosen) chosen.play();
  else console.warn('[fenix] el personaje no trae animaciones');

  // Llamar cada frame desde el bucle.
  const update = (dt) => mixer.update(dt);

  return { model, mixer, actions, update };
}
