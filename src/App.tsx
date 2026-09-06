import { useEffect } from 'react';
import { useApp } from './store/AppContext';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { TaskDetail } from './components/TaskDetail';
import { Calendar } from './components/Calendar';
import { PomodoroTimer } from './components/PomodoroTimer';
import { SettingsPanel } from './components/SettingsPanel';
import { Toast } from './components/Toast';
import { mmss } from './utils/date';

export function App() {
  const {
    state,
    vista,
    detalleId,
    pomodoro,
    cerrarDetalle,
    setAjustesAbiertos,
    ajustesAbiertos,
    sidebarAbierto,
    setSidebarAbierto,
  } = useApp();

  const { theme, darkRunning } = state.ajustes;

  // Tema de color y "modo oscuro al ejecutar".
  useEffect(() => {
    document.body.dataset.theme = theme;
    document.body.classList.toggle('dimmed', darkRunning && pomodoro.corriendo);
  }, [darkRunning, pomodoro.corriendo, theme]);

  // Cuenta atrás en el título de la pestaña.
  useEffect(() => {
    const base = 'Organizador · Tareas y Pomodoro';
    document.title = pomodoro.corriendo ? `${mmss(pomodoro.restante)} · ${base}` : base;
  }, [pomodoro.corriendo, pomodoro.restante]);

  // Atajos: Espacio inicia/pausa, Escape cierra paneles.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches('input, textarea, select')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        pomodoro.alternar();
      }
      if (e.key === 'Escape') {
        cerrarDetalle();
        setAjustesAbiertos(false);
        setSidebarAbierto(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cerrarDetalle, pomodoro, setAjustesAbiertos, setSidebarAbierto]);

  return (
    <>
      <div id="app">
        <button
          type="button"
          className="hamburger"
          aria-label="Abrir menú"
          onClick={() => setSidebarAbierto(true)}
        >
          ☰
        </button>
        {sidebarAbierto && (
          <div className="sidebar-overlay" onClick={() => setSidebarAbierto(false)} />
        )}
        <Sidebar />
        <main id="main">
          {vista === 'calendario' ? (
            <Calendar />
          ) : vista === 'pomodoro' ? (
            <PomodoroTimer />
          ) : (
            <TaskList />
          )}
        </main>
        {detalleId && <TaskDetail />}
      </div>
      {ajustesAbiertos && <SettingsPanel />}
      <Toast />
    </>
  );
}
