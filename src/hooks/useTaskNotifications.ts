import { useEffect, useRef } from 'react';
import type { Settings, Task } from '../types';
import { hoyISO } from '../utils/date';
import { notificar, sonarAlarma } from '../utils/sound';

/**
 * Revisa cada 30 s las tareas del día con horario y dispara
 * una notificación del navegador + toast cuando una tarea empieza o termina.
 */
export function useTaskNotifications(
  tareas: Task[],
  ajustes: Settings,
  showToast: (msg: string) => void,
) {
  const notifiedStart = useRef<Set<string>>(new Set());
  const notifiedEnd = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      const hoy = hoyISO();
      const now = new Date();
      const nowHHMM =
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0');

      for (const t of tareas) {
        if (t.hecha || t.fecha !== hoy || !t.inicio) continue;

        if (t.inicio === nowHHMM && !notifiedStart.current.has(t.id)) {
          notifiedStart.current.add(t.id);
          notificar('🔔 Tarea iniciada', `Es hora de: ${t.titulo}`);
          showToast(`🔔 Empieza: ${t.titulo}`);
          sonarAlarma(ajustes);
        }

        if (t.fin && t.fin === nowHHMM && !notifiedEnd.current.has(t.id)) {
          notifiedEnd.current.add(t.id);
          notificar('✅ Tarea finalizada', `Terminó el tiempo de: ${t.titulo}`);
          showToast(`✅ Finalizó: ${t.titulo}`);
          sonarAlarma(ajustes);
        }
      }
    };

    check();
    const id = window.setInterval(check, 30_000);

    return () => window.clearInterval(id);
  }, [tareas, ajustes, showToast]);

  useEffect(() => {
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = window.setTimeout(() => {
      notifiedStart.current.clear();
      notifiedEnd.current.clear();
    }, msToMidnight);
    return () => window.clearTimeout(timer);
  }, []);
}
