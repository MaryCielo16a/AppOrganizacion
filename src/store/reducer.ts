import type {
  NewTaskInput,
  PersistedState,
  PomodoroSession,
  Settings,
  Task,
  TaskListDef,
} from '../types';
import { DEFAULT_LISTS, DEFAULT_SETTINGS, INITIAL_STATE } from './defaults';
import { hoyISO } from '../utils/date';

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export type Action =
  | { type: 'ADD_TASK'; input: NewTaskInput }
  | { type: 'UPDATE_TASK'; id: string; patch: Partial<Task> }
  | { type: 'TOGGLE_TASK'; id: string }
  | { type: 'DELETE_TASK'; id: string }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'ADD_SESSION'; taskId: string; session: PomodoroSession }
  | { type: 'SET_ACTIVE_TASK'; id: string | null }
  | { type: 'ADD_LIST'; nombre: string; id?: string }
  | { type: 'RENAME_LIST'; id: string; nombre: string }
  | { type: 'DELETE_LIST'; id: string }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings> }
  | { type: 'RESET_SETTINGS' }
  | { type: 'NEXT_ROUND' }
  | { type: 'SEED_EXAMPLES' }
  | { type: 'LOAD_CLOUD'; state: PersistedState };

/** Mueve una tarea completada al final si el ajuste está activo. */
function reordenar(tareas: Task[], id: string, ajustes: Settings): Task[] {
  const t = tareas.find((x) => x.id === id);
  if (!t || !ajustes.checkBottom || !t.hecha) return tareas;
  return [...tareas.filter((x) => x.id !== id), t];
}

function crearTarea(input: NewTaskInput): Task {
  return {
    id: uid(),
    titulo: input.titulo,
    nota: '',
    listaId: input.listaId ?? 'tareas',
    miDia: input.miDia ?? false,
    importante: input.importante ?? false,
    asignada: input.asignada ?? false,
    hecha: false,
    fecha: input.fecha ?? '',
    inicio: input.inicio ?? '',
    fin: input.fin ?? '',
    estPomos: Math.max(1, input.estPomos ?? 1),
    sesiones: [],
    creada: new Date().toISOString(),
  };
}

export function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case 'ADD_TASK':
      return { ...state, tareas: [crearTarea(action.input), ...state.tareas] };

    case 'UPDATE_TASK':
      return {
        ...state,
        tareas: state.tareas.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
      };

    case 'TOGGLE_TASK': {
      const tareas = state.tareas.map((t) =>
        t.id === action.id ? { ...t, hecha: !t.hecha } : t,
      );
      return { ...state, tareas: reordenar(tareas, action.id, state.ajustes) };
    }

    case 'DELETE_TASK':
      return {
        ...state,
        tareas: state.tareas.filter((t) => t.id !== action.id),
        tareaActiva: state.tareaActiva === action.id ? null : state.tareaActiva,
      };

    case 'CLEAR_COMPLETED': {
      const tareas = state.tareas.filter((t) => !t.hecha);
      const sigueViva = tareas.some((t) => t.id === state.tareaActiva);
      return { ...state, tareas, tareaActiva: sigueViva ? state.tareaActiva : null };
    }

    case 'ADD_SESSION': {
      const tareas = state.tareas.map((t) => {
        if (t.id !== action.taskId) return t;
        const sesiones = [...t.sesiones, action.session];
        // "Marcar tareas automáticamente": se completa al alcanzar los estimados.
        const hecha = state.ajustes.autoCheck ? sesiones.length >= t.estPomos : t.hecha;
        return { ...t, sesiones, hecha };
      });
      return { ...state, tareas: reordenar(tareas, action.taskId, state.ajustes) };
    }

    case 'SET_ACTIVE_TASK':
      return { ...state, tareaActiva: action.id };

    case 'ADD_LIST': {
      const nueva: TaskListDef = { id: action.id ?? uid(), nombre: action.nombre };
      return { ...state, listas: [...state.listas, nueva] };
    }

    case 'RENAME_LIST':
      return {
        ...state,
        listas: state.listas.map((l) => (l.id === action.id ? { ...l, nombre: action.nombre } : l)),
      };

    case 'DELETE_LIST':
      return {
        ...state,
        listas: state.listas.filter((l) => l.id !== action.id),
        // Las tareas huérfanas vuelven a la lista fija "Tareas".
        tareas: state.tareas.map((t) => (t.listaId === action.id ? { ...t, listaId: 'tareas' } : t)),
      };

    case 'UPDATE_SETTINGS': {
      const ajustes = normalizarAjustes({ ...state.ajustes, ...action.patch });
      return { ...state, ajustes };
    }

    case 'RESET_SETTINGS':
      return { ...state, ajustes: DEFAULT_SETTINGS };

    case 'NEXT_ROUND':
      return { ...state, ronda: state.ronda + 1 };

    case 'LOAD_CLOUD':
      return action.state;

    case 'SEED_EXAMPLES': {
      if (state.tareas.length > 0) return state;
      const hoy = hoyISO();
      const ejemplos: NewTaskInput[] = [
        { titulo: 'Estudiar Duolingo', fecha: hoy, inicio: '16:00', fin: '16:30', estPomos: 1, miDia: true },
        { titulo: 'Hacer la app de organización', fecha: hoy, inicio: '10:00', fin: '12:00', estPomos: 4, miDia: true },
        { titulo: 'Desayuno y organizar el día', fecha: hoy, inicio: '08:00', fin: '09:00', estPomos: 1, miDia: true },
      ];
      return { ...state, tareas: ejemplos.map(crearTarea) };
    }

    default:
      return state;
  }
}

export function normalizarAjustes(a: Settings): Settings {
  return {
    ...a,
    pomodoro: Math.max(1, Math.round(a.pomodoro) || 1),
    corto: Math.max(1, Math.round(a.corto) || 1),
    largo: Math.max(1, Math.round(a.largo) || 1),
    longInterval: Math.max(1, Math.round(a.longInterval) || 1),
    alarmRepeat: Math.max(1, Math.round(a.alarmRepeat) || 1),
    alarmVolume: Math.min(100, Math.max(0, Math.round(a.alarmVolume) || 0)),
    focusVolume: Math.min(100, Math.max(0, Math.round(a.focusVolume) || 0)),
    reminderMin: Math.min(60, Math.max(0, Math.round(a.reminderMin) || 0)),
  };
}

/**
 * Repara el estado leído de localStorage: rellena campos que falten
 * (p. ej. datos guardados por una versión anterior de la app).
 */
export function hydrate(guardado: PersistedState): PersistedState {
  if (!guardado || typeof guardado !== 'object') return INITIAL_STATE;
  const tareas = Array.isArray(guardado.tareas) ? guardado.tareas : [];
  const listas =
    Array.isArray(guardado.listas) && guardado.listas.length > 0 ? guardado.listas : DEFAULT_LISTS;
  return {
    tareas: tareas.map((t) => ({
      ...crearTarea({ titulo: t?.titulo ?? '(sin título)' }),
      ...t,
      sesiones: Array.isArray(t?.sesiones) ? t.sesiones : [],
      estPomos: Math.max(1, Number(t?.estPomos) || 1),
    })),
    listas,
    ajustes: normalizarAjustes({ ...DEFAULT_SETTINGS, ...(guardado.ajustes ?? {}) }),
    tareaActiva: guardado.tareaActiva ?? null,
    ronda: Number(guardado.ronda) > 0 ? Number(guardado.ronda) : 1,
  };
}
