/* =========================================================
   Tipos del dominio
   ========================================================= */

export type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4';

/** Un área de vida (Platzi Clase 3). */
export interface Area {
  id: string;
  name: string;
  color: string;
}

export type GoalHorizon = 'anual' | 'mensual';
export type GoalFocus = 'activo' | 'pausado' | 'completado';

/** Una meta dentro de un área de vida. */
export interface Goal {
  id: string;
  areaId: string;
  title: string;
  horizon: GoalHorizon;
  focus: GoalFocus;
}

/** Una sesión de pomodoro completada sobre una tarea. */
export interface PomodoroSession {
  /** ISO 8601 del momento en que arrancó el bloque. */
  inicio: string;
  /** ISO 8601 del momento en que terminó el bloque. */
  fin: string;
  /** Duración del bloque en minutos. */
  minutos: number;
}

/** Una subtarea dentro de una tarea principal. */
export interface Subtask {
  id: string;
  titulo: string;
  hecha: boolean;
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
  /** Cuadrante de Eisenhower (Q1-Q4). */
  quadrant: Quadrant;
  /** Área de vida asociada. */
  areaId: string;
  /** Meta asociada. */
  goalId: string;
  /** Subtareas. */
  subtareas: Subtask[];
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
  lockEnabled: boolean;
  lockPin: string;
  lockTimeout: number;
  blockedApps: string[];
}

/** Estado que se guarda en localStorage. */
export interface PersistedState {
  tareas: Task[];
  listas: TaskListDef[];
  ajustes: Settings;
  tareaActiva: string | null;
  ronda: number;
  areas: Area[];
  goals: Goal[];
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
  | 'pomodoro'
  | 'eisenhower'
  | 'areas'
  | 'rutina'
  | 'asistente'
  | 'estadisticas';

/** Vista activa: una de las integradas o `lista:<id>` para una lista propia. */
export type ViewId = BuiltinView | `lista:${string}`;

export type CalendarMode = 'dia' | 'semana' | 'mes';

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
  quadrant?: Quadrant;
  areaId?: string;
  goalId?: string;
}
