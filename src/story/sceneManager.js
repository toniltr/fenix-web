import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyPlacement, ueVecToThree, ueRotToThree } from './loader.js';

/**
 * Carga una escena: modelo del level_path como UN modelo, y solo coloca los
 * items con lógica (puertas, pickups, silla...) como proxies clicables.
 *
 * resolveLevelUrl: (level_path) => url del .glb.  Por defecto mapea
 *   "/Game/Scenes/L_Bedroom" -> `${baseUrl}/L_Bedroom.glb`.
 * Si el .glb no existe todavía, cae a un placeholder para no bloquear.
 */
export class SceneManager extends EventTarget {
  constructor({ index, state, root, baseUrl = '/models/scenes', resolveLevelUrl, debug = false }) {
    super();
    this.index = index;
    this.state = state;
    this.root = root;                 // THREE.Group/Scene donde montamos la escena
    this.debug = debug;
    this.loader = new GLTFLoader();
    this.resolveLevelUrl = resolveLevelUrl ?? ((lp) => `${baseUrl}/${(lp ?? '').split('/').pop()}.glb`);

    this.container = new THREE.Group();
    this.container.name = 'fenix-scene';
    this.root.add(this.container);

    this.currentScene = null;
    this.interactables = []; // meshes clicables con userData.item
    this.spawn = null;       // { position, quaternion } del jugador
  }

  async loadScene(uuid) {
    const scene = this.index.getScene(uuid);
    if (!scene) throw new Error(`Escena inexistente: ${uuid}`);

    this.#clear();
    this.currentScene = scene;

    // 1) modelo de la escena (un solo glb)
    const url = this.resolveLevelUrl(scene.level_path);
    try {
      const gltf = await this.loader.loadAsync(url);
      gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
      this.container.add(gltf.scene);
    } catch (e) {
      console.warn(`Sin modelo para "${scene.name}" (${url}). Uso placeholder.`, e.message);
      this.container.add(this.#placeholderRoom(scene.name));
    }

    // 2) items con lógica -> proxies clicables (la geometría visible va en el modelo)
    this.interactables = [];
    for (const item of scene.items ?? []) {
      // gating opcional por condiciones del item
      if (!this.state.evaluateConditions(item.conditions)) continue;
      const proxy = this.#makeProxy(item);
      applyPlacement(proxy, item.placement);
      this.container.add(proxy);
      if ((item.events?.length || item.intercept_character)) this.interactables.push(proxy);
    }

    // 3) spawn del jugador (de momento, único por escena)
    if (scene.player) {
      this.spawn = {
        position: ueVecToThree(scene.player.location),
        quaternion: ueRotToThree(scene.player.rotation),
      };
    }

    this.dispatchEvent(new CustomEvent('scenechange', { detail: { scene, spawn: this.spawn } }));
    return { scene, spawn: this.spawn, interactables: this.interactables };
  }

  /** Ejecuta los eventos de un item; centraliza TRAVEL_TO aquí. */
  activate(item) {
    this.state.applyEvents(item.events ?? [], {
      onTravel: (target) => this.travelTo(target),
    });
  }

  async travelTo(target) {
    return this.loadScene(target);
  }

  // ---- helpers privados ----
  #makeProxy(item) {
    // Caja invisible (o translúcida en debug) que sirve de hitbox del item.
    const geo = new THREE.BoxGeometry(0.9, 2, 0.2); // ~ puerta; ajusta por clase si quieres
    const mat = new THREE.MeshBasicMaterial({
      color: 0x44aaff, transparent: true, opacity: this.debug ? 0.35 : 0.0, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = item.uuid;
    mesh.userData.item = item;
    return mesh;
  }

  #placeholderRoom(name) {
    const g = new THREE.Group();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 5),
      new THREE.MeshStandardMaterial({ color: 0x6b7280 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);
    return g;
  }

  #clear() {
    for (let i = this.container.children.length - 1; i >= 0; i--) {
      const c = this.container.children[i];
      c.traverse?.((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
      this.container.remove(c);
    }
    this.interactables = [];
  }
}
