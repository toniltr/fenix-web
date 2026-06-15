import RAPIER from '@dimforge/rapier3d-compat';

/**
 * La version "compat" de Rapier empaqueta el WASM y se inicializa con un
 * await explicito (RAPIER.init()). Es la mas fiable para produccion: no
 * depende de top-level await ni de plugins del bundler, asi que funciona
 * igual en `npm run dev` y en el build desplegado.
 *
 * Por eso createPhysics es ASYNC: hay que esperar a que el WASM cargue.
 */
export async function createPhysics(gravityY = -9.81) {
  await RAPIER.init(); // inicializa el WASM (idempotente: llamarlo varias veces es seguro)

  const world = new RAPIER.World({ x: 0, y: gravityY, z: 0 });
  world.timestep = 1 / 60;

  const links = [];

  function link(mesh, body, extra = {}) {
    const rec = { mesh, body, ...extra };
    links.push(rec);
    return rec;
  }

  function step() {
    world.step();
    for (const { mesh, body } of links) {
      const t = body.translation();
      const r = body.rotation();
      mesh.position.set(t.x, t.y, t.z);
      mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  return { RAPIER, world, links, link, step };
}
