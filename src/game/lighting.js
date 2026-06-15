import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

/**
 * Luz natural de dia + cielo procedural.
 *
 * Piezas:
 *  - Sky: cielo fisico que va del azul de mediodia a tonos de atardecer y a
 *    noche segun la elevacion del sol. Hace de fondo (sustituye al color plano).
 *  - sun: DirectionalLight = el Sol. Es la sombra PRINCIPAL de dia.
 *  - hemi: HemisphereLight = luz del cielo (rebote ambiental), sin sombras.
 *  - tone mapping ACES: imprescindible para que el rango alto del dia no se
 *    queme a blanco. La exposicion se ajusta en caliente desde el panel.
 *
 * setSun(elevacion, azimut) en grados mueve el sol Y ajusta su intensidad:
 * al caer por debajo del horizonte la escena se apaga sola -> se hace de noche
 * y la lampara pasa a ser la luz protagonista.
 */
export function buildLighting(scene, renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;

  // El cielo se ve como fondo; quitamos el color plano y la niebla oscura.
  scene.background = null;
  scene.fog = null;

  const sky = new Sky();
  sky.scale.setScalar(100); // dentro del far de la camara (100)
  scene.add(sky);
  const u = sky.material.uniforms;
  u.turbidity.value = 4;
  u.rayleigh.value = 2.2;
  u.mieCoefficient.value = 0.005;
  u.mieDirectionalG.value = 0.8;

  const sun = new THREE.DirectionalLight('#fff2dd', 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = 8;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight('#aecbff', '#6b6048', 0.6);
  scene.add(hemi);

  const dir = new THREE.Vector3();

  function setSun(elevationDeg, azimuthDeg) {
    const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
    const theta = THREE.MathUtils.degToRad(azimuthDeg);
    dir.setFromSphericalCoords(1, phi, theta);

    u.sunPosition.value.copy(dir);
    sun.position.copy(dir).multiplyScalar(25);
    sun.target.position.set(0, 0, 0);
    sun.target.updateMatrixWorld();

    // Intensidad segun altura del sol: 0 en el horizonte, maxima en el cenit.
    const day = Math.max(0, Math.sin(THREE.MathUtils.degToRad(elevationDeg)));
    sun.intensity = day * 3.2;
    hemi.intensity = 0.12 + day * 0.7; // queda algo de ambiente de noche
  }

  setSun(35, 150); // media manana por defecto

  return { sky, sun, hemi, setSun, uniforms: u };
}
