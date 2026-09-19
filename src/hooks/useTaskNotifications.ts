import { useEffect, useRef } from 'react';
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import type { Settings, Task } from '../types';
import { db } from '../firebase';
import { hoyISO } from '../utils/date';
import { notificar, sonarAlarma } from '../utils/sound';
import { scheduleBatch, type ScheduledNotif } from '../utils/swNotify';

/**
 * Revisa las tareas del día con horario y:
 * 1. Programa notificaciones en el Service Worker (fallback local)
 * 2. Escribe notificaciones pendientes en Firestore para Cloud Functions + FCM
 * 3. Chequea cada 30 s en primer plano para el toast + sonido
 */
export function useTaskNotifications(
  tareas: Task[],
  ajustes: Settings,
  showToast: (msg: string) => void,
  uid: string | null,
) {
  const notifiedStart = useRef<Set<string>>(new Set());
  const notifiedEnd = useRef<Set<string>>(new Set());

  // Schedule notifications in SW + Firestore whenever tasks change
  useEffect(() => {
    const hoy = hoyISO();
    const now = Date.now();
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    const batch: ScheduledNotif[] = [];

    for (const t of tareas) {
      if (t.hecha || t.fecha !== hoy || !t.inicio) continue;

      const [sh, sm] = t.inicio.split(':').map(Number);
      const startMs = new Date(year, month, day, sh, sm).getTime();
      if (startMs > now) {
        batch.push({
          id: `task-start-${t.id}`,
          title: '\u{1F514} Tarea iniciada',
          body: `Es hora de: ${t.titulo}`,
          triggerAt: startMs,
        });
      }

      if (t.fin) {
        const [eh, em] = t.fin.split(':').map(Number);
        const endMs = new Date(year, month, day, eh, em).getTime();
        if (endMs > now) {
          batch.push({
            id: `task-end-${t.id}`,
            title: '✅ Tarea finalizada',
            body: `Terminó el tiempo de: ${t.titulo}`,
            triggerAt: endMs,
          });
        }
      }
    }

    scheduleBatch(batch);

    if (uid) {
      void syncPushToFirestore(uid, batch);
    }
  }, [tareas, uid]);

  // Re-send batch to SW when page becomes visible (mobile resume)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const hoy = hoyISO();
      const now = Date.now();
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();
      const items: ScheduledNotif[] = [];
      for (const t of tareas) {
        if (t.hecha || t.fecha !== hoy || !t.inicio) continue;
        const [sh, sm] = t.inicio.split(':').map(Number);
        const startMs = new Date(year, month, day, sh, sm).getTime();
        if (startMs > now) {
          items.push({ id: `task-start-${t.id}`, title: '\u{1F514} Tarea iniciada', body: `Es hora de: ${t.titulo}`, triggerAt: startMs });
        }
        if (t.fin) {
          const [eh, em] = t.fin.split(':').map(Number);
          const endMs = new Date(year, month, day, eh, em).getTime();
          if (endMs > now) {
            items.push({ id: `task-end-${t.id}`, title: '✅ Tarea finalizada', body: `Terminó el tiempo de: ${t.titulo}`, triggerAt: endMs });
          }
        }
      }
      scheduleBatch(items);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [tareas]);

  // In-app check for toast + sound (only when page is visible)
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      const hoy = hoyISO();
      const now = new Date();
      const nowHHMM =
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0');

      for (const t of tareas) {
        if (t.hecha || t.fecha !== hoy || !t.inicio) continue;

        if (t.inicio === nowHHMM && !notifiedStart.current.has(t.id)) {
          notifiedStart.current.add(t.id);
          notificar('\u{1F514} Tarea iniciada', `Es hora de: ${t.titulo}`);
          showToast(`\u{1F514} Empieza: ${t.titulo}`);
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

async function syncPushToFirestore(uid: string, pending: ScheduledNotif[]) {
  try {
    const col = collection(db, 'usuarios', uid, 'notificaciones_push');
    const existing = await getDocs(col);
    const batch = writeBatch(db);

    existing.docs.forEach((d) => batch.delete(d.ref));

    for (const n of pending) {
      const ref = doc(col, n.id);
      batch.set(ref, {
        title: n.title,
        body: n.body,
        triggerAt: Timestamp.fromMillis(n.triggerAt),
        sent: false,
      });
    }

    await batch.commit();
  } catch (err) {
    console.warn('[push] sync error:', err);
  }
}
