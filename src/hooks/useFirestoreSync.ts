import { useEffect, useRef, useCallback, useState } from 'react';
import type { Dispatch } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { PersistedState } from '../types';
import type { Action } from '../store/reducer';
import { hydrate } from '../store/reducer';
import { hoyISO } from '../utils/date';

const DEBOUNCE = 800;
const MI_DIA_KEY = 'organizador.lastMiDiaReset.v5';

function resetMiDiaSiNuevoDia(datos: PersistedState): { state: PersistedState; changed: boolean } {
  const hoy = hoyISO();
  try {
    const last = localStorage.getItem(MI_DIA_KEY);
    if (last === hoy) return { state: datos, changed: false };
    const tareas = datos.tareas.map((t) => (t.miDia ? { ...t, miDia: false } : t));
    localStorage.setItem(MI_DIA_KEY, hoy);
    return { state: { ...datos, tareas }, changed: true };
  } catch {
    return { state: datos, changed: false };
  }
}

export function useFirestoreSync(
  uid: string | null,
  state: PersistedState,
  dispatch: Dispatch<Action>,
): boolean {
  const guardadoRef = useRef(false);
  const skipNextSave = useRef(false);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // Cargar datos del usuario al iniciar sesión
  useEffect(() => {
    if (!uid) return;
    let cancelado = false;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'usuarios', uid));
        if (cancelado) return;
        if (snap.exists()) {
          let datos = hydrate(snap.data() as PersistedState);
          const { state: reset, changed } = resetMiDiaSiNuevoDia(datos);
          datos = reset;
          // Si hubo reset, permitir que se guarde de vuelta a Firestore
          if (!changed) skipNextSave.current = true;
          dispatch({ type: 'LOAD_CLOUD', state: datos });
        }
      } catch (e) {
        console.warn('[firestore] error al cargar datos:', e);
      } finally {
        guardadoRef.current = true;
        if (!cancelado) setCloudLoaded(true);
      }
    })();

    return () => { cancelado = true; };
  }, [uid, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar datos cuando cambian
  const guardar = useCallback(
    async (datos: PersistedState) => {
      if (!uid) return;
      try {
        await setDoc(doc(db, 'usuarios', uid), datos);
      } catch (e) {
        console.warn('[firestore] error al guardar:', e);
      }
    },
    [uid],
  );

  useEffect(() => {
    if (!uid || !guardadoRef.current) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const id = window.setTimeout(() => guardar(state), DEBOUNCE);
    return () => window.clearTimeout(id);
  }, [uid, state, guardar]);

  return cloudLoaded;
}
