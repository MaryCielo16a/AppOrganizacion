import { useState } from 'react';
import { esEventoCalendario, useApp } from '../store/AppContext';
import type { Task } from '../types';

export function TaskDetail() {
  const { state, dispatch, detalleId, cerrarDetalle, irA, showToast } = useApp();
  const [newSub, setNewSub] = useState('');

  const tarea = state.tareas.find((t) => t.id === detalleId) ?? null;
  if (!tarea) return null;

  const completados = tarea.sesiones.length;
  const minutosTotal = tarea.sesiones.reduce((a, s) => a + s.minutos, 0);
  const tomates = Math.max(tarea.estPomos, completados);

  const subDone = tarea.subtareas.filter((s) => s.hecha).length;
  const subTotal = tarea.subtareas.length;

  const patch = (p: Partial<Task>) => dispatch({ type: 'UPDATE_TASK', id: tarea.id, patch: p });

  const borrar = () => {
    if (!window.confirm(`¿Eliminar «${tarea.titulo}»?`)) return;
    dispatch({ type: 'DELETE_TASK', id: tarea.id });
    cerrarDetalle();
  };

  const enfocar = () => {
    dispatch({ type: 'SET_ACTIVE_TASK', id: tarea.id });
    showToast(`Tarea activa: ${tarea.titulo}`);
    irA('pomodoro');
  };

  const addSubtask = () => {
    const titulo = newSub.trim();
    if (!titulo) return;
    dispatch({ type: 'ADD_SUBTASK', taskId: tarea.id, titulo });
    setNewSub('');
  };

  return (
    <aside id="detail">
      <div className="detail-head">
        <strong>Detalle de la tarea</strong>
        <button type="button" className="icon-btn" onClick={cerrarDetalle} aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div className="detail-body">
        <h3>{tarea.titulo}</h3>

        <div className="tomato-row">
          {tomates === 0
            ? '—'
            : Array.from({ length: tomates }, (_, i) => (
                <span key={i} className={i < completados ? '' : 't-off'}>
                  🍅
                </span>
              ))}
        </div>

        <div className="d-field">
          <label htmlFor="dTitulo">Título</label>
          <input
            id="dTitulo"
            value={tarea.titulo}
            onChange={(e) => patch({ titulo: e.target.value })}
          />
        </div>

        <div className="d-field">
          <label htmlFor="dNota">Notas</label>
          <textarea id="dNota" value={tarea.nota} onChange={(e) => patch({ nota: e.target.value })} />
        </div>

        {/* ===== SUBTAREAS ===== */}
        <div className="d-field subtareas-section">
          <label>Subtareas {subTotal > 0 && <span className="sub-count">({subDone}/{subTotal})</span>}</label>

          {subTotal > 0 && (
            <div className="sub-progress-bar">
              <div
                className="sub-progress-fill"
                style={{ width: `${subTotal > 0 ? (subDone / subTotal) * 100 : 0}%` }}
              />
            </div>
          )}

          <ul className="sub-list">
            {tarea.subtareas.map((s) => (
              <li key={s.id} className={`sub-item${s.hecha ? ' done' : ''}`}>
                <input
                  type="checkbox"
                  checked={s.hecha}
                  onChange={() => dispatch({ type: 'TOGGLE_SUBTASK', taskId: tarea.id, subtaskId: s.id })}
                  className="sub-check"
                />
                <input
                  type="text"
                  value={s.titulo}
                  onChange={(e) => dispatch({ type: 'RENAME_SUBTASK', taskId: tarea.id, subtaskId: s.id, titulo: e.target.value })}
                  className={`sub-title${s.hecha ? ' done' : ''}`}
                />
                <button
                  type="button"
                  className="sub-delete"
                  onClick={() => dispatch({ type: 'DELETE_SUBTASK', taskId: tarea.id, subtaskId: s.id })}
                  title="Eliminar subtarea"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div className="sub-add">
            <input
              type="text"
              placeholder="Agregar subtarea..."
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }}
              className="sub-add-input"
            />
            <button type="button" className="sub-add-btn" onClick={addSubtask} title="Agregar">
              +
            </button>
          </div>
        </div>

        <div className="d-field">
          <label htmlFor="dFecha">Fecha</label>
          <input
            id="dFecha"
            type="date"
            value={tarea.fecha}
            onChange={(e) => patch({ fecha: e.target.value })}
          />
        </div>

        <div className="d-field">
          <label htmlFor="dInicio">Hora inicio</label>
          <input
            id="dInicio"
            type="time"
            value={tarea.inicio}
            onChange={(e) => patch({ inicio: e.target.value })}
          />
        </div>

        <div className="d-field">
          <label htmlFor="dFin">Hora fin</label>
          <input
            id="dFin"
            type="time"
            value={tarea.fin}
            onChange={(e) => patch({ fin: e.target.value })}
          />
        </div>

        <div className="d-field">
          <label htmlFor="dEst">Pomodoros estimados</label>
          <input
            id="dEst"
            type="number"
            min={1}
            max={20}
            value={tarea.estPomos}
            onChange={(e) => patch({ estPomos: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          />
        </div>

        <div className="d-field">
          <label htmlFor="dLista">Lista</label>
          <select
            id="dLista"
            value={tarea.listaId}
            onChange={(e) => patch({ listaId: e.target.value })}
          >
            {state.listas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="set-row" style={{ color: 'var(--text-dim)' }}>
          <span>Agregar a Mi día</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={tarea.miDia}
              onChange={(e) => patch({ miDia: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="set-row" style={{ color: 'var(--text-dim)' }}>
          <span>Importante</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={tarea.importante}
              onChange={(e) => patch({ importante: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="set-row" style={{ color: 'var(--text-dim)' }}>
          <span>Asignada a mí</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={tarea.asignada}
              onChange={(e) => patch({ asignada: e.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="d-field">
          <label>
            Pomodoros de esta tarea ({completados}/{tarea.estPomos} · {minutosTotal} min)
          </label>
          <ul className="pomo-log">
            {tarea.sesiones.length === 0 ? (
              <li>
                <span>Sin pomodoros completados todavía.</span>
              </li>
            ) : (
              tarea.sesiones.map((s, i) => {
                const d = new Date(s.fin);
                return (
                  <li key={`${s.fin}-${i}`}>
                    <span>
                      #{i + 1} · {d.toLocaleDateString('es')}
                    </span>
                    <span>
                      {d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                      {s.minutos} min
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <p className="hint" style={{ padding: 0 }}>
          {esEventoCalendario(tarea)
            ? '✔ Registrada automáticamente en el calendario.'
            : 'Añade fecha y hora para que aparezca en el calendario.'}
        </p>

        <div className="detail-actions">
          <button type="button" className="ghost-btn" onClick={enfocar}>
            ▶ Usar en Pomodoro
          </button>
          <button type="button" className="danger-btn" onClick={borrar}>
            Eliminar
          </button>
        </div>
      </div>
    </aside>
  );
}
