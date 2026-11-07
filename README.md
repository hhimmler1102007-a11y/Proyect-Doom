# Extraction Doom (proyecto modular)

```
index.html                 HTML del juego (sin código ni imágenes incrustadas)
src/main.js                Punto de entrada: arranque del juego (importa todos los módulos)
src/game/                  Lógica del juego dividida en módulos ES (ver abajo)
src/data/graphics.js       Texturas y sprites en bruto (base64)
src/data/audio-urls.js     Rutas a los audios
src/assets/audio/*.mp3     Sonidos, pasos, radio, ambiente y música
src/assets/img/            Imágenes (menú, armas, panorama, mapas)
src/styles/*.css           base, skin-tactico, boot-screen
src/iconos-tacticos.js, boot-loader.js, orientation.js
```

## Módulos de `src/game/` (orden aproximado de carga)
| Módulo | Contenido |
|---|---|
| core | constantes, utilidades, mapa, generación de ciudad, edificios, `MAP_SEED` |
| textures / sprites | texturas, sombreado y todos los sprites |
| data | ITEMS, WEAPONS, ENEMIGOS, logros, misiones diarias |
| audio / music | efectos, pasos, radio, ambiente y música del menú |
| outposts | puestos, campamentos, fortificaciones, props sólidos |
| state | estado global (`P`, `enemies`, `weather`…), guardado, XP, atmósfera |
| worldgen / operations / reset | botín, spawns, alarmas, refuerzos, objetivos, cajas fuertes, `reset()` |
| backdrop / conquest / pathfinding | panorama, minimapa, brújula, modo conquista, rutas |
| input / ai / update / combat | controles táctiles y teclado, IA, actualización, disparo y muerte |
| inventory / shop / hud / weapon-view / render | inventario, tienda, HUD, armas en mano, render principal |
| bigmap / game | mapa táctico grande, bucle principal, menús y arranque de operación |

## Variables compartidas
Las variables que se reasignan desde otros módulos (`P`, `enemies`, `state`, `weather`…)
se exportan con `export let` y tienen un setter `set_<nombre>(valor)`. Para cambiar una desde
otro módulo usa el setter; leerla es normal (`import { P } from './state.js'`).
Los módulos se importan entre sí en ciclos (como el código original, que era un solo bloque):
no pongas código que se ejecute al cargar y que use valores de otro módulo sin revisar el orden
de `src/main.js`.

## Uso
```
npm install
npm run dev            # servidor de desarrollo (abre desde el móvil con la IP que muestra)
npm run build          # dist/  (archivos separados)
npm run build:single   # dist-single/index.html (Vite + plugin single-file)
python3 build-single-standalone.py  # dist-single/index.html (autónomo, sin instalar Vite)
```
Los módulos ES del proyecto fuente no funcionan abriendo `index.html` con doble clic (file://): usa `npm run dev`. La salida `dist-single/index.html` generada por `build-single-standalone.py` incorpora los módulos y los recursos locales en un solo archivo HTML, sin servidor Vite.

## Carga de operaciones y paquete de itch.io

La pantalla inicial ya no usa una espera fija: permanece visible hasta que el arranque termina de decodificar los recursos gráficos y el panorama. La pantalla de operación informa el avance de la preparación del mapa, el terreno, la decoración, los objetos, las guarniciones, los objetivos, el clima y el audio de aparición.

La carpeta `dist/` incluida en este paquete es una distribución estática basada en módulos ES, con `index.html` en la raíz y rutas relativas, preparada para servirse desde un alojamiento web como itch.io. Para generar la versión optimizada de Vite, instala las dependencias y ejecuta `npm run build`; eso reemplazará `dist/` por la compilación de Vite.

## Corrección gráfica cinematográfica

Se corrigió un error de ejecución en `drawShafts()`: el perfil cinematográfico solicitaba 64 motas de polvo, pero el arreglo solo contenía 46. Al intentar acceder a la mota 47 se lanzaba una excepción dentro de `render()`, interrumpiendo el fotograma antes de dibujar el arma en mano y el minimapa. Ahora se generan 64 motas y el bucle limita su recorrido al tamaño real del arreglo.
