import { loadStory, indexStory } from './loader.js';
import { FenixState } from './gameState.js';
import { SceneManager } from './sceneManager.js';
import { setupInteraction } from './interaction.js';

export { loadStory, indexStory, FenixState, SceneManager, setupInteraction };
export * from './loader.js';

/**
 * createFenix: punto de entrada único. Le pasas tu three.js (scene/camera/dom)
 * y opcionalmente un hook placePlayer para colocar TU personaje (character.js)
 * en el spawn de cada escena.
 *
 *   const fenix = await createFenix({
 *     scene, camera, domElement: renderer.domElement,
 *     storyUrl: '/story/fenix_prototype.v4.json',
 *     placePlayer: ({ position, quaternion }) => character.teleport(position, quaternion),
 *   });
 */
export async function createFenix({
  scene, camera, domElement,
  storyUrl,
  baseUrl, resolveLevelUrl,
  placePlayer,
  debug = false,
}) {
  const index = indexStory(await loadStory(storyUrl));
  const state = new FenixState(index);
  const sceneManager = new SceneManager({ index, state, root: scene, baseUrl, resolveLevelUrl, debug });

  sceneManager.addEventListener('scenechange', (e) => {
    if (e.detail.spawn) placePlayer?.(e.detail.spawn);
  });

  const dispose = setupInteraction({
    domElement, camera,
    getInteractables: () => sceneManager.interactables,
    onActivate: (item) => sceneManager.activate(item),
  });

  await sceneManager.loadScene(index.startScene);

  return { index, state, sceneManager, dispose };
}
