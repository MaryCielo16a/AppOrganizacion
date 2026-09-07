import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { CalendarMode, PersistedState, Task, ViewId } from '../types';
import type { Action } from './reducer';
import { hydrate, reducer } from './reducer';
import { INITIAL_STATE, STORAGE_KEY } from './defaults';
import { usePersistentReducer } from '../hooks/useLocalStorage';
import { usePomodoro } from '../hooks/usePomodoro';
import type { PomodoroApi } from '../hooks/usePomodoro';
import { useFirestoreSync } from '../hooks/useFirestoreSync';
import { useAuth } from './AuthContext';
import { hoyISO } from '../utils/date';

export const TITULOS: Record<string, string> = {
  miDia: 'Mi día',
  importante: 'Importante',
  planeado: 'Planeado',
  completadas: 'Completadas',
  asignadas: 'Asignado a mí',
  tareas: 'Tareas',
  calendario: 'Calendario',
  pomodoro: 'Pomodoro',
};

interface AppContextValue {
  state: PersistedState;
  dispatch: Dispatch<Action>;
  pomodoro: PomodoroApi;

  // Estado de interfaz (no se persiste)
  vista: ViewId;
  irA: (vista: ViewId) => void;
  busqueda: string;
  setBusqueda: (q: string) => void;
  ordenAlfabetico: boolean;
  alternarOrden: () => void;
  detalleId: string | null;
  abrirDetalle: (id: string) => void;
  cerrarDetalle: () => void;
  ajustesAbiertos: boolean;
  setAjustesAbiertos: (v: boolean) => void;
  sidebarAbierto: boolean;
  setSidebarAbierto: (v: boolean) => void;
  calModo: CalendarMode;
  setCalModo: (m: CalendarMode) => void;
  calFecha: Date;
  setCalFecha: (d: Date) => void;
  toast: string;
  showToast: (msg: string) => void;

  // Derivados
  tareasVisibles: Task[];
  tareaActiva: Task | null;
  nombreLista: (id: string) => string;
  eventosDelDia: (iso: string) => Task[];
  tituloVista: string;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Una tarea aparece en el calendario en cuanto tiene fecha + hora de inicio. */
export function esEventoCalendario(t: Task): boolean {
  return Boolean(t.fecha && t.inicio);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = usePersistentReducer(STORAGE_KEY, reducer, INITIAL_STATE, hydrate);

  useFirestoreSync(user?.uid ?? null, state, dispatch);

  const [vista, setVista] = useState<ViewId>('miDia');
  const [busqueda, setBusqueda] = useState('');
  const [ordenAlfabetico, setOrdenAlfabetico] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [calModo, setCalModo] = useState<CalendarMode>('dia');
  const [calFecha, setCalFecha] = useState<Date>(() => new Date());
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2800);
  }, []);

  const pomodoro = usePomodoro(state, dispatch, showToast);

  // Datos de ejemplo la primera vez que se abre la app.
  const sembrado = useRef(false);
  useEffect(() => {
    if (sembrado.current) return;
    sembrado.current = true;
    dispatch({ type: 'SEED_EXAMPLES' });
  }, [dispatch]);

  const irA = useCallback((v: ViewId) => {
    setVista(v);
    setSidebarAbierto(false);
  }, []);
  const alternarOrden = useCallback(() => setOrdenAlfabetico((v) => !v), []);
  const abrirDetalle = useCallback((id: string) => setDetalleId(id), []);
  const cerrarDetalle = useCallback(() => setDetalleId(null), []);

  const nombreLista = useCallback(
    (id: string) => state.listas.find((l) => l.id === id)?.nombre ?? 'Tareas',
    [state.listas],
  );

  const eventosDelDia = useCallback(
    (iso: string) =>
      state.tareas
        .filter((t) => esEventoCalendario(t) && t.fecha === iso)
        .sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [state.tareas],
  );

  const tareasVisibles = useMemo(() => {
    let lista = [...state.tareas];

    if (busqueda) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(
        (t) => t.titulo.toLowerCase().includes(q) || t.nota.toLowerCase().includes(q),
      );
    }

    const hoy = hoyISO();
    if (vista === 'miDia') lista = lista.filter((t) => t.miDia || t.fecha === hoy);
    else if (vista === 'importante') lista = lista.filter((t) => t.importante);
    else if (vista === 'completadas') lista = lista.filter((t) => t.hecha);
    else if (vista === 'asignadas') lista = lista.filter((t) => t.asignada);
    else if (vista === 'planeado') {
      lista = lista
        .filter((t) => Boolean(t.fecha))
        .sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio));
    } else if (vista.startsWith('lista:')) {
      const id = vista.slice(6);
      lista = lista.filter((t) => t.listaId === id);
    }

    if (ordenAlfabetico) {
      lista = [...lista].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
    }
    return lista;
  }, [busqueda, ordenAlfabetico, state.tareas, vista]);

  const tareaActiva = useMemo(
    () => state.tareas.find((t) => t.id === state.tareaActiva) ?? null,
    [state.tareaActiva, state.tareas],
  );

  const tituloVista = useMemo(
    () => (vista.startsWith('lista:') ? nombreLista(vista.slice(6)) : (TITULOS[vista] ?? 'Tareas')),
    [nombreLista, vista],
  );

  // Si la tarea abierta en el detalle desaparece, se cierra el panel.
  useEffect(() => {
    if (detalleId && !state.tareas.some((t) => t.id === detalleId)) setDetalleId(null);
  }, [detalleId, state.tareas]);

  const value: AppContextValue = {
    state,
    dispatch,
    pomodoro,
    vista,
    irA,
    busqueda,
    setBusqueda,
    ordenAlfabetico,
    alternarOrden,
    detalleId,
    abrirDetalle,
    cerrarDetalle,
    ajustesAbiertos,
    setAjustesAbiertos,
    sidebarAbierto,
    setSidebarAbierto,
    calModo,
    setCalModo,
    calFecha,
    setCalFecha,
    toast,
    showToast,
    tareasVisibles,
    tareaActiva,
    nombreLista,
    eventosDelDia,
    tituloVista,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
