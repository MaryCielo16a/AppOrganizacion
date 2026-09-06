import { useEffect, useReducer, useRef, useState } from 'react';
import type { Dispatch, Reducer } from 'react';

/* =========================================================
   Persistencia en localStorage
   Si localStorage no está disponible (modo privado, file://
   con restricciones) cae a un respaldo en memoria para que
   la app siga funcionando durante la sesión.
   ========================================================= */

const memoria = new Map<string, string>();

export function readStorage<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = memoria.get(key) ?? null;
  }
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn('[organizador] no se pudieron leer los datos guardados:', e);
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch (e) {
    console.warn('[organizador] no se pudo serializar el estado:', e);
    return;
  }
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // Sin almacenamiento (modo privado, cuota llena, contexto restringido):
    // la app sigue funcionando con el respaldo en memoria.
    memoria.set(key, raw);
  }
}

export function clearStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    memoria.delete(key);
  }
}

/** Hook clásico `useState` con espejo en localStorage. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, initial));
  useEffect(() => {
    writeStorage(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

/**
 * `useReducer` que hidrata desde localStorage al montar y guarda
 * (con un pequeño debounce) en cada cambio de estado.
 */
export function usePersistentReducer<S, A>(
  key: string,
  reducer: Reducer<S, A>,
  initial: S,
  hydrate: (guardado: S) => S = (s) => s,
): [S, Dispatch<A>] {
  const [state, dispatch] = useReducer(reducer, initial, (base) => hydrate(readStorage(key, base)));
  const primeraVez = useRef(true);

  useEffect(() => {
    // No reescribir en el primer render: no aporta nada y evita
    // machacar datos si la hidratación fallara.
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    const id = window.setTimeout(() => writeStorage(key, state), 150);
    return () => window.clearTimeout(id);
  }, [key, state]);

  return [state, dispatch];
}
