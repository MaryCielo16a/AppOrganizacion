import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';

export function FocusOverlay() {
  const { state, pomodoro } = useApp();
  const { blockedApps } = state.ajustes;
  const [dismissed, setDismissed] = useState(false);
  const prevRunning = useRef(false);

  const active = pomodoro.corriendo && pomodoro.modo === 'pomodoro' && blockedApps.length > 0;

  useEffect(() => {
    if (active && !prevRunning.current) setDismissed(false);
    prevRunning.current = active;
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onVisChange = () => {
      if (!document.hidden) setDismissed(false);
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [active]);

  if (!active || dismissed) return null;

  const mins = Math.floor(pomodoro.restante / 60);
  const secs = pomodoro.restante % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const tarea = state.tareas.find((t) => t.id === state.tareaActiva);

  return (
    <div className="focus-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="focus-overlay-content">
        <div className="focus-icon">🔒</div>
        <h2 className="focus-title">Modo Enfoque Activo</h2>
        <p className="focus-subtitle">Concéntrate en tu tarea. Evita estas apps:</p>

        <div className="focus-blocked-list">
          {blockedApps.map((app) => (
            <div key={app} className="focus-blocked-item">
              <span className="focus-blocked-icon">🚫</span>
              <span>{app}</span>
            </div>
          ))}
        </div>

        <div className="focus-timer">{timeStr}</div>

        {tarea && (
          <div className="focus-task">
            <span className="focus-task-label">Trabajando en:</span>
            <span className="focus-task-name">{tarea.titulo}</span>
          </div>
        )}

        <button
          type="button"
          className="focus-dismiss-btn"
          onClick={() => setDismissed(true)}
        >
          Entendido, volver a la app
        </button>
      </div>
    </div>
  );
}
