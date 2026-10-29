// ---------------------------------------------------------------------------
// INFORMACIÓN DIDÁCTICA
// Un panel HTML que aparece al hacer clic en un astro. Los textos y las fuentes
// están aquí, separados del script principal, para poder cambiarlos sin tocar
// el resto.
//
// FUENTES (se muestran en el panel y deben ir también en el README):
//  - Planetas: NASA NSSDCA, "Planetary Fact Sheet - Metric", D. R. Williams,
//    última actualización 18-03-2025.
//    https://nssdc.gsfc.nasa.gov/planetary/factsheet/
//  - Sol: NASA NSSDCA, "Sun Fact Sheet", D. R. Williams.
//    https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html
//
// Los datos son los de esas fichas, con redondeos y conversiones propias:
// años = días orbitales / 365,25; días terrestres = horas / 24.
// Las temperaturas de los gigantes son a 1 bar de presión (así lo indica la
// NASA). El nº de lunas es el de la ficha en la fecha de consulta y puede
// cambiar. Las curiosidades se deducen de esos mismos datos.
//
// Las claves de DATOS coinciden con los nombres de los astros del script
// (sin tildes: Jupiter, no Júpiter).
// ---------------------------------------------------------------------------

const FUENTE_PLANETAS = {
    texto: "NASA NSSDCA · Planetary Fact Sheet (act. 18-03-2025)",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
  };
  const FUENTE_SOL = {
    texto: "NASA NSSDCA · Sun Fact Sheet",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html",
  };
  
  // nombre: título con tildes · tipo · datos: lista [etiqueta, valor] ·
  // dato: una curiosidad · fuente
  export const DATOS = {
    Sol: {
      nombre: "El Sol",
      tipo: "Estrella",
      datos: [
        ["Masa", "332.900 veces la de la Tierra"],
        ["Volumen", "≈ 1,3 millones de veces el de la Tierra"],
        ["Superficie", "5.772 K (≈ 5.500 °C)"],
        ["Rotación", "≈ 25 días (a 16° de latitud)"],
      ],
      dato: "Gira más deprisa en el ecuador que en los polos, porque no es un cuerpo sólido.",
      fuente: FUENTE_SOL,
    },
    Mercurio: {
      nombre: "Mercurio",
      tipo: "Planeta rocoso",
      datos: [
        ["Diámetro", "4.879 km"],
        ["Distancia", "57,9 millones de km"],
        ["Su año", "88 días terrestres"],
        ["Su día", "4.222,6 h (≈ 176 días terrestres)"],
        ["Temp. media", "167 °C"],
        ["Lunas", "0"],
      ],
      dato: "Su día solar dura el doble que su año: 176 días terrestres frente a 88.",
      fuente: FUENTE_PLANETAS,
    },
    Venus: {
      nombre: "Venus",
      tipo: "Planeta rocoso",
      datos: [
        ["Diámetro", "12.104 km"],
        ["Distancia", "108,2 millones de km"],
        ["Su año", "224,7 días terrestres"],
        ["Su día", "2.802 h (≈ 117 días terrestres)"],
        ["Temp. media", "464 °C"],
        ["Lunas", "0"],
      ],
      dato: "Gira al revés que la mayoría de planetas y, con 464 °C, es el más caliente aunque Mercurio esté más cerca del Sol.",
      fuente: FUENTE_PLANETAS,
    },
    Tierra: {
      nombre: "La Tierra",
      tipo: "Planeta rocoso",
      datos: [
        ["Diámetro", "12.756 km"],
        ["Distancia", "149,6 millones de km"],
        ["Su año", "365,2 días"],
        ["Su día", "24,0 h"],
        ["Temp. media", "15 °C"],
        ["Lunas", "1"],
      ],
      dato: "Es el planeta más denso del sistema solar: 5.514 kg/m³.",
      fuente: FUENTE_PLANETAS,
    },
    Marte: {
      nombre: "Marte",
      tipo: "Planeta rocoso",
      datos: [
        ["Diámetro", "6.792 km"],
        ["Distancia", "228,0 millones de km"],
        ["Su año", "687 días terrestres"],
        ["Su día", "24,7 h"],
        ["Temp. media", "-65 °C"],
        ["Lunas", "2"],
      ],
      dato: "Su día dura casi lo mismo que el terrestre, pero su año es casi el doble de largo.",
      fuente: FUENTE_PLANETAS,
    },
    Jupiter: {
      nombre: "Júpiter",
      tipo: "Gigante gaseoso",
      datos: [
        ["Diámetro", "142.984 km"],
        ["Distancia", "778,5 millones de km"],
        ["Su año", "4.331 días (≈ 11,9 años)"],
        ["Su día", "9,9 h"],
        ["Temp. (1 bar)", "-110 °C"],
        ["Lunas", "95"],
      ],
      dato: "Es el mayor de los planetas y, aun así, el de día más corto: 9,9 horas.",
      fuente: FUENTE_PLANETAS,
    },
    Saturno: {
      nombre: "Saturno",
      tipo: "Gigante gaseoso con anillos",
      datos: [
        ["Diámetro", "120.536 km"],
        ["Distancia", "1.432 millones de km"],
        ["Su año", "10.747 días (≈ 29,4 años)"],
        ["Su día", "10,7 h"],
        ["Temp. (1 bar)", "-140 °C"],
        ["Lunas", "274"],
      ],
      dato: "Su densidad (687 kg/m³) es menor que la del agua (1.000 kg/m³).",
      fuente: FUENTE_PLANETAS,
    },
    Urano: {
      nombre: "Urano",
      tipo: "Gigante helado",
      datos: [
        ["Diámetro", "51.118 km"],
        ["Distancia", "2.867 millones de km"],
        ["Su año", "30.589 días (≈ 83,7 años)"],
        ["Su día", "17,2 h"],
        ["Temp. (1 bar)", "-195 °C"],
        ["Lunas", "28"],
      ],
      dato: "Su eje está inclinado 97,8°: da la vuelta al Sol prácticamente «tumbado».",
      fuente: FUENTE_PLANETAS,
    },
    Neptuno: {
      nombre: "Neptuno",
      tipo: "Gigante helado",
      datos: [
        ["Diámetro", "49.528 km"],
        ["Distancia", "4.515 millones de km"],
        ["Su año", "59.800 días (≈ 163,7 años)"],
        ["Su día", "16,1 h"],
        ["Temp. (1 bar)", "-200 °C"],
        ["Lunas", "16"],
      ],
      dato: "Un solo año de Neptuno equivale a unos 164 años terrestres.",
      fuente: FUENTE_PLANETAS,
    },
  };
  
  // ---------------------------------------------------------------------------
  // Panel HTML. Devuelve { mostrar(clave), ocultar() }.
  // mostrar() devuelve false si no hay datos para esa clave (p. ej. una luna).
  export function crearPanelInfo() {
    const estilo = document.createElement("style");
    estilo.textContent = `
      #panelinfo {
        position: absolute; left: 20px; top: 80px; width: 310px; z-index: 5;
        display: none; box-sizing: border-box; padding: 14px 16px;
        background: rgba(8, 12, 28, 0.88); color: #e8ecf8;
        border: 1px solid rgba(120, 140, 200, 0.5); border-radius: 10px;
        font-family: sans-serif; font-size: 13px; line-height: 1.45;
      }
      #panelinfo h2 { margin: 0 0 2px; font-size: 20px; color: #fff; }
      #panelinfo .tipo { margin-bottom: 8px; color: #9fb0e0; }
      #panelinfo dl { margin: 0 0 8px; overflow: hidden; }
      #panelinfo dt { float: left; clear: left; width: 92px; color: #9fb0e0; }
      #panelinfo dd { margin: 0 0 3px 92px; }
      #panelinfo .dato { margin: 8px 0; padding-top: 8px; border-top: 1px solid rgba(120,140,200,0.35); }
      #panelinfo .fuente { font-size: 11px; color: #8d99c0; }
      #panelinfo .fuente a { color: #9fc4ff; }
      #panelinfo button {
        position: absolute; top: 6px; right: 8px; background: none; border: 0;
        color: #9fb0e0; font-size: 20px; cursor: pointer;
      }
    `;
    document.head.appendChild(estilo);
  
    const panel = document.createElement("div");
    panel.id = "panelinfo";
    panel.innerHTML = `
      <button title="Cerrar (Esc)">×</button>
      <h2></h2>
      <div class="tipo"></div>
      <dl></dl>
      <div class="dato"></div>
      <div class="fuente">Fuente: <a target="_blank" rel="noopener"></a></div>
    `;
    document.body.appendChild(panel);
  
    const q = (s) => panel.querySelector(s);
  
    function ocultar() {
      panel.style.display = "none";
    }
    q("button").addEventListener("click", ocultar);
    window.addEventListener("keydown", function (e) {
      if (e.code === "Escape") ocultar();
    });
  
    function mostrar(clave) {
      const d = DATOS[clave];
      if (!d) return false;
      q("h2").textContent = d.nombre;
      q(".tipo").textContent = d.tipo;
      const lista = q("dl");
      lista.innerHTML = "";
      d.datos.forEach(function (par) {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = par[0];
        dd.textContent = par[1];
        lista.appendChild(dt);
        lista.appendChild(dd);
      });
      q(".dato").textContent = "¿Sabías que…? " + d.dato;
      const enlace = q(".fuente a");
      enlace.textContent = d.fuente.texto;
      enlace.href = d.fuente.url;
      panel.style.display = "block";
      return true;
    }
  
    return { mostrar, ocultar };
  }
