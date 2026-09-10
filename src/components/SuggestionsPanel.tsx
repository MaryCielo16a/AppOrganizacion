import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';

export function SuggestionsPanel() {
  const { state, dispatch, showToast, vista, abrirDetalle } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

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
    abrirDetalle(id);
    showToast('Añadida a Mi Día — edita los detalles');
    setMobileOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="suggestions-fab"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Sugerencias"
      >
        💡 {sugerencias.length}
      </button>
      {mobileOpen && (
        <div className="suggestions-overlay" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`suggestions-panel${mobileOpen ? ' mobile-open' : ''}`}>
        <button
          type="button"
          className="suggestions-close-mobile"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar sugerencias"
        >
          ✕
        </button>
        <h3 className="suggestions-title">Sugerencias de Hoy</h3>
        <p className="suggestions-hint">Añade tareas a tu lista de hoy:</p>
        <div className="suggestions-list">
          {sugerencias.map((t) => (
            <div key={t.id} className="suggestion-card" role="button" tabIndex={0} onClick={() => abrirDetalle(t.id)} onKeyDown={(e) => { if (e.key === 'Enter') abrirDetalle(t.id); }}>
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
                onClick={(e) => { e.stopPropagation(); agregar(t.id); }}
              >
                + Mi Día
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
