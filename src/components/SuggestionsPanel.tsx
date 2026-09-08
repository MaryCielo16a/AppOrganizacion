import { useMemo } from 'react';
import { useApp } from '../store/AppContext';

export function SuggestionsPanel() {
  const { state, dispatch, showToast, vista } = useApp();

  const sugerencias = useMemo(() => {
    return state.tareas
      .filter((t) => !t.hecha && !t.miDia)
      .sort((a, b) => {
        if (a.importante !== b.importante) return a.importante ? -1 : 1;
        if (a.quadrant < b.quadrant) return -1;
        if (a.quadrant > b.quadrant) return 1;
        return (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio);
      });
  }, [state.tareas]);

  if (vista !== 'miDia' && vista !== 'rutina') return null;
  if (sugerencias.length === 0) return null;

  const agregar = (id: string) => {
    dispatch({ type: 'UPDATE_TASK', id, patch: { miDia: true } });
    showToast('Añadida a Mi Día');
  };

  return (
    <aside className="suggestions-panel">
      <h3 className="suggestions-title">Sugerencias de Hoy</h3>
      <p className="suggestions-hint">Arrastra o añade tareas a tu lista de hoy:</p>
      <div className="suggestions-list">
        {sugerencias.map((t) => (
          <div key={t.id} className="suggestion-card">
            <div className="suggestion-info">
              <span className="suggestion-name">{t.titulo}</span>
              {t.inicio && t.fin && (
                <span className="suggestion-time">{t.inicio} – {t.fin}</span>
              )}
              <span className="suggestion-pomos">{t.estPomos} pomodoro{t.estPomos !== 1 ? 's' : ''}</span>
            </div>
            <button
              type="button"
              className="suggestion-add"
              onClick={() => agregar(t.id)}
            >
              + Añadir a Mi Día
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
