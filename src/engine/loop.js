/**
 * Bucle de render. Llama a `onFrame(dt, now)` cada frame.
 * Mantiene el dt acotado para que un parón (cambiar de pestaña) no haga
 * explotar la física con un salto de tiempo enorme.
 */
export function createLoop(onFrame) {
  let last = performance.now();
  let running = true;

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    onFrame(dt, now);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  return {
    stop() {
      running = false;
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    },
  };
}
