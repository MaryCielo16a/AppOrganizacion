/* =========================================================
   Tipos del dominio
   ========================================================= */

/** Una sesión de pomodoro completada sobre una tarea. */
export interface PomodoroSession {
  /** ISO 8601 del momento en que arrancó el bloque. */
  inicio: string;
  /** ISO 8601 del momento en que terminó el bloque. */
  fin: string;
  /** Duración del bloque en minutos. */
  minutos: number;
}

/** Una tarea del organizador. */
export interface Task {
  id: string;
  titulo: string;
  nota: string;
  listaId: string;
  miDia: boolean;
  importante: boolean;
  asignada: boolean;
  hecha: boolean;
  /** 'YYYY-MM-DD'. Vacío si la tarea no tiene fecha. */
  fecha: string;
  /** 'HH:MM'. Con fecha + inicio la tarea se registra en el calendario. */
  inicio: string;
  /** 'HH:MM'. Opcional. */
  fin: string;
  /** Pomodoros estimados (denominador del contador "completados/estimados"). */
  estPomos: number;
  sesiones: PomodoroSession[];
  creada: string;
}

/** Una lista de tareas de la barra lateral. */
export interface TaskListDef {
  id: string;
  nombre: string;
  /** Las listas fijas no se pueden borrar ni renombrar. */
  fija?: boolean;
}

export type AlarmSound = 'campana' | 'pitido' | 'timbre' | 'ninguno';
export type FocusSound = 'ninguno' | 'reloj' | 'ruido';
export type ThemeName = 'magenta' | 'morado' | 'azul' | 'verde' | 'rojo';
export type HourFormat = '12' | '24';
export type ReminderType = 'ultimo' | 'cada';

/** Configuración del pomodoro (panel estilo Pomofocus). */
export interface Settings {
  pomodoro: number;
  corto: number;
  largo: number;
  autoBreaks: boolean;
  autoPomos: boolean;
  longInterval: number;
  autoCheck: boolean;
  checkBottom: boolean;
  alarmSound: AlarmSound;
  alarmVolume: number;
  alarmRepeat: number;
  focusSound: FocusSound;
  focusVolume: number;
  theme: ThemeName;
  hourFormat: HourFormat;
  darkRunning: boolean;
  reminderType: ReminderType;
  reminderMin: number;
}

/** Estado que se guarda en localStorage. */
export interface PersistedState {
  tareas: Task[];
  listas: TaskListDef[];
  ajustes: Settings;
  tareaActiva: string | null;
  ronda: number;
}

export type PomodoroMode = 'pomodoro' | 'short' | 'long';

export type BuiltinView =
  | 'miDia'
  | 'importante'
  | 'planeado'
  | 'completadas'
  | 'asignadas'
  | 'tareas'
  | 'calendario'
  | 'pomodoro';

/** Vista activa: una de las integradas o `lista:<id>` para una lista propia. */
export type ViewId = BuiltinView | `lista:${string}`;

export type CalendarMode = 'dia' | 'semana';

/** Datos con los que se crea una tarea nueva. */
export interface NewTaskInput {
  titulo: string;
  listaId?: string;
  miDia?: boolean;
  importante?: boolean;
  asignada?: boolean;
  fecha?: string;
  inicio?: string;
  fin?: string;
  estPomos?: number;
}
