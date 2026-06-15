import Stats from 'stats.js';
import GUI from 'lil-gui';

/**
 * Herramientas de depuración. Solo se montan en `npm run dev` (import.meta.env.DEV),
 * así que NO entran en la build de producción: cero peso en el juego final.
 */
export function createDebug() {
  if (!import.meta.env.DEV) {
    return { stats: null, gui: null, begin() {}, end() {} };
  }

  const stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb
  stats.dom.style.cssText = 'position:fixed;top:8px;left:8px;cursor:pointer';
  document.body.appendChild(stats.dom);

  const gui = new GUI({ title: 'Fenix · debug' });

  return {
    stats,
    gui,
    begin: () => stats.begin(),
    end: () => stats.end(),
  };
}
