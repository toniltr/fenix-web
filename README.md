# Fenix · Web

Base de desarrollo para un point-and-click 3D en navegador con **three.js** (render)
y **Rapier** (física, WebAssembly), empaquetado con **Vite**.

El estado actual es un *smoke test*: un suelo y una caja que cae con física. Sirve
para confirmar que todo el stack engrana. El juego se construye sobre los módulos
de `src/engine`.

## Requisitos

- Node.js 18+ (probado con 22). Comprueba con `node --version`.

## Arranque

```bash
npm install      # instala dependencias (solo la primera vez)
npm run dev      # servidor de desarrollo con recarga en caliente -> abre el navegador solo
```

Vite levanta un servidor en `http://localhost:5173`. Olvídate del problema del
`file://`: aquí todo se sirve por HTTP con los MIME y CORS correctos.

## Scripts

| Comando                  | Qué hace                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `npm run dev`            | Servidor de desarrollo + hot-reload. Abre el navegador.        |
| `npm run build`          | Build de producción optimizada en `dist/`.                     |
| `npm run preview`        | Sirve la build de `dist/` para probarla como en producción.    |
| `npm run format`         | Formatea el código con Prettier.                               |
| `npm run assets:optimize`| Comprime los glTF de `public/models/_raw` (meshopt + KTX2).    |

## Estructura

```
src/
  main.js              Punto de entrada. Conecta todo (smoke test actual).
  engine/
    renderer.js        Renderer + escena + cámara + OrbitControls.
    physics.js         Mundo de Rapier y sincronía malla<->cuerpo.
    loop.js            Bucle de render con dt acotado.
  debug/
    debug.js           stats.js (FPS) + lil-gui. SOLO en dev, no entra en producción.
public/
  models/              Aquí van tus .glb/.gltf. Los de public/ se sirven tal cual.
    _raw/              (opcional) originales sin comprimir, fuera del control de versiones.
```

## Herramientas incluidas y por qué

- **vite-plugin-wasm + vite-plugin-top-level-await** — lo que permite importar
  Rapier limpio (`import RAPIER from '@dimforge/rapier3d'`) sin tocar `.init()`.
- **stats.js** — contador de FPS/ms/MB. Se monta solo en `npm run dev`.
- **lil-gui** — panel para trastear valores en caliente (gravedad, luces, etc.)
  sin recompilar. También solo en dev.
- **@gltf-transform/cli** — pipeline de compresión de assets. Cuando exportes
  mallas de UE5 a glTF, esto las deja listas para web (geometría meshopt + texturas KTX2).
- **prettier** — formato de código consistente.

## Pipeline de assets (para cuando lleguen los modelos)

1. Exporta de UE5 a FBX, pasa por Blender y re-exporta a **glTF/GLB**.
2. Deja el original en `public/models/_raw/`.
3. `npm run assets:optimize` -> versión comprimida en `public/models/`.
4. Cárgala con `GLTFLoader` (ya disponible en `three/addons/loaders/GLTFLoader.js`),
   añadiendo `MeshoptDecoder` y `KTX2Loader` para descomprimir en cliente.

## Siguiente paso

Sustituir el smoke test de `main.js` por el juego: sala, lámpara agarrable,
interacción por raycast y luz dinámica con sombras, repartido en `src/game/`.
