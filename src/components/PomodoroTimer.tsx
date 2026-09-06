import { useApp } from '../store/AppContext';
import { hoyISO, mmss } from '../utils/date';
import type { PomodoroMode } from '../types';

const TABS: { modo: PomodoroMode; etiqueta: string }[] = [
  { modo: 'pomodoro', etiqueta: 'Pomodoro' },
  { modo: 'short', etiqueta: 'Descanso corto' },
  { modo: 'long', etiqueta: 'Descanso largo' },
];

export function PomodoroTimer() {
  const { state, dispatch, pomodoro, tareaActiva, abrirDetalle } = useApp();
  const hoy = hoyISO();

  const lista = state.tareas.filter((t) => !t.hecha || t.fecha === hoy || t.miDia);

  const duracionTotal =
    (pomodoro.modo === 'pomodoro'
      ? state.ajustes.pomodoro
      : pomodoro.modo === 'short'
        ? state.ajustes.corto
        : state.ajustes.largo) * 60;
  const progreso = duracionTotal > 0 ? 1 - pomodoro.restante / duracionTotal : 0;
  const RADIO = 130;
  const CIRC = 2 * Math.PI * RADIO;

  const totalHechos = state.tareas.reduce((a, t) => a + t.sesiones.length, 0);
  const totalEst = state.tareas.filter((t) => !t.hecha).reduce((a, t) => a + t.estPomos, 0);
  const minutos = totalHechos * state.ajustes.pomodoro;

  const sufijoRonda =
    pomodoro.modo === 'pomodoro'
      ? ''
      : pomodoro.modo === 'short'
        ? ' · descanso corto'
        : ' · descanso largo';

  const limpiarCompletadas = () => {
    if (!window.confirm('¿Eliminar todas las tareas completadas?')) return;
    dispatch({ type: 'CLEAR_COMPLETED' });
  };

  return (
    <section className="view active" id="viewPomodoro">
      <div className="pomo-page">
        <div className="pomo-card">
          <div className="pomo-tabs">
            {TABS.map((t) => (
              <button
                key={t.modo}
                type="button"
                className={`pomo-tab${pomodoro.modo === t.modo ? ' active' : ''}`}
                onClick={() => pomodoro.ponerModo(t.modo)}
              >
                {t.etiqueta}
              </button>
            ))}
          </div>

          <div className="pomo-ring-wrap">
            <svg className="pomo-ring" viewBox="0 0 300 300">
              <circle
                className="pomo-ring-bg"
                cx="150"
                cy="150"
                r={RADIO}
              />
              <circle
                className="pomo-ring-fg"
                cx="150"
                cy="150"
                r={RADIO}
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progreso)}
                transform="rotate(-90 150 150)"
              />
            </svg>
            <div className="pomo-time" data-testid="pomo-time">
              {mmss(pomodoro.restante)}
            </div>
          </div>

          <button type="button" className="pomo-start" onClick={pomodoro.alternar}>
            {pomodoro.corriendo ? 'PAUSE' : 'START'}
          </button>

          {pomodoro.corriendo && (
            <button
              type="button"
              className="pomo-skip"
              title="Saltar este bloque"
              aria-label="Saltar este bloque"
              onClick={() => {
                if (window.confirm('¿Saltar este bloque?')) pomodoro.saltar();
              }}
            >
              ⏭
            </button>
          )}
        </div>

        <div className="pomo-current">
          <div className="pomo-round">
            #{state.ronda}
            {sufijoRonda}
          </div>
          <div className="pomo-task">{tareaActiva ? tareaActiva.titulo : 'Sin tarea seleccionada'}</div>
        </div>

        <div className="pomo-tasks-head">
          <h2>Tareas</h2>
          <button
            type="button"
            className="icon-btn"
            title="Borrar tareas completadas"
            onClick={limpiarCompletadas}
          >
            ⋮
          </button>
        </div>

        <ul className="pomo-task-list">
          {lista.length === 0 ? (
            <li style={{ justifyContent: 'center', color: '#999' }}>Sin tareas todavía.</li>
          ) : (
            lista.map((t) => (
              <li
                key={t.id}
                className={[t.hecha ? 'done' : '', state.tareaActiva === t.id ? 'active' : '']
                  .filter(Boolean)
                  .join(' ')}
                data-id={t.id}
                onClick={() => dispatch({ type: 'SET_ACTIVE_TASK', id: t.id })}
              >
                <button
                  type="button"
                  className="p-check"
                  aria-label="Completar"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'TOGGLE_TASK', id: t.id });
                  }}
                >
                  ✓
                </button>
                <span className="p-title">{t.titulo}</span>
                <span className="p-count">
                  <b>{t.sesiones.length}</b>/ {t.estPomos}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  title="Ver pomodoros"
                  aria-label="Ver pomodoros"
                  onClick={(e) => {
                    e.stopPropagation();
                    abrirDetalle(t.id);
                  }}
                >
                  ⋮
                </button>
              </li>
            ))
          )}
        </ul>

        <p className="pomo-summary">
          Pomodoros completados: {totalHechos} · Tiempo enfocado: {Math.floor(minutos / 60)}h{' '}
          {minutos % 60}m · Pendientes estimados: {totalEst}
        </p>
      </div>
    </section>
  );
}
