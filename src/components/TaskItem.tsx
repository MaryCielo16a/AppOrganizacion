import { useApp } from '../store/AppContext';
import type { Task } from '../types';
import { DIAS_C, fmtHora, hoyISO, isoADate } from '../utils/date';

interface Props {
  tarea: Task;
}

export function TaskItem({ tarea }: Props) {
  const { state, dispatch, abrirDetalle, irA, showToast, nombreLista } = useApp();
  const { hourFormat } = state.ajustes;

  const completados = tarea.sesiones.length;

  const area = state.areas.find((a) => a.id === tarea.areaId);
  const meta: string[] = [nombreLista(tarea.listaId)];
  if (tarea.fecha) {
    const d = isoADate(tarea.fecha);
    let etiqueta =
      tarea.fecha === hoyISO() ? 'Hoy' : `${DIAS_C[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
    if (tarea.inicio) {
      etiqueta += ` · ${fmtHora(tarea.inicio, hourFormat)}`;
      if (tarea.fin) etiqueta += ` - ${fmtHora(tarea.fin, hourFormat)}`;
    }
    meta.push(`📅 ${etiqueta}`);
  }
  if (tarea.miDia) meta.push('☀ Mi día');
  if (tarea.quadrant) meta.push(tarea.quadrant);
  if (area) meta.push(`● ${area.name}`);

  const enfocar = () => {
    dispatch({ type: 'SET_ACTIVE_TASK', id: tarea.id });
    showToast(`Tarea activa: ${tarea.titulo}`);
    irA('pomodoro');
  };

  return (
    <li
      className={[
        'task-item',
        tarea.hecha ? 'done' : '',
        state.tareaActiva === tarea.id ? 'selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-id={tarea.id}
    >
      <button
        type="button"
        className="check"
        title="Completar"
        aria-label={tarea.hecha ? 'Marcar como pendiente' : 'Marcar como completada'}
        onClick={() => dispatch({ type: 'TOGGLE_TASK', id: tarea.id })}
      >
        ✓
      </button>

      <div
        className="task-main"
        role="button"
        tabIndex={0}
        onClick={() => abrirDetalle(tarea.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            abrirDetalle(tarea.id);
          }
        }}
      >
        <div className="task-title">{tarea.titulo}</div>
        <div className="task-meta">{meta.join('  ·  ')}</div>
      </div>

      <span className="pomo-count" title="Pomodoros completados / estimados">
        <b>{completados}</b>/{tarea.estPomos} 🍅
      </span>

      <button type="button" className="mini-btn" title="Usar en el temporizador" onClick={enfocar}>
        ▶ Pomodoro
      </button>

      <button
        type="button"
        className={`star-btn${tarea.importante ? ' on' : ''}`}
        title="Importante"
        aria-label="Marcar como importante"
        onClick={() =>
          dispatch({ type: 'UPDATE_TASK', id: tarea.id, patch: { importante: !tarea.importante } })
        }
      >
        {tarea.importante ? '★' : '☆'}
      </button>
    </li>
  );
}
