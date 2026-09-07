import { useState } from 'react';
import { useAuth } from '../store/AuthContext';

export function AuthScreen() {
  const { login, register, error, clearError } = useAuth();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiarModo = (m: 'login' | 'registro') => {
    setModo(m);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      if (modo === 'login') {
        await login(email, password);
      } else {
        await register(nombre, email, password);
      }
    } catch {
      // error ya se muestra via context
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth-backdrop">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">📋</div>
        <h1 className="auth-title">Mi Organizador</h1>
        <p className="auth-subtitle">Tareas · Calendario · Pomodoro</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${modo === 'login' ? 'active' : ''}`}
            onClick={() => cambiarModo('login')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={`auth-tab ${modo === 'registro' ? 'active' : ''}`}
            onClick={() => cambiarModo('registro')}
          >
            Registrarse
          </button>
        </div>

        {modo === 'registro' && (
          <input
            className="auth-input"
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            autoComplete="name"
          />
        )}
        <input
          className="auth-input"
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-submit" type="submit" disabled={enviando}>
          {enviando ? 'Cargando...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  );
}
