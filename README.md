# Sistema solar interactivo con three.js

Práctica de **Informática Gráfica** - Grado en Ingeniería Informática - Universidad de Las Palmas de Gran Canaria - Curso 2026/2027

**Autoría:** Beatriz Chaves Marrero

| | |
|---|---|
| 🎬 **Vídeo de la ejecución** | [[enlace al vídeo]](https://youtu.be/ZkaM3xOfgXY) |
| 🌐 **Demo en línea** | [[enlace a CodeSandbox]](https://codesandbox.io/p/sandbox/6t359f) |

---

## 1. Descripción de la práctica

Una maquetación 3D e interactiva de nuestro **sistema solar**, hecha con [three.js](https://threejs.org/). Incluye el Sol, los ocho planetas y doce lunas, con iluminación, sombras y texturas, y permite recorrerlo con dos cámaras distintas: una **vista general** desde fuera y una **vista subjetiva desde una nave**. Al hacer clic en un planeta aparece una **ficha didáctica** con datos reales de la NASA.

Cabe destacar que los tamaños y las distancias **no están a escala real** (no cabría en pantalla). Se mantiene el orden de los planetas y unas proporciones aproximadas entre ellos.

## 2. Cómo se usa

### Controles

| Acción | Teclas |
|---|---|
| Orbitar, zoom y desplazar (vista general) | Ratón: arrastrar, rueda y botón derecho |
| Cambiar entre vista general y nave | Botón **Ir a la nave** o tecla **V** |
| Mover la nave | **W / S / A / D** (adelante, atrás, izquierda, derecha) y **R / F** (subir, bajar) |
| Girar la nave | **Q / E** (alabeo) y **arrastrar el ratón** para mirar |
| Mostrar u ocultar la minivista | Botón **Minivista** |
| Ver la ficha de un astro | **Clic** sobre un planeta o el Sol (sin arrastrar) |
| Cerrar la ficha | **X**, tecla **Esc** o clic en el vacío |

La **minivista** (esquina inferior derecha) muestra siempre la cámara que no está activa, de modo que se pueden ver las dos a la vez.

### Panel de controles (lil-gui)

- **Velocidad** de la simulación (0 = pausa, hasta ×5).
- **Órbitas**: mostrar u ocultar las trayectorias.
- **Sombras**: activar o desactivar.
- **Nubes**: mostrar u ocultar las capas de nubes.
- **Luz estrella** y **Luz ambiente**: intensidad de cada una.

### Ejecución

El proyecto usa módulos ES y dependencias de npm (`three` y `lil-gui`), así que necesita un entorno que las resuelva, como CodeSandbox o Vite.

```bash
npm install three lil-gui
npm run dev
```

## 3. Tareas implementadas

| Requisito | Cómo se cumple |
|---|---|
| Al menos 5 planetas | 8 planetas, de Mercurio a Neptuno |
| Alguna luna | 12 lunas (ver tabla de abajo) |
| Iluminación | Luz puntual en el Sol, luz ambiente y sombras reales |
| Texturas | Imágenes externas (color, relieve, brillo, nubes, anillo) y, de reserva, texturas generadas por código |
| Al menos dos vistas | Vista general (`OrbitControls`) y vista de nave (`FlyControls`), simultáneas con la minivista |
| README con descripción, fuentes y uso de IA | Este documento |
| Vídeo de la ejecución | Enlace al inicio |

### Extras abordados

- **Enriquecimiento didáctico**: ficha con datos de la NASA y una curiosidad por astro, con la fuente citada en el propio panel.
- **Interfaz autoexplicativa**: el texto superior indica los controles de cada vista, y los paneles tienen nombres claros.
- **Interacción con el ratón**: selección de astros con `Raycaster` (apartado de S6).
- **Capas de nubes** con su propio relieve y su propia rotación.

## 4. Cómo está hecho

### Estructura

```
index.html     Botones (vista, minivista) y marco de la minivista
script.js      Escena, objetos, vistas, GUI, selección y bucle de animación
texturas.js    Generador de texturas procedurales (se usa como "caja negra")
info.js        Datos didácticos y panel HTML de las fichas
```

### Grafo de escena

Cada planeta es un grupo de objetos, como en el ejemplo `script_07`:

```
grupo                     se mueve por la órbita elíptica
 ├─ giro                  rota sobre su propio eje
 │   └─ malla             la esfera con sus texturas
 ├─ nubes                 esfera un 2 % mayor; gira algo más deprisa
 ├─ anillo                solo Saturno
 ├─ pivote → luna         uno por luna; inclina el plano de su órbita
 └─ etiqueta              sprite con el nombre
```

Separar `grupo`, `giro` y `pivote` permite que el planeta orbite, gire sobre sí mismo y arrastre a sus lunas sin que estas giren con él.

### Movimiento

- **Órbitas elípticas** en el plano XZ: `x = cos(a)·dist·f1`, `z = sin(a)·dist·f2`, con `f1` y `f2` distintos para deformar la circunferencia (como en `script_06`). Cada planeta empieza en una fase aleatoria.
- **Rotación propia** de cada planeta con velocidad distinta.
- **Lunas** que giran en el plano de su pivote. Tritón tiene velocidad negativa porque su órbita es retrógrada.
- Una única variable de **tiempo de simulación** escalable desde la GUI.

### Texturas

Hay dos capas, que se combinan:

1. **Procedurales (por defecto).** `texturas.js` pinta mapas de color, relieve (`bump`), brillo (`specular`) y emisivo a partir de ruido fractal, sin imágenes externas. En `script.js` se añaden pintores propios: la **Tierra** (océanos, continentes, desiertos y casquetes polares) y los **planetas de bandas** (Venus, Saturno, Urano y Neptuno).
2. **Externas.** El objeto `TEXTURAS_EXTERNAS` de `script.js` sustituye las procedurales por imágenes cuando existe la URL. Admite color, relieve, especular, emisivo, **nubes** (con su bump, en modo escala de grises o PNG con alfa) y el **anillo de Saturno**. 

Materiales: `MeshPhongMaterial` para planetas y lunas (permite `bumpMap` y `specularMap`), `MeshBasicMaterial` para el Sol (no recibe luz) y `MeshLambertMaterial` para el anillo.

### Luces y sombras

Una `PointLight` dentro del Sol ilumina todo el sistema, más una `AmbientLight` tenue para que la cara oscura no sea completamente negra. Los planetas y las lunas proyectan y reciben sombras (`PCFSoftShadowMap`), y el planeta proyecta su sombra sobre los anillos. El Sol lleva además un halo hecho con dos sprites de mezcla aditiva.

### Vistas

Dos cámaras (`camera` para la general y `camNave` para la nave) con sus controles. Solo está activo el control de la vista principal. La segunda cámara se dibuja en un **puerto de vista** reducido con `setViewport` y `setScissor` (S7), de modo que ambas se ven a la vez.

Captura tomada de la demo visualizando la **vista general:**

![Vista General](/images/CapturaVistaGeneral.png)


Captura tomada de la demo visualizando la **vista desde la nave:**

![Vista General](/images/CapturaVistaNave.png)



### Fichas didácticas

Al soltar el ratón sin haberlo movido (menos de 5 píxeles, para no confundir un clic con un arrastre) se lanza un `Raycaster` desde la cámara activa. Las lunas se incluyen en la prueba de impacto para que tapen lo que hay detrás, aunque no tienen ficha. Los textos y las fuentes están separados en `info.js`.

### Astros incluidos

| Planeta | Lunas |
|---|---|
| Mercurio | — |
| Venus | — |
| Tierra | Luna |
| Marte | Fobos, Deimos |
| Júpiter | Ío, Europa, Ganímedes, Calisto |
| Saturno (con anillos) | Encélado, Titán |
| Urano | Titania, Oberón |
| Neptuno | Tritón |

Como apunte, exceptuando la Luna del planeta Tierra, todas las demás lunas se han implementado sin texturas externas (debido a la falta de estas en internet).

## 5. Fuentes utilizadas

### Datos científicos de las fichas

- NASA NSSDCA, *Planetary Fact Sheet – Metric*, D. R. Williams. Última actualización: 18-03-2025. <https://nssdc.gsfc.nasa.gov/planetary/factsheet/>
- NASA NSSDCA, *Sun Fact Sheet*, D. R. Williams. <https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html>

Los valores son los de esas fichas, con conversiones propias (años = días orbitales / 365,25; días terrestres = horas / 24). Las temperaturas de los gigantes corresponden al nivel de 1 bar de presión, según indica la NASA. El número de lunas es el que figuraba en la ficha en la fecha de consulta y puede variar. Las curiosidades se han deducido de esos mismos datos.

### Código y documentación

- Guion de prácticas de la asignatura, semanas 6 y 7, y scripts de ejemplo (`script_03`, `script_06`, `script_07`, `script_12`, `script_13`, `script_15`, `script_16`). Material de Modesto Castrillón Santana ([otsedom](https://github.com/otsedom/)), con licencia CC BY-NC 4.0.
- Documentación de [three.js](https://threejs.org/docs/): `Raycaster`, `OrbitControls`, `FlyControls`, `MeshPhongMaterial`, `RingGeometry`, `EllipseCurve`.
- [lil-gui](https://lil-gui.georgealways.com/) para el panel de controles.
- `texturas.js`: módulo de texturas procedurales facilitado para la práctica y usado como caja negra.

### Imágenes

- Texturas de los planetas, las nubes y los anillos: **[Solar System Scope](https://www.solarsystemscope.com/textures/)** que las publica con licencia CC BY 4.0 a partir de datos de la NASA.

## 6. Asistencia de herramientas de IA

Se ha usado **Claude** (Anthropic) como apoyo durante el desarrollo.

- **Sistema de texturas de reserva (fallback):** La IA se encargó de programar la lógica de la capa procedural. Gracias a esto, si en algún momento las texturas externas fallan o no cargan, se aplican automáticamente texturas generadas por código (incluyendo los pintores de la Tierra y los planetas de bandas) para que los astros no pierdan su aspecto.
- **Implementación de las nubes:** Me encontré con bastantes problemas y bloqueos a la hora de añadir la capa de nubes superpuesta a los planetas. La IA me ayudó bastante a depurar el código y encontrar la solución para que se renderizaran correctamente.
- **Otros aportes:** Ayuda en la estructura de redacción de este README, depuración de errores generales y recopilación inicial de los datos de las fichas didácticas.

- Los datos de las fichas se contrastaron con las fuentes de la NASA citadas arriba.
