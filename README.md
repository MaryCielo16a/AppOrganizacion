# Organizador · Tareas + Calendario + Pomodoro

App de escritorio web hecha con **React + Vite + TypeScript**. Combina un gestor de tareas
estilo Microsoft To Do, un calendario que se rellena solo y un temporizador Pomodoro
estilo Pomofocus.

## Puesta en marcha

```bash
npm install     # instala las dependencias (solo la primera vez)
npm run dev     # servidor de desarrollo -> http://localhost:5173
```

Para generar la versión de producción:

```bash
npm run build   # comprueba tipos y compila a dist/
npm run preview # sirve dist/ para revisarlo antes de desplegar
```

Para generar **un único archivo HTML autocontenido** (todo el CSS y el JS inlineados,
sin ninguna referencia externa), listo para subir a cualquier hosting o abrir suelto:

```bash
npm run build:standalone   # -> dist-standalone/index.html (~198 kB)
```

Otros comandos:

```bash
npm test        # 11 pruebas de integración (vitest + jsdom)
npm run typecheck
```

> `vite.config.ts` usa `base: './'`, así que el contenido de `dist/` funciona servido
> desde cualquier ruta: la raíz de un dominio, una subcarpeta o un hosting estático.

## Qué incluye

**Barra lateral** — Mi día, Importante, Planeado, Completadas, Asignado a mí, Tareas,
Calendario, Pomodoro y tus propias listas. (No hay lista de "Comestibles".)

**Registro automático en el calendario** — En *Mi día* escribe la actividad y una hora de
inicio. Al pulsar **Agregar** (o Enter) la actividad queda registrada en el calendario al
instante, sin ningún paso adicional. Si escribes hora pero no fecha, se asume hoy.

**Calendario** — Vistas de **Día** y **Semana** con rejilla de 24 horas. Cada bloque muestra
el título, el horario y el contador de pomodoros. Al pulsar un evento se abre su detalle.

**Pomodoro por tarea** — Cada tarjeta muestra el contador `completados/estimados`
(ej. `0/3`, `4/4`). El botón **▶ Pomodoro** de una tarea la convierte en la tarea activa del
temporizador; al terminar un bloque la sesión se registra en esa tarea.

**Detalle de la tarea** — Título, notas, fecha, horas, pomodoros estimados, lista,
marcadores (Mi día / Importante / Asignada) y el **historial completo de pomodoros** con
fecha, hora y minutos de cada sesión.

**Configuración (⚙ abajo a la izquierda)** — Panel estilo Pomofocus:

- Tiempos: Pomodoro, Descanso corto, Descanso largo
- Inicio automático de descansos / de pomodoros
- Intervalo de descanso largo
- Marcar tareas automáticamente · Mover al final al completar
- Sonido de alarma (campana, pitido, timbre) con volumen y repeticiones
- Sonido de enfoque (tic-tac, ruido blanco) con volumen
- 5 temas de color, formato de hora 12/24 h
- Modo oscuro al ejecutar
- Recordatorio de notificación (último N min / cada N min)

**Persistencia** — Tareas, listas, pomodoros y configuración se guardan en `localStorage`
bajo la clave `organizador.v2`. Si `localStorage` no estuviera disponible, la app cae a un
respaldo en memoria y sigue funcionando durante la sesión.

## Atajos

| Tecla | Acción |
|---|---|
| `Enter` (en el campo de tarea) | Agregar tarea |
| `Espacio` | Iniciar / pausar el temporizador |
| `Esc` | Cerrar el detalle o la configuración |

## Estructura del proyecto

```
src/
  main.tsx                 punto de entrada
  App.tsx                  layout, tema, atajos de teclado
  types.ts                 Task, PomodoroSession, Settings, ViewId...
  styles.css               estilos y temas de color
  store/
    AppContext.tsx         Context + useReducer, estado de UI y derivados
    reducer.ts             acciones del dominio e hidratación
    defaults.ts            ajustes por defecto y clave de localStorage
  hooks/
    useLocalStorage.ts     persistencia (usePersistentReducer)
    usePomodoro.ts         temporizador, modos y cierre de bloque
  utils/
    date.ts                fechas, formato 12/24 h
    sound.ts               alarma y sonido de enfoque (Web Audio)
  components/
    Sidebar.tsx  TaskList.tsx  TaskItem.tsx  TaskDetail.tsx
    Calendar.tsx  PomodoroTimer.tsx  SettingsPanel.tsx  Toast.tsx
  App.test.tsx             pruebas de integración
legacy/                    versión anterior en HTML/CSS/JS puro (se puede borrar)
dist/                      build de producción (HTML + assets)
dist-standalone/           build de un solo archivo autocontenido
vite.config.ts             config del build normal (base: './')
vite.config.standalone.ts  config del build de un solo archivo
```

El estado se gestiona con **Context + useReducer**: el reducer (`store/reducer.ts`) es el
único sitio donde muta el dominio, y `usePersistentReducer` se encarga de leer y escribir
en `localStorage` con un pequeño debounce.

## Notas

- Los datos se guardan por navegador: Chrome y Firefox tendrán cada uno su propia copia.
- Los sonidos se generan con Web Audio, no hay archivos de audio. El navegador solo permite
  reproducirlos después del primer clic en la página.
- Para empezar de cero: en la consola del navegador (F12) ejecuta
  `localStorage.removeItem('organizador.v2')` y recarga.
- La carpeta `legacy/` guarda la versión anterior en HTML/JS puro. Ya no se usa; puedes
  borrarla cuando quieras.
