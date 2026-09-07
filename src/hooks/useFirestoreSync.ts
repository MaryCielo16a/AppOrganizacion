import { useEffect, useRef, useCallback } from 'react';
import type { Dispatch } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { PersistedState } from '../types';
import type { Action } from '../store/reducer';
import { hydrate } from '../store/reducer';

const DEBOUNCE = 800;

export function useFirestoreSync(
  uid: string | null,
  state: PersistedState,
  dispatch: Dispatch<Action>,
) {
  const guardadoRef = useRef(false);
  const skipNextSave = useRef(false);

  // Cargar datos del usuario al iniciar sesión
  useEffect(() => {
    if (!uid) return;
    let cancelado = false;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'usuarios', uid));
        if (cancelado) return;
        if (snap.exists()) {
          const datos = hydrate(snap.data() as PersistedState);
          skipNextSave.current = true;
          dispatch({ type: 'LOAD_CLOUD', state: datos });
        }
      } catch (e) {
        console.warn('[firestore] error al cargar datos:', e);
      } finally {
        guardadoRef.current = true;
      }
    })();

    return () => { cancelado = true; };
  }, [uid, dispatch]);

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
}
