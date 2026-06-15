import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createFenix } from '../src/story/index.js';

// --- three mínimo (sustituye por TU renderer.js / loop.js) ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a22);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
camera.position.set(-7, 5, 5); // ~ tu cámara orbital inicial

const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI / 2.2; // bloqueo vertical, como tu setup
controls.minDistance = 2;
controls.maxDistance = 20;
controls.target.set(0, 1, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(5, 10, 5);
scene.add(sun);

// marcador de jugador placeholder (sustituye por TU character.js)
const player = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.3, 1, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0xffcc66 })
);
player.castShadow = true;
scene.add(player);

// --- runtime Fenix ---
const fenix = await createFenix({
  scene, camera, domElement: renderer.domElement,
  storyUrl: './fenix_prototype.v4.json',
  baseUrl: './models/scenes', // pon aquí tus .glb; si faltan, verás placeholder
  debug: true,                // muestra las hitboxes de los items
  placePlayer: ({ position, quaternion }) => {
    player.position.copy(position);
    player.quaternion.copy(quaternion);
    controls.target.copy(position).add(new THREE.Vector3(0, 1, 0));
  },
});

// HUD simple de estado
const hud = document.createElement('pre');
hud.style.cssText = 'position:fixed;top:8px;left:8px;margin:0;padding:8px;background:#0008;color:#fff;font:12px monospace';
document.body.appendChild(hud);
const renderHud = () => {
  const s = fenix.state;
  hud.textContent =
    `escena: ${fenix.sceneManager.currentScene?.name}\n` +
    `tiempo: ${s.time.day} ${String(s.time.hour).padStart(2,'0')}:${String(s.time.minute).padStart(2,'0')}\n` +
    `monedas: ${s.getStat('monedas')}  deuda: ${s.getStat('deuda')}\n` +
    `inventario: ${Object.keys(s.inventory).join(', ') || '—'}`;
};
fenix.state.addEventListener('change', renderHud);
fenix.sceneManager.addEventListener('scenechange', renderHud);
renderHud();

// --- loop (sustituye por TU loop.js; recuerda mixer.update(dt) del personaje) ---
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
