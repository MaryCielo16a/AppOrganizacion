import type { Area, PersistedState, Settings, TaskListDef } from '../types';

export const STORAGE_KEY = 'organizador.v2';

export const DEFAULT_SETTINGS: Settings = {
  pomodoro: 25,
  corto: 5,
  largo: 15,
  autoBreaks: true,
  autoPomos: true,
  longInterval: 4,
  autoCheck: true,
  checkBottom: false,
  alarmSound: 'campana',
  alarmVolume: 73,
  alarmRepeat: 1,
  focusSound: 'ninguno',
  focusVolume: 50,
  theme: 'magenta',
  hourFormat: '24',
  darkRunning: false,
  reminderType: 'ultimo',
  reminderMin: 5,
};

export const DEFAULT_LISTS: TaskListDef[] = [{ id: 'tareas', nombre: 'Tareas', fija: true }];

export const DEFAULT_AREAS: Area[] = [
  { id: 'area-laboral', name: 'Laboral', color: 'blue' },
  { id: 'area-estudio', name: 'Estudio / Tareas', color: 'purple' },
  { id: 'area-familiar', name: 'Familiar', color: 'green' },
  { id: 'area-personal', name: 'Personal', color: 'orange' },
];

export const INITIAL_STATE: PersistedState = {
  tareas: [],
  listas: DEFAULT_LISTS,
  ajustes: DEFAULT_SETTINGS,
  tareaActiva: null,
  ronda: 1,
  areas: DEFAULT_AREAS,
  goals: [],
};
