/* =========================================================
   Organizador · Tareas + Calendario + Pomodoro
   HTML/CSS/JS puro · persistencia en localStorage
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. ALMACENAMIENTO
     --------------------------------------------------------- */
  var KEY = "organizador.v1";
  var memoria = {}; // respaldo si localStorage no está disponible

  function almacenLeer(k) {
    try { return window.localStorage.getItem(k); }
    catch (e) { return k in memoria ? memoria[k] : null; }
  }
  function almacenEscribir(k, v) {
    try { window.localStorage.setItem(k, v); }
    catch (e) { memoria[k] = v; }
  }

  var AJUSTES_DEF = {
    pomodoro: 25, corto: 5, largo: 15,
    autoBreaks: true, autoPomos: true, longInterval: 4,
    autoCheck: true, checkBottom: false,
    alarmSound: "campana", alarmVolume: 73, alarmRepeat: 1,
    focusSound: "ninguno", focusVolume: 50,
    theme: "magenta", hourFormat: "24", darkRunning: false,
    reminderType: "ultimo", reminderMin: 5
  };

  var estado = {
    tareas: [],
    listas: [{ id: "tareas", nombre: "Tareas", fija: true }],
    ajustes: Object.assign({}, AJUSTES_DEF),
    tareaActiva: null,
    ronda: 1
  };

  function cargar() {
    var raw = almacenLeer(KEY);
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      if (Array.isArray(d.tareas)) estado.tareas = d.tareas;
      if (Array.isArray(d.listas) && d.listas.length) estado.listas = d.listas;
      if (d.ajustes) estado.ajustes = Object.assign({}, AJUSTES_DEF, d.ajustes);
      if (d.tareaActiva) estado.tareaActiva = d.tareaActiva;
      if (d.ronda) estado.ronda = d.ronda;
    } catch (e) {
      console.warn("No se pudieron leer los datos guardados:", e);
    }
  }

  var guardarTimer = null;
  function guardar() {
    clearTimeout(guardarTimer);
    guardarTimer = setTimeout(function () {
      almacenEscribir(KEY, JSON.stringify({
        tareas: estado.tareas,
        listas: estado.listas,
        ajustes: estado.ajustes,
        tareaActiva: estado.tareaActiva,
        ronda: estado.ronda
      }));
    }, 120);
  }

  /* ---------------------------------------------------------
     2. UTILIDADES
     --------------------------------------------------------- */
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function hoyISO(d) {
    var f = d || new Date();
    var m = String(f.getMonth() + 1).padStart(2, "0");
    var dd = String(f.getDate()).padStart(2, "0");
    return f.getFullYear() + "-" + m + "-" + dd;
  }

  function isoADate(iso) {
    var p = String(iso).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var DIAS_C = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  function fechaLarga(d) {
    return DIAS[d.getDay()] + ", " + d.getDate() + " de " + MESES[d.getMonth()];
  }

  function fmtHora(hhmm) {
    if (!hhmm) return "";
    var p = hhmm.split(":");
    var h = parseInt(p[0], 10), m = p[1];
    if (estado.ajustes.hourFormat === "12") {
      var suf = h >= 12 ? "pm" : "am";
      var h12 = h % 12; if (h12 === 0) h12 = 12;
      return h12 + ":" + m + " " + suf;
    }
    return String(h).padStart(2, "0") + ":" + m;
  }

  function fmtHoraNum(h) {
    if (estado.ajustes.hourFormat === "12") {
      var suf = h >= 12 ? "pm" : "am";
      var h12 = h % 12; if (h12 === 0) h12 = 12;
      return h12 + " " + suf;
    }
    return String(h).padStart(2, "0") + ":00";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add("hidden"); }, 2600);
  }

  /* ---------------------------------------------------------
     3. MODELO DE TAREAS
     --------------------------------------------------------- */
  function nuevaTarea(datos) {
    var t = {
      id: uid(),
      titulo: datos.titulo,
      nota: "",
      listaId: datos.listaId || "tareas",
      miDia: !!datos.miDia,
      importante: !!datos.importante,
      asignada: !!datos.asignada,
      hecha: false,
      fecha: datos.fecha || "",
      inicio: datos.inicio || "",
      fin: datos.fin || "",
      estPomos: datos.estPomos || 1,
      sesiones: [],
      creada: new Date().toISOString()
    };
    estado.tareas.unshift(t);
    guardar();
    return t;
  }

  function buscarTarea(id) {
    for (var i = 0; i < estado.tareas.length; i++) {
      if (estado.tareas[i].id === id) return estado.tareas[i];
    }
    return null;
  }

  function completados(t) { return t.sesiones.length; }

  /* Ajuste "Mover al final al completar" */
  function moverAlFinal(t) {
    if (!estado.ajustes.checkBottom || !t.hecha) return;
    estado.tareas = estado.tareas.filter(function (x) { return x.id !== t.id; });
    estado.tareas.push(t);
  }

  function borrarTarea(id) {
    estado.tareas = estado.tareas.filter(function (t) { return t.id !== id; });
    if (estado.tareaActiva === id) estado.tareaActiva = null;
    guardar();
  }

  /* Una tarea se registra en el calendario automáticamente
     en cuanto tiene fecha + hora de inicio. */
  function esEventoCalendario(t) { return !!(t.fecha && t.inicio); }

  function eventosDelDia(iso) {
    return estado.tareas
      .filter(function (t) { return esEventoCalendario(t) && t.fecha === iso; })
      .sort(function (a, b) { return a.inicio.localeCompare(b.inicio); });
  }

  /* ---------------------------------------------------------
     4. VISTAS / NAVEGACIÓN
     --------------------------------------------------------- */
  var vistaActual = "miDia";
  var busqueda = "";
  var ordenAlfabetico = false;

  var TITULOS = {
    miDia: "Mi día",
    importante: "Importante",
    planeado: "Planeado",
    completadas: "Completadas",
    asignadas: "Asignado a mí",
    tareas: "Tareas",
    calendario: "Calendario",
    pomodoro: "Pomodoro"
  };

  function tareasDeVista() {
    var lista = estado.tareas.slice();

    if (busqueda) {
      var q = busqueda.toLowerCase();
      lista = lista.filter(function (t) {
        return t.titulo.toLowerCase().indexOf(q) !== -1 ||
               (t.nota || "").toLowerCase().indexOf(q) !== -1;
      });
    }

    switch (vistaActual) {
      case "miDia":
        lista = lista.filter(function (t) { return t.miDia || t.fecha === hoyISO(); }); break;
      case "importante":
        lista = lista.filter(function (t) { return t.importante; }); break;
      case "planeado":
        lista = lista.filter(function (t) { return !!t.fecha; })
          .sort(function (a, b) { return (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio); });
        break;
      case "completadas":
        lista = lista.filter(function (t) { return t.hecha; }); break;
      case "asignadas":
        lista = lista.filter(function (t) { return t.asignada; }); break;
      case "tareas":
        break;
      default:
        if (vistaActual.indexOf("lista:") === 0) {
          var id = vistaActual.slice(6);
          lista = lista.filter(function (t) { return t.listaId === id; });
        }
    }

    if (ordenAlfabetico) {
      lista.sort(function (a, b) { return a.titulo.localeCompare(b.titulo, "es"); });
    }
    return lista;
  }

  function irA(vista) {
    vistaActual = vista;
    $$("#sidebar .nav-item").forEach(function (b) {
      b.classList.toggle("active", b.dataset.view === vista);
    });
    $("#viewTasks").classList.remove("active");
    $("#viewCalendar").classList.remove("active");
    $("#viewPomodoro").classList.remove("active");

    if (vista === "calendario") { $("#viewCalendar").classList.add("active"); pintarCalendario(); }
    else if (vista === "pomodoro") { $("#viewPomodoro").classList.add("active"); pintarPomodoro(); }
    else { $("#viewTasks").classList.add("active"); pintarTareas(); }
  }

  /* ---------------------------------------------------------
     5. RENDER DE TAREAS
     --------------------------------------------------------- */
  function nombreLista(id) {
    for (var i = 0; i < estado.listas.length; i++) {
      if (estado.listas[i].id === id) return estado.listas[i].nombre;
    }
    return "Tareas";
  }

  function pintarTareas() {
    var esLista = vistaActual.indexOf("lista:") === 0;
    var titulo = esLista ? nombreLista(vistaActual.slice(6)) : (TITULOS[vistaActual] || "Tareas");
    $("#viewTitle").textContent = titulo;
    $("#viewSubtitle").textContent = vistaActual === "miDia" ? fechaLarga(new Date()) : "";
    $("#renameListBtn").hidden = !esLista;
    $("#deleteListBtn").hidden = !esLista;

    var lista = tareasDeVista();
    var pend = lista.filter(function (t) { return !t.hecha; });
    var hech = lista.filter(function (t) { return t.hecha; });
    if (vistaActual === "completadas") { pend = lista; hech = []; }

    $("#taskList").innerHTML = pend.map(fila).join("");
    $("#doneList").innerHTML = hech.map(fila).join("");
    $("#emptyMsg").hidden = lista.length > 0;

    contadores();
  }

  function fila(t) {
    var meta = [];
    meta.push(nombreLista(t.listaId));
    if (t.fecha) {
      var d = isoADate(t.fecha);
      var etiqueta = t.fecha === hoyISO() ? "Hoy" : DIAS_C[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1);
      if (t.inicio) etiqueta += " · " + fmtHora(t.inicio) + (t.fin ? " - " + fmtHora(t.fin) : "");
      meta.push("📅 " + etiqueta);
    }
    if (t.miDia) meta.push("☀ Mi día");

    return '<li class="task-item ' + (t.hecha ? "done" : "") +
      (estado.tareaActiva === t.id ? " selected" : "") + '" data-id="' + t.id + '">' +
      '<button class="check" data-act="toggle" title="Completar">✓</button>' +
      '<div class="task-main" data-act="detalle">' +
        '<div class="task-title">' + esc(t.titulo) + '</div>' +
        '<div class="task-meta">' + meta.map(esc).join(" &nbsp;·&nbsp; ") + '</div>' +
      '</div>' +
      '<span class="pomo-count" title="Pomodoros completados / estimados"><b>' +
        completados(t) + '</b>/' + t.estPomos + ' 🍅</span>' +
      '<button class="mini-btn" data-act="enfocar" title="Usar en el temporizador">▶ Pomodoro</button>' +
      '<button class="star-btn ' + (t.importante ? "on" : "") + '" data-act="star" title="Importante">' +
        (t.importante ? "★" : "☆") + '</button>' +
    '</li>';
  }

  function contadores() {
    var n = function (f) { return estado.tareas.filter(f).length; };
    $("#c-miDia").textContent    = n(function (t) { return !t.hecha && (t.miDia || t.fecha === hoyISO()); }) || "";
    $("#c-importante").textContent = n(function (t) { return !t.hecha && t.importante; }) || "";
    $("#c-planeado").textContent = n(function (t) { return !t.hecha && t.fecha; }) || "";
    $("#c-completadas").textContent = n(function (t) { return t.hecha; }) || "";
    $("#c-asignadas").textContent = n(function (t) { return !t.hecha && t.asignada; }) || "";
    $("#c-tareas").textContent   = n(function (t) { return !t.hecha; }) || "";
  }

  function pintarListas() {
    var cont = $("#customLists");
    var propias = estado.listas.filter(function (l) { return !l.fija; });
    cont.innerHTML = propias.map(function (l) {
      var num = estado.tareas.filter(function (t) { return t.listaId === l.id && !t.hecha; }).length;
      return '<button class="nav-item" data-view="lista:' + l.id + '">' +
        '<span class="ico">📋</span><span class="nav-label">' + esc(l.nombre) + '</span>' +
        '<span class="count">' + (num || "") + '</span></button>';
    }).join("") || '<div class="hint" style="padding:0 10px 8px">Aún no tienes listas propias.</div>';
  }

  /* ---------------------------------------------------------
     6. PANEL DE DETALLE
     --------------------------------------------------------- */
  var detalleId = null;

  function abrirDetalle(id) {
    var t = buscarTarea(id);
    if (!t) return;
    detalleId = id;
    $("#detail").classList.remove("hidden");

    var tomates = "";
    for (var i = 0; i < Math.max(t.estPomos, completados(t)); i++) {
      tomates += '<span class="' + (i < completados(t) ? "" : "t-off") + '">🍅</span>';
    }

    var log = t.sesiones.length
      ? t.sesiones.map(function (s, i) {
          var d = new Date(s.fin);
          return "<li><span>#" + (i + 1) + " · " + d.toLocaleDateString("es") + "</span>" +
            "<span>" + d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) +
            " · " + s.minutos + " min</span></li>";
        }).join("")
      : '<li><span>Sin pomodoros completados todavía.</span></li>';

    var opciones = estado.listas.map(function (l) {
      return '<option value="' + l.id + '"' + (l.id === t.listaId ? " selected" : "") + '>' + esc(l.nombre) + "</option>";
    }).join("");

    var minutosTotal = t.sesiones.reduce(function (a, s) { return a + s.minutos; }, 0);

    $("#detailBody").innerHTML =
      "<h3>" + esc(t.titulo) + "</h3>" +
      '<div class="tomato-row">' + (tomates || "—") + "</div>" +
      '<div class="d-field"><label>Título</label><input id="dTitulo" value="' + esc(t.titulo) + '"></div>' +
      '<div class="d-field"><label>Notas</label><textarea id="dNota">' + esc(t.nota) + "</textarea></div>" +
      '<div class="d-field"><label>Fecha</label><input type="date" id="dFecha" value="' + esc(t.fecha) + '"></div>' +
      '<div class="d-field"><label>Hora inicio</label><input type="time" id="dInicio" value="' + esc(t.inicio) + '"></div>' +
      '<div class="d-field"><label>Hora fin</label><input type="time" id="dFin" value="' + esc(t.fin) + '"></div>' +
      '<div class="d-field"><label>Pomodoros estimados</label><input type="number" min="1" max="20" id="dEst" value="' + t.estPomos + '"></div>' +
      '<div class="d-field"><label>Lista</label><select id="dLista">' + opciones + "</select></div>" +
      '<div class="set-row" style="color:var(--text-dim)"><span>Agregar a Mi día</span>' +
        '<label class="switch"><input type="checkbox" id="dMiDia"' + (t.miDia ? " checked" : "") + '><span class="slider"></span></label></div>' +
      '<div class="set-row" style="color:var(--text-dim)"><span>Importante</span>' +
        '<label class="switch"><input type="checkbox" id="dImp"' + (t.importante ? " checked" : "") + '><span class="slider"></span></label></div>' +
      '<div class="set-row" style="color:var(--text-dim)"><span>Asignada a mí</span>' +
        '<label class="switch"><input type="checkbox" id="dAsig"' + (t.asignada ? " checked" : "") + '><span class="slider"></span></label></div>' +
      '<div class="d-field"><label>Pomodoros de esta tarea (' + completados(t) + "/" + t.estPomos +
        " · " + minutosTotal + ' min)</label><ul class="pomo-log">' + log + "</ul></div>" +
      (esEventoCalendario(t)
        ? '<p class="hint" style="padding:0">✔ Registrada automáticamente en el calendario.</p>'
        : '<p class="hint" style="padding:0">Añade fecha y hora para que aparezca en el calendario.</p>') +
      '<div class="detail-actions">' +
        '<button class="ghost-btn" id="dEnfocar">▶ Usar en Pomodoro</button>' +
        '<button class="danger-btn" id="dBorrar">Eliminar</button>' +
      "</div>";

    // Guardado inmediato de cada campo
    function bind(sel, prop, tipo) {
      var el = $(sel);
      if (!el) return;
      el.addEventListener(tipo === "check" ? "change" : "input", function () {
        var v = tipo === "check" ? el.checked : (tipo === "num" ? Math.max(1, parseInt(el.value, 10) || 1) : el.value);
        t[prop] = v;
        guardar();
        pintarTareas();
        if (vistaActual === "calendario") pintarCalendario();
        if (vistaActual === "pomodoro") pintarPomodoro();
        pintarListas();
      });
    }
    bind("#dTitulo", "titulo");
    bind("#dNota", "nota");
    bind("#dFecha", "fecha");
    bind("#dInicio", "inicio");
    bind("#dFin", "fin");
    bind("#dEst", "estPomos", "num");
    bind("#dLista", "listaId");
    bind("#dMiDia", "miDia", "check");
    bind("#dImp", "importante", "check");
    bind("#dAsig", "asignada", "check");

    $("#dEnfocar").addEventListener("click", function () { enfocarTarea(t.id); });
    $("#dBorrar").addEventListener("click", function () {
      if (!confirm("¿Eliminar «" + t.titulo + "»?")) return;
      borrarTarea(t.id);
      cerrarDetalle();
      refrescarTodo();
    });
  }

  function cerrarDetalle() {
    detalleId = null;
    $("#detail").classList.add("hidden");
  }

  function refrescarTodo() {
    pintarListas();
    if (vistaActual === "calendario") pintarCalendario();
    else if (vistaActual === "pomodoro") pintarPomodoro();
    else pintarTareas();
    contadores();
  }

  /* ---------------------------------------------------------
     7. CALENDARIO (registro automático)
     --------------------------------------------------------- */
  var calModo = "dia";
  var calFecha = new Date();

  function pintarCalendario() {
    var wrap = $("#calendarWrap");
    var dias = [];

    if (calModo === "dia") {
      dias = [new Date(calFecha)];
      $("#calSubtitle").textContent = fechaLarga(calFecha);
    } else {
      var inicioSemana = new Date(calFecha);
      inicioSemana.setDate(calFecha.getDate() - ((calFecha.getDay() + 6) % 7)); // lunes
      for (var i = 0; i < 7; i++) {
        var d = new Date(inicioSemana);
        d.setDate(inicioSemana.getDate() + i);
        dias.push(d);
      }
      $("#calSubtitle").textContent = "Semana del " + dias[0].getDate() + " de " + MESES[dias[0].getMonth()] +
        " al " + dias[6].getDate() + " de " + MESES[dias[6].getMonth()];
    }

    var html = '<div class="cal-grid" style="grid-template-columns:70px repeat(' + dias.length + ',1fr)">';
    html += '<div class="cal-cell-head"></div>';
    dias.forEach(function (d) {
      var esHoy = hoyISO(d) === hoyISO();
      html += '<div class="cal-cell-head' + (esHoy ? " today" : "") + '">' +
        DIAS_C[d.getDay()] + " " + d.getDate() + "</div>";
    });

    var horaActual = new Date().getHours();
    for (var h = 0; h < 24; h++) {
      html += '<div class="cal-hour">' + fmtHoraNum(h) + "</div>";
      dias.forEach(function (d) {
        var iso = hoyISO(d);
        var ahora = (iso === hoyISO() && h === horaActual);
        var evs = eventosDelDia(iso).filter(function (t) {
          return parseInt(t.inicio.split(":")[0], 10) === h;
        });
        html += '<div class="cal-slot' + (ahora ? " now" : "") + '">' +
          evs.map(function (t) {
            return '<div class="cal-event' + (t.hecha ? " done" : "") + '" data-id="' + t.id + '" title="' +
              esc(t.titulo) + '">' + esc(t.titulo) +
              "<small>" + fmtHora(t.inicio) + (t.fin ? " - " + fmtHora(t.fin) : "") +
              " · " + completados(t) + "/" + t.estPomos + " 🍅</small></div>";
          }).join("") +
        "</div>";
      });
    }
    html += "</div>";

    var total = dias.reduce(function (a, d) { return a + eventosDelDia(hoyISO(d)).length; }, 0);
    html += '<p class="cal-legend">' + total + " actividad(es) registrada(s) automáticamente en este periodo. " +
      "Toda tarea con fecha y hora aparece aquí sin pasos extra.</p>";

    wrap.innerHTML = html;
  }

  /* ---------------------------------------------------------
     8. SONIDOS (Web Audio, sin archivos externos)
     --------------------------------------------------------- */
  var ctxAudio = null, focoNodos = null;

  function audio() {
    if (!ctxAudio) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctxAudio = new AC();
    }
    if (ctxAudio.state === "suspended") ctxAudio.resume();
    return ctxAudio;
  }

  function tono(freq, dur, vol, tipo) {
    var ac = audio(); if (!ac) return;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo || "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur + 0.05);
  }

  function sonarAlarma() {
    var s = estado.ajustes;
    if (s.alarmSound === "ninguno") return;
    var vol = s.alarmVolume / 100 * 0.35;
    var reps = Math.max(1, s.alarmRepeat);
    for (var r = 0; r < reps; r++) {
      (function (r) {
        setTimeout(function () {
          if (s.alarmSound === "campana") { tono(880, 1.2, vol, "sine"); tono(1320, 1.0, vol * .6, "sine"); }
          else if (s.alarmSound === "pitido") { tono(1000, 0.18, vol, "square"); setTimeout(function(){ tono(1000,0.18,vol,"square"); }, 250); }
          else { tono(660, 0.4, vol, "triangle"); setTimeout(function(){ tono(520,0.5,vol,"triangle"); }, 380); }
        }, r * 1500);
      })(r);
    }
  }

  function iniciarSonidoFoco() {
    detenerSonidoFoco();
    var s = estado.ajustes;
    if (s.focusSound === "ninguno") return;
    var ac = audio(); if (!ac) return;
    var vol = s.focusVolume / 100 * 0.15;

    if (s.focusSound === "reloj") {
      focoNodos = { intervalo: setInterval(function () { tono(1400, 0.03, vol, "square"); }, 1000) };
    } else {
      var buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      var datos = buf.getChannelData(0);
      for (var i = 0; i < datos.length; i++) datos[i] = (Math.random() * 2 - 1) * 0.3;
      var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      var g = ac.createGain(); g.gain.value = vol;
      src.connect(g); g.connect(ac.destination); src.start();
      focoNodos = { src: src, gain: g };
    }
  }

  function detenerSonidoFoco() {
    if (!focoNodos) return;
    if (focoNodos.intervalo) clearInterval(focoNodos.intervalo);
    if (focoNodos.src) { try { focoNodos.src.stop(); } catch (e) {} }
    focoNodos = null;
  }

  /* ---------------------------------------------------------
     9. POMODORO
     --------------------------------------------------------- */
  var pomo = {
    modo: "pomodoro",
    restante: AJUSTES_DEF.pomodoro * 60,
    corriendo: false,
    intervalo: null,
    inicioSesion: null,
    recordatorioLanzado: false
  };

  function duracion(modo) {
    var s = estado.ajustes;
    return (modo === "pomodoro" ? s.pomodoro : modo === "short" ? s.corto : s.largo) * 60;
  }

  function ponerModo(modo, autoIniciar) {
    pausar();
    pomo.modo = modo;
    pomo.restante = duracion(modo);
    pomo.recordatorioLanzado = false;
    $$(".pomo-tab").forEach(function (b) { b.classList.toggle("active", b.dataset.mode === modo); });
    pintarReloj();
    if (autoIniciar) arrancar();
  }

  function pintarReloj() {
    var m = Math.floor(pomo.restante / 60), s = pomo.restante % 60;
    var txt = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    $("#pomoTime").textContent = txt;
    $("#pomoStart").textContent = pomo.corriendo ? "PAUSE" : "START";
    $("#pomoSkip").hidden = !pomo.corriendo;
    document.title = (pomo.corriendo ? txt + " · " : "") + "Organizador · Tareas y Pomodoro";

    var t = estado.tareaActiva ? buscarTarea(estado.tareaActiva) : null;
    $("#pomoTaskName").textContent = t ? t.titulo : "Sin tarea seleccionada";
    $("#pomoRound").textContent = "#" + estado.ronda +
      (pomo.modo === "pomodoro" ? "" : pomo.modo === "short" ? " · descanso corto" : " · descanso largo");
  }

  function arrancar() {
    if (pomo.corriendo) return;
    audio();
    pomo.corriendo = true;
    pomo.inicioSesion = pomo.inicioSesion || new Date().toISOString();
    if (pomo.modo === "pomodoro") iniciarSonidoFoco();
    pomo.intervalo = setInterval(tic, 1000);
    aplicarTema();
    pintarReloj();
  }

  function pausar() {
    pomo.corriendo = false;
    clearInterval(pomo.intervalo);
    detenerSonidoFoco();
    aplicarTema();
    pintarReloj();
  }

  function tic() {
    pomo.restante--;
    var rm = estado.ajustes.reminderMin;
    if (rm > 0 && pomo.modo === "pomodoro") {
      if (estado.ajustes.reminderType === "ultimo") {
        // Avisa una sola vez cuando faltan N minutos
        if (!pomo.recordatorioLanzado && pomo.restante === rm * 60) {
          pomo.recordatorioLanzado = true;
          notificar("Recordatorio", "Quedan " + rm + " min de tu pomodoro.");
        }
      } else {
        // Avisa cada N minutos transcurridos
        var transcurrido = duracion("pomodoro") - pomo.restante;
        if (transcurrido > 0 && transcurrido % (rm * 60) === 0 && pomo.restante > 0) {
          notificar("Recordatorio", "Llevas " + (transcurrido / 60) + " min de enfoque.");
        }
      }
    }
    if (pomo.restante <= 0) { terminarBloque(); return; }
    pintarReloj();
  }

  function terminarBloque() {
    clearInterval(pomo.intervalo);
    pomo.corriendo = false;
    detenerSonidoFoco();
    sonarAlarma();

    if (pomo.modo === "pomodoro") {
      registrarSesion();
      estado.ronda++;
      var toca = (estado.ronda - 1) % estado.ajustes.longInterval === 0 ? "long" : "short";
      notificar("¡Pomodoro completado!", "Hora de un " + (toca === "long" ? "descanso largo" : "descanso corto") + ".");
      pomo.inicioSesion = null;
      ponerModo(toca, estado.ajustes.autoBreaks);
    } else {
      notificar("Descanso terminado", "A por el siguiente pomodoro.");
      pomo.inicioSesion = null;
      ponerModo("pomodoro", estado.ajustes.autoPomos);
    }
    guardar();
    refrescarTodo();
  }

  function registrarSesion() {
    var t = estado.tareaActiva ? buscarTarea(estado.tareaActiva) : null;
    if (!t) return;
    t.sesiones.push({
      inicio: pomo.inicioSesion || new Date().toISOString(),
      fin: new Date().toISOString(),
      minutos: estado.ajustes.pomodoro
    });
    if (estado.ajustes.autoCheck && completados(t) >= t.estPomos) {
      t.hecha = true;
      moverAlFinal(t);
      toast("«" + t.titulo + "» se marcó como completada.");
    }
    guardar();
    if (detalleId === t.id) abrirDetalle(t.id);
  }

  function enfocarTarea(id) {
    estado.tareaActiva = id;
    guardar();
    var t = buscarTarea(id);
    if (t) toast("Tarea activa: " + t.titulo);
    irA("pomodoro");
  }

  function pintarPomodoro() {
    pintarReloj();
    var lista = estado.tareas.filter(function (t) {
      return !t.hecha || t.fecha === hoyISO() || t.miDia;
    });
    $("#pomoTaskList").innerHTML = lista.map(function (t) {
      return '<li class="' + (t.hecha ? "done " : "") + (estado.tareaActiva === t.id ? "active" : "") +
        '" data-id="' + t.id + '">' +
        '<button class="p-check" data-act="toggle">✓</button>' +
        '<span class="p-title">' + esc(t.titulo) + "</span>" +
        '<span class="p-count"><b>' + completados(t) + "</b>/ " + t.estPomos + "</span>" +
        '<button class="icon-btn" data-act="detalle" title="Ver pomodoros">⋮</button>' +
      "</li>";
    }).join("") || '<li style="justify-content:center;color:#999">Sin tareas todavía.</li>';

    var totalHechos = estado.tareas.reduce(function (a, t) { return a + completados(t); }, 0);
    var totalEst = estado.tareas.filter(function (t) { return !t.hecha; })
      .reduce(function (a, t) { return a + t.estPomos; }, 0);
    var minutos = totalHechos * estado.ajustes.pomodoro;
    $("#pomoSummary").textContent = "Pomodoros completados: " + totalHechos +
      " · Tiempo enfocado: " + Math.floor(minutos / 60) + "h " + (minutos % 60) + "m" +
      " · Pendientes estimados: " + totalEst;
  }

  function notificar(titulo, cuerpo) {
    toast(titulo + " " + cuerpo);
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(titulo, { body: cuerpo });
      }
    } catch (e) { /* file:// puede bloquear notificaciones */ }
  }

  /* ---------------------------------------------------------
     10. AJUSTES
     --------------------------------------------------------- */
  var CAMPOS = [
    ["#setPomodoro", "pomodoro", "num"], ["#setShort", "corto", "num"], ["#setLong", "largo", "num"],
    ["#setAutoBreaks", "autoBreaks", "check"], ["#setAutoPomos", "autoPomos", "check"],
    ["#setLongInterval", "longInterval", "num"],
    ["#setAutoCheck", "autoCheck", "check"], ["#setCheckBottom", "checkBottom", "check"],
    ["#setAlarmSound", "alarmSound", "text"], ["#setAlarmVolume", "alarmVolume", "num"],
    ["#setAlarmRepeat", "alarmRepeat", "num"],
    ["#setFocusSound", "focusSound", "text"], ["#setFocusVolume", "focusVolume", "num"],
    ["#setHourFormat", "hourFormat", "text"], ["#setDarkRunning", "darkRunning", "check"],
    ["#setReminderType", "reminderType", "text"], ["#setReminderMin", "reminderMin", "num"]
  ];

  function ajustesAFormulario() {
    CAMPOS.forEach(function (c) {
      var el = $(c[0]); if (!el) return;
      if (c[2] === "check") el.checked = !!estado.ajustes[c[1]];
      else el.value = estado.ajustes[c[1]];
    });
    $$("#themeDots .dot").forEach(function (d) {
      d.classList.toggle("active", d.dataset.theme === estado.ajustes.theme);
    });
    $("#alarmVolVal").textContent = estado.ajustes.alarmVolume;
    $("#focusVolVal").textContent = estado.ajustes.focusVolume;
  }

  function formularioAAjustes() {
    CAMPOS.forEach(function (c) {
      var el = $(c[0]); if (!el) return;
      if (c[2] === "check") estado.ajustes[c[1]] = el.checked;
      else if (c[2] === "num") estado.ajustes[c[1]] = Math.max(0, parseInt(el.value, 10) || 0);
      else estado.ajustes[c[1]] = el.value;
    });
    if (estado.ajustes.pomodoro < 1) estado.ajustes.pomodoro = 1;
    if (estado.ajustes.corto < 1) estado.ajustes.corto = 1;
    if (estado.ajustes.largo < 1) estado.ajustes.largo = 1;
    if (estado.ajustes.longInterval < 1) estado.ajustes.longInterval = 1;
    if (estado.ajustes.alarmRepeat < 1) estado.ajustes.alarmRepeat = 1;
    aplicarTema();
    guardar();
  }

  function aplicarTema() {
    document.body.dataset.theme = estado.ajustes.theme;
    // "Modo oscuro al ejecutar": atenúa la interfaz mientras el temporizador corre
    document.body.classList.toggle("dimmed", !!(estado.ajustes.darkRunning && pomo.corriendo));
  }

  /* ---------------------------------------------------------
     11. EVENTOS
     --------------------------------------------------------- */
  function conectar() {
    // Navegación
    document.addEventListener("click", function (e) {
      var nav = e.target.closest("#sidebar .nav-item");
      if (nav) { irA(nav.dataset.view); return; }
    });

    // Buscar
    $("#searchInput").addEventListener("input", function () {
      busqueda = this.value.trim();
      if (vistaActual === "calendario" || vistaActual === "pomodoro") irA("tareas");
      else pintarTareas();
    });

    // Ordenar
    $("#sortBtn").addEventListener("click", function () {
      ordenAlfabetico = !ordenAlfabetico;
      toast(ordenAlfabetico ? "Orden alfabético" : "Orden por creación");
      pintarTareas();
    });

    // Nueva lista
    $("#newListBtn").addEventListener("click", function () {
      var nombre = prompt("Nombre de la nueva lista:");
      if (!nombre) return;
      var l = { id: uid(), nombre: nombre.trim() };
      estado.listas.push(l);
      guardar();
      pintarListas();
      irA("lista:" + l.id);
    });

    $("#renameListBtn").addEventListener("click", function () {
      if (vistaActual.indexOf("lista:") !== 0) return;
      var id = vistaActual.slice(6);
      var l = estado.listas.filter(function (x) { return x.id === id; })[0];
      if (!l) return;
      var nuevo = prompt("Nuevo nombre:", l.nombre);
      if (!nuevo) return;
      l.nombre = nuevo.trim();
      guardar(); pintarListas(); pintarTareas();
    });

    $("#deleteListBtn").addEventListener("click", function () {
      if (vistaActual.indexOf("lista:") !== 0) return;
      var id = vistaActual.slice(6);
      if (!confirm("¿Eliminar la lista? Sus tareas pasarán a «Tareas».")) return;
      estado.listas = estado.listas.filter(function (x) { return x.id !== id; });
      estado.tareas.forEach(function (t) { if (t.listaId === id) t.listaId = "tareas"; });
      guardar(); pintarListas(); irA("tareas");
    });

    // Agregar tarea
    function agregar() {
      var titulo = $("#newTaskInput").value.trim();
      if (!titulo) { $("#newTaskInput").focus(); return; }
      var fecha = $("#newTaskDate").value;
      var inicio = $("#newTaskStart").value;
      var fin = $("#newTaskEnd").value;
      // Si hay hora pero no fecha, se asume hoy → registro automático en calendario
      if (inicio && !fecha) fecha = hoyISO();
      var listaId = vistaActual.indexOf("lista:") === 0 ? vistaActual.slice(6) : "tareas";

      var t = nuevaTarea({
        titulo: titulo,
        listaId: listaId,
        miDia: vistaActual === "miDia" || fecha === hoyISO(),
        importante: vistaActual === "importante",
        asignada: vistaActual === "asignadas",
        fecha: fecha,
        inicio: inicio,
        fin: fin,
        estPomos: Math.max(1, parseInt($("#newTaskPomos").value, 10) || 1)
      });

      $("#newTaskInput").value = "";
      $("#newTaskStart").value = "";
      $("#newTaskEnd").value = "";
      $("#newTaskPomos").value = 1;
      $("#newTaskInput").focus();

      if (esEventoCalendario(t)) {
        toast("Agregada y registrada en el calendario: " + fmtHora(t.inicio));
      } else {
        toast("Tarea agregada");
      }
      refrescarTodo();
    }
    $("#addTaskBtn").addEventListener("click", agregar);
    $("#newTaskInput").addEventListener("keydown", function (e) { if (e.key === "Enter") agregar(); });

    // Acciones en la lista de tareas
    $("#viewTasks").addEventListener("click", function (e) {
      var li = e.target.closest(".task-item");
      if (!li) return;
      var t = buscarTarea(li.dataset.id);
      if (!t) return;
      var act = e.target.closest("[data-act]") ? e.target.closest("[data-act]").dataset.act : "detalle";

      if (act === "toggle") {
        t.hecha = !t.hecha;
        moverAlFinal(t);
        guardar(); refrescarTodo();
        if (detalleId === t.id) abrirDetalle(t.id);
      } else if (act === "star") {
        t.importante = !t.importante;
        guardar(); refrescarTodo();
      } else if (act === "enfocar") {
        enfocarTarea(t.id);
      } else {
        abrirDetalle(t.id);
      }
    });

    // Calendario
    $("#viewCalendar").addEventListener("click", function (e) {
      var seg = e.target.closest(".seg-btn");
      if (seg) {
        calModo = seg.dataset.calmode;
        $$("#viewCalendar .seg-btn").forEach(function (b) { b.classList.toggle("active", b === seg); });
        pintarCalendario(); return;
      }
      var ev = e.target.closest(".cal-event");
      if (ev) abrirDetalle(ev.dataset.id);
    });
    $("#calPrev").addEventListener("click", function () {
      calFecha.setDate(calFecha.getDate() - (calModo === "dia" ? 1 : 7)); pintarCalendario();
    });
    $("#calNext").addEventListener("click", function () {
      calFecha.setDate(calFecha.getDate() + (calModo === "dia" ? 1 : 7)); pintarCalendario();
    });
    $("#calToday").addEventListener("click", function () { calFecha = new Date(); pintarCalendario(); });

    // Pomodoro
    $$(".pomo-tab").forEach(function (b) {
      b.addEventListener("click", function () { ponerModo(b.dataset.mode, false); });
    });
    $("#pomoStart").addEventListener("click", function () {
      pomo.corriendo ? pausar() : arrancar();
    });
    $("#pomoSkip").addEventListener("click", function () {
      if (confirm("¿Saltar este bloque?")) { pomo.restante = 1; tic(); }
    });
    $("#pomoTaskList").addEventListener("click", function (e) {
      var li = e.target.closest("li[data-id]");
      if (!li) return;
      var t = buscarTarea(li.dataset.id);
      if (!t) return;
      var b = e.target.closest("[data-act]");
      if (b && b.dataset.act === "toggle") { t.hecha = !t.hecha; moverAlFinal(t); guardar(); pintarPomodoro(); return; }
      if (b && b.dataset.act === "detalle") { abrirDetalle(t.id); return; }
      estado.tareaActiva = t.id; guardar(); pintarPomodoro();
    });
    $("#clearDoneBtn").addEventListener("click", function () {
      if (!confirm("¿Eliminar todas las tareas completadas?")) return;
      estado.tareas = estado.tareas.filter(function (t) { return !t.hecha; });
      guardar(); refrescarTodo();
    });

    // Detalle
    $("#closeDetail").addEventListener("click", cerrarDetalle);

    // Ajustes
    $("#openSettings").addEventListener("click", function () {
      ajustesAFormulario();
      $("#settingsModal").classList.remove("hidden");
    });
    $("#closeSettings").addEventListener("click", function () { $("#settingsModal").classList.add("hidden"); });
    $("#settingsModal").addEventListener("click", function (e) {
      if (e.target === this) this.classList.add("hidden");
    });
    $("#saveSettings").addEventListener("click", function () {
      formularioAAjustes();
      if (!pomo.corriendo) { pomo.restante = duracion(pomo.modo); }
      $("#settingsModal").classList.add("hidden");
      toast("Configuración guardada");
      refrescarTodo(); pintarReloj();
    });
    $("#resetSettings").addEventListener("click", function () {
      if (!confirm("¿Restablecer la configuración por defecto?")) return;
      estado.ajustes = Object.assign({}, AJUSTES_DEF);
      ajustesAFormulario(); aplicarTema(); guardar();
      pomo.restante = duracion(pomo.modo); pintarReloj();
    });
    $("#themeDots").addEventListener("click", function (e) {
      var d = e.target.closest(".dot"); if (!d) return;
      estado.ajustes.theme = d.dataset.theme;
      $$("#themeDots .dot").forEach(function (x) { x.classList.toggle("active", x === d); });
      aplicarTema(); guardar();
    });
    $("#setAlarmVolume").addEventListener("input", function () {
      $("#alarmVolVal").textContent = this.value;
    });
    $("#setAlarmVolume").addEventListener("change", function () {
      estado.ajustes.alarmVolume = parseInt(this.value, 10); sonarAlarma(); guardar();
    });
    $("#setFocusVolume").addEventListener("input", function () {
      $("#focusVolVal").textContent = this.value;
    });
    $("#setAlarmSound").addEventListener("change", function () {
      estado.ajustes.alarmSound = this.value; sonarAlarma(); guardar();
    });
    $("#askNotif").addEventListener("click", function () {
      try {
        if (!("Notification" in window)) { toast("Tu navegador no soporta notificaciones."); return; }
        Notification.requestPermission().then(function (p) {
          toast(p === "granted" ? "Notificaciones activadas" : "Notificaciones no permitidas");
        });
      } catch (e) { toast("No disponible al abrir el archivo directamente."); }
    });

    // Atajos
    document.addEventListener("keydown", function (e) {
      if (e.target.matches("input,textarea,select")) return;
      if (e.code === "Space") { e.preventDefault(); pomo.corriendo ? pausar() : arrancar(); }
      if (e.key === "Escape") { cerrarDetalle(); $("#settingsModal").classList.add("hidden"); }
    });

    window.addEventListener("beforeunload", function () {
      almacenEscribir(KEY, JSON.stringify({
        tareas: estado.tareas, listas: estado.listas,
        ajustes: estado.ajustes, tareaActiva: estado.tareaActiva, ronda: estado.ronda
      }));
    });
  }

  /* ---------------------------------------------------------
     12. ARRANQUE
     --------------------------------------------------------- */
  function ejemplos() {
    if (estado.tareas.length) return;
    var hoy = hoyISO();
    [
      { titulo: "Desayuno y organizar el día", inicio: "08:00", fin: "09:00", est: 1 },
      { titulo: "Hacer la app de organización", inicio: "10:00", fin: "12:00", est: 4 },
      { titulo: "Estudiar Duolingo", inicio: "16:00", fin: "16:30", est: 1 }
    ].forEach(function (e) {
      nuevaTarea({ titulo: e.titulo, fecha: hoy, inicio: e.inicio, fin: e.fin, estPomos: e.est, miDia: true });
    });
  }

  function iniciar() {
    cargar();
    aplicarTema();
    ejemplos();
    $("#newTaskDate").value = hoyISO();
    pomo.restante = duracion("pomodoro");
    pintarListas();
    ajustesAFormulario();
    conectar();
    irA("miDia");
    pintarReloj();
    console.log("Organizador listo. Tareas cargadas:", estado.tareas.length);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  // Exponer para pruebas manuales desde la consola
  window.__organizador = { estado: estado, pomo: pomo, irA: irA };
})();
