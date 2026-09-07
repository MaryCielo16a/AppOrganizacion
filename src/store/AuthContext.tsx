import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string;
  clearError: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use': 'Este correo ya está registrado.',
  'auth/invalid-email': 'Correo electrónico inválido.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/invalid-credential': 'Credenciales inválidas.',
  'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
};

function firebaseError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  return ERROR_MAP[code] ?? 'Ocurrió un error. Intenta de nuevo.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }), []);

  const clearError = () => setError('');

  const login = async (email: string, password: string) => {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(firebaseError(e));
      throw e;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      setUser({ ...cred.user });
    } catch (e) {
      setError(firebaseError(e));
      throw e;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, clearError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
