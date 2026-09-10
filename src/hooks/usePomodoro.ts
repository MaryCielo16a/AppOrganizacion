import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { PersistedState, PomodoroMode } from '../types';
import type { Action } from '../store/reducer';
import { getAudioContext, iniciarSonidoFoco, notificar, sonarAlarma } from '../utils/sound';
import type { FocusHandle } from '../utils/sound';
import { scheduleNotification, cancelNotification } from '../utils/swNotify';

export interface PomodoroApi {
  modo: PomodoroMode;
  /** Segundos restantes del bloque actual. */
  restante: number;
  corriendo: boolean;
  arrancar: () => void;
  pausar: () => void;
  alternar: () => void;
  ponerModo: (modo: PomodoroMode, autoIniciar?: boolean) => void;
  saltar: () => void;
}

export function usePomodoro(
  state: PersistedState,
  dispatch: Dispatch<Action>,
  showToast: (msg: string) => void,
): PomodoroApi {
  const [modo, setModo] = useState<PomodoroMode>('pomodoro');
  const [restante, setRestante] = useState<number>(() => state.ajustes.pomodoro * 60);
  const [corriendo, setCorriendo] = useState(false);

  // Refs para leer siempre el estado más reciente dentro del intervalo.
  const stateRef = useRef(state);
  stateRef.current = state;
  const modoRef = useRef(modo);
  modoRef.current = modo;

  const inicioSesionRef = useRef<string | null>(null);
  const focoRef = useRef<FocusHandle | null>(null);
  const recordatorioRef = useRef(false);
  const terminarRef = useRef<() => void>(() => undefined);

  const duracion = useCallback((m: PomodoroMode): number => {
    const a = stateRef.current.ajustes;
    const min = m === 'pomodoro' ? a.pomodoro : m === 'short' ? a.corto : a.largo;
    return min * 60;
  }, []);

  const pararFoco = useCallback(() => {
    focoRef.current?.stop();
    focoRef.current = null;
  }, []);

  const pausar = useCallback(() => {
    setCorriendo(false);
    pararFoco();
    cancelNotification('pomodoro-end');
  }, [pararFoco]);

  const arrancar = useCallback(() => {
    getAudioContext();
    if (modoRef.current === 'pomodoro') {
      inicioSesionRef.current = inicioSesionRef.current ?? new Date().toISOString();
      pararFoco();
      focoRef.current = iniciarSonidoFoco(stateRef.current.ajustes);
    }
    setCorriendo(true);
  }, [pararFoco]);

  const ponerModo = useCallback(
    (m: PomodoroMode, autoIniciar = false) => {
      pausar();
      setModo(m);
      modoRef.current = m;
      setRestante(duracion(m));
      recordatorioRef.current = false;
      if (autoIniciar) arrancar();
    },
    [arrancar, duracion, pausar],
  );

  const terminar = useCallback(() => {
    setCorriendo(false);
    pararFoco();
    cancelNotification('pomodoro-end');
    const a = stateRef.current.ajustes;
    sonarAlarma(a);

    if (modoRef.current === 'pomodoro') {
      const activa = stateRef.current.tareaActiva;
      if (activa) {
        dispatch({
          type: 'ADD_SESSION',
          taskId: activa,
          session: {
            inicio: inicioSesionRef.current ?? new Date().toISOString(),
            fin: new Date().toISOString(),
            minutos: a.pomodoro,
          },
        });
      }
      dispatch({ type: 'NEXT_ROUND' });

      const siguienteRonda = stateRef.current.ronda + 1;
      const toca: PomodoroMode = (siguienteRonda - 1) % a.longInterval === 0 ? 'long' : 'short';
      const texto = toca === 'long' ? 'descanso largo' : 'descanso corto';
      notificar('¡Pomodoro completado!', `Hora de un ${texto}.`);
      showToast(`Pomodoro completado. Hora de un ${texto}.`);
      inicioSesionRef.current = null;
      ponerModo(toca, a.autoBreaks);
    } else {
      notificar('Descanso terminado', 'A por el siguiente pomodoro.');
      showToast('Descanso terminado. A por el siguiente pomodoro.');
      inicioSesionRef.current = null;
      ponerModo('pomodoro', a.autoPomos);
    }
  }, [dispatch, pararFoco, ponerModo, showToast]);

  terminarRef.current = terminar;

  /** Recordatorio de notificación (último N min / cada N min). */
  const revisarRecordatorio = useCallback((segundosRestantes: number) => {
    const a = stateRef.current.ajustes;
    if (a.reminderMin <= 0 || modoRef.current !== 'pomodoro') return;

    if (a.reminderType === 'ultimo') {
      if (!recordatorioRef.current && segundosRestantes === a.reminderMin * 60) {
        recordatorioRef.current = true;
        notificar('Recordatorio', `Quedan ${a.reminderMin} min de tu pomodoro.`);
      }
      return;
    }
    const transcurrido = a.pomodoro * 60 - segundosRestantes;
    if (transcurrido > 0 && transcurrido % (a.reminderMin * 60) === 0) {
      notificar('Recordatorio', `Llevas ${transcurrido / 60} min de enfoque.`);
    }
  }, []);

  // Schedule SW notification when timer starts
  useEffect(() => {
    if (!corriendo) return;
    const label = modoRef.current === 'pomodoro' ? 'Pomodoro completado' : 'Descanso terminado';
    const body = modoRef.current === 'pomodoro'
      ? 'Es hora de tomar un descanso.'
      : 'A por el siguiente pomodoro.';
    scheduleNotification('pomodoro-end', `\u{1F345} ${label}`, body, Date.now() + restante * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corriendo]);

  // Tic del temporizador.
  useEffect(() => {
    if (!corriendo) return;
    const id = window.setInterval(() => {
      setRestante((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          // Fuera del setState para no despachar durante el render.
          window.setTimeout(() => terminarRef.current(), 0);
          return 0;
        }
        revisarRecordatorio(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [corriendo, revisarRecordatorio]);

  // Re-schedule SW notification when leaving the app (keeps it accurate)
  useEffect(() => {
    if (!corriendo) return;
    const onHide = () => {
      if (!document.hidden) return;
      const label = modoRef.current === 'pomodoro' ? 'Pomodoro completado' : 'Descanso terminado';
      const body = modoRef.current === 'pomodoro'
        ? 'Es hora de tomar un descanso.'
        : 'A por el siguiente pomodoro.';
      scheduleNotification('pomodoro-end', `\u{1F345} ${label}`, body, Date.now() + restante * 1000);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [corriendo, restante]);

  // Si cambian las duraciones en ajustes y el reloj está parado, se refleja al momento.
  // (No incluimos `corriendo` en las dependencias a propósito: pausar no debe reiniciar el bloque.)
  useEffect(() => {
    if (!corriendo) setRestante(duracion(modo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ajustes.pomodoro, state.ajustes.corto, state.ajustes.largo, modo, duracion]);

  // Limpieza al desmontar.
  useEffect(() => () => pararFoco(), [pararFoco]);

  const alternar = useCallback(() => {
    if (corriendo) pausar();
    else arrancar();
  }, [arrancar, corriendo, pausar]);

  const saltar = useCallback(() => {
    terminarRef.current();
  }, []);

  return { modo, restante, corriendo, arrancar, pausar, alternar, ponerModo, saltar };
}
