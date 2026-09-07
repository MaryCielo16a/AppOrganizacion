import { useApp } from '../store/AppContext';
import type { Quadrant } from '../types';

const QUADRANTS: { id: Quadrant; label: string; sub: string; clase: string }[] = [
  { id: 'Q1', label: 'Urgente · Importante', sub: 'HACER YA', clase: 'q1' },
  { id: 'Q2', label: 'No Urgente · Importante', sub: 'PLANIFICAR', clase: 'q2' },
  { id: 'Q3', label: 'Urgente · No Importante', sub: 'DELEGAR', clase: 'q3' },
  { id: 'Q4', label: 'No Urgente · No Importante', sub: 'ELIMINAR', clase: 'q4' },
];

export function EisenhowerView() {
  const { state, dispatch } = useApp();

  return (
    <section className="view active" id="viewEisenhower">
      <header className="main-header">
        <div>
          <h1>Matriz de Eisenhower</h1>
          <p className="subtitle">Organiza tus tareas por urgencia e importancia</p>
        </div>
      </header>

      <div className="eisenhower-scroll">
        <div className="eisenhower-grid">
          {QUADRANTS.map((q) => {
            const tareas = state.tareas.filter((t) => t.quadrant === q.id && !t.hecha);
            return (
              <div key={q.id} className={`eisenhower-cell ${q.clase}`}>
                <div className="eq-header">
                  <span className="eq-badge">{q.id}</span>
                  <div>
                    <div className="eq-label">{q.label}</div>
                    <div className="eq-sub">{q.sub}</div>
                  </div>
                </div>
                <div className="eq-tasks">
                  {tareas.length === 0 ? (
                    <p className="eq-empty">Sin tareas en este cuadrante</p>
                  ) : (
                    tareas.map((t) => {
                      const area = state.areas.find((a) => a.id === t.areaId);
                      return (
                        <div key={t.id} className="eq-task">
                          <button
                            type="button"
                            className="check"
                            onClick={() => dispatch({ type: 'TOGGLE_TASK', id: t.id })}
                          >
                            ✓
                          </button>
                          <div className="eq-task-main">
                            <span className="eq-task-title">{t.titulo}</span>
                            <div className="eq-task-meta">
                              {area && (
                                <span
                                  className="area-dot"
                                  style={{ background: `var(--area-${area.color}, var(--accent))` }}
                                />
                              )}
                              <span className="eq-pomo">
                                {t.sesiones.length}/{t.estPomos} 🍅
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="mini-btn"
                            onClick={() => {
                              dispatch({ type: 'SET_ACTIVE_TASK', id: t.id });
                            }}
                          >
                            ▶
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
