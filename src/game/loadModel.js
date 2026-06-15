import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

// Loader unico, configurado una vez. Necesita el renderer para que el
// KTX2Loader sepa que formatos de textura soporta la GPU.
let loader = null;

function getLoader(renderer) {
  if (loader) return loader;

  loader = new GLTFLoader();

  // Geometria comprimida con meshopt.
  loader.setMeshoptDecoder(MeshoptDecoder);

  // Texturas comprimidas con KTX2. El transcoder se sirve desde los addons
  // de three (en /public no hace falta copiarlo: lo cogemos de node_modules
  // via la ruta publica que Vite resuelve).
  const ktx2 = new KTX2Loader()
    .setTranscoderPath(
      'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/',
    )
    .detectSupport(renderer);
  loader.setKTX2Loader(ktx2);

  return loader;
}

/**
 * Carga un static mesh (.glb con meshopt + KTX2) y lo mete en la escena.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer} renderer  necesario para KTX2
 * @param {string} url                    p.ej. '/models/SM_Bed.glb'
 * @param {object} [opts]
 * @param {[number,number,number]} [opts.position=[0,0,0]]
 * @param {number} [opts.scale=1]
 * @param {number} [opts.rotationY=0]
 * @param {object} [opts.physics]         si lo pasas, crea collider estatico (AABB)
 * @returns {Promise<THREE.Object3D>}
 */
export async function loadStaticMesh(scene, renderer, url, opts = {}) {
  const {
    position = [0, 0, 0],
    scale = 1,
    rotationY = 0,
    physics = null,
  } = opts;

  const gltf = await getLoader(renderer).loadAsync(url);
  const model = gltf.scene;

  model.scale.setScalar(scale);
  model.rotation.y = rotationY;
  model.position.set(position[0], position[1], position[2]);

  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  scene.add(model);

  if (physics) {
    const { RAPIER, world } = physics;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(center.x, center.y, center.z),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2),
      body,
    );
  }

  console.log('[fenix] modelo cargado:', url);
  return model;
}
