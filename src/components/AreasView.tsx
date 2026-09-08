import { useState } from 'react';
import { useApp } from '../store/AppContext';
import type { GoalFocus, GoalHorizon } from '../types';

const AREA_COLORS = [
  { id: 'purple', hex: '#7c3aed' },
  { id: 'blue', hex: '#2563eb' },
  { id: 'cyan', hex: '#0891b2' },
  { id: 'green', hex: '#16a34a' },
  { id: 'yellow', hex: '#ca8a04' },
  { id: 'orange', hex: '#ea580c' },
  { id: 'red', hex: '#dc2626' },
  { id: 'pink', hex: '#db2777' },
];

const FOCUS_LABELS: Record<GoalFocus, { label: string; icon: string; cls: string }> = {
  activo: { label: 'En Enfoque', icon: '🔥', cls: 'focus-activo' },
  pausado: { label: 'Pausado', icon: '⏸', cls: 'focus-pausado' },
  completado: { label: 'Completado', icon: '✅', cls: 'focus-completado' },
};

export function AreasView() {
  const { state, dispatch, showToast } = useApp();

  const [areaModal, setAreaModal] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [areaColor, setAreaColor] = useState('purple');

  const [goalModal, setGoalModal] = useState(false);
  const [goalAreaId, setGoalAreaId] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalHorizon, setGoalHorizon] = useState<GoalHorizon>('anual');
  const [goalFocus, setGoalFocus] = useState<GoalFocus>('activo');

  const [quickTaskTarget, setQuickTaskTarget] = useState<{ areaId: string; goalId: string } | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  const guardarArea = () => {
    if (!areaName.trim()) return;
    dispatch({ type: 'ADD_AREA', name: areaName.trim(), color: areaColor });
    setAreaName('');
    setAreaColor('purple');
    setAreaModal(false);
    showToast('Área creada');
  };

  const guardarGoal = () => {
    if (!goalTitle.trim() || !goalAreaId) return;
    dispatch({
      type: 'ADD_GOAL',
      areaId: goalAreaId,
      title: goalTitle.trim(),
      horizon: goalHorizon,
      focus: goalFocus,
    });
    setGoalTitle('');
    setGoalModal(false);
    showToast('Meta agregada');
  };

  const abrirGoalModal = (areaId: string) => {
    setGoalAreaId(areaId);
    setGoalTitle('');
    setGoalHorizon('anual');
    setGoalFocus('activo');
    setGoalModal(true);
  };

  const confirmarTareaRapida = () => {
    if (!quickTaskTitle.trim() || !quickTaskTarget) return;
    dispatch({
      type: 'ADD_TASK',
      input: {
        titulo: quickTaskTitle.trim(),
        miDia: true,
        areaId: quickTaskTarget.areaId,
        goalId: quickTaskTarget.goalId,
        quadrant: 'Q2',
        estPomos: 2,
      },
    });
    showToast('Tarea agregada');
    setQuickTaskTitle('');
    setQuickTaskTarget(null);
  };

  const toggleFocus = (goalId: string, current: GoalFocus) => {
    const next: GoalFocus = current === 'activo' ? 'pausado' : current === 'pausado' ? 'completado' : 'activo';
    dispatch({ type: 'UPDATE_GOAL', id: goalId, patch: { focus: next } });
  };

  return (
    <section className="view active" id="viewAreas">
      <header className="main-header">
        <div>
          <p className="routine-badge">JERARQUÍA DE ENFOQUE</p>
          <h1>Mapa de Áreas y Múltiples Metas</h1>
          <p className="subtitle">
            Organiza múltiples metas por área con estados de enfoque y progreso visual.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="primary" onClick={() => setAreaModal(true)}>
            ＋ Nueva Área de Vida
          </button>
        </div>
      </header>

      <div className="areas-scroll">
        {state.areas.length === 0 ? (
          <p className="empty-msg">
            No tienes áreas definidas. Crea una para organizar tus metas y tareas.
          </p>
        ) : (
          <div className="areas-map">
            {state.areas.map((area) => {
              const areaGoals = state.goals.filter((g) => g.areaId === area.id);
              const areaTasks = state.tareas.filter((t) => t.areaId === area.id);
              const colorHex = AREA_COLORS.find((c) => c.id === area.color)?.hex ?? 'var(--accent)';
              const anuales = areaGoals.filter((g) => g.horizon === 'anual');
              const mensuales = areaGoals.filter((g) => g.horizon === 'mensual');

              return (
                <div key={area.id} className="area-map-card">
                  <div className="area-map-head">
                    <span className="area-color-dot" style={{ background: colorHex }} />
                    <h3 className="area-map-name">{area.name}</h3>
                    <button
                      type="button"
                      className="area-map-add"
                      onClick={() => abrirGoalModal(area.id)}
                    >
                      + Agregar Meta
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger area-map-del"
                      title="Eliminar área"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el área "${area.name}"?`)) {
                          dispatch({ type: 'DELETE_AREA', id: area.id });
                          showToast('Área eliminada');
                        }
                      }}
                    >
                      🗑
                    </button>
                  </div>

                  {/* Metas Anuales */}
                  {anuales.length > 0 && (
                    <div className="goal-section">
                      <h4 className="goal-section-title">🎯 METAS ANUALES (LARGO PLAZO)</h4>
                      {anuales.map((goal) => {
                        const gTasks = areaTasks.filter((t) => t.goalId === goal.id);
                        const done = gTasks.filter((t) => t.hecha).length;
                        const total = gTasks.length;
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                        const fi = FOCUS_LABELS[goal.focus];
                        return (
                          <div key={goal.id} className="goal-card">
                            <div className="goal-card-top">
                              <span className="goal-card-title">{goal.title}</span>
                              <span className="goal-area-badge" style={{ background: colorHex }}>
                                {area.name.slice(0, 5)}
                              </span>
                            </div>
                            <GoalMeta
                              goalId={goal.id}
                              fi={fi}
                              toggleFocus={toggleFocus}
                              focus={goal.focus}
                              done={done}
                              total={total}
                              pct={pct}
                              gTasks={gTasks}
                              quickTaskTarget={quickTaskTarget}
                              setQuickTaskTarget={setQuickTaskTarget}
                              areaId={area.id}
                              quickTaskTitle={quickTaskTitle}
                              setQuickTaskTitle={setQuickTaskTitle}
                              confirmarTareaRapida={confirmarTareaRapida}
                              onDelete={() => dispatch({ type: 'DELETE_GOAL', id: goal.id })}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Metas Mensuales */}
                  <div className="goal-section">
                    <h4 className="goal-section-title">📅 METAS MENSUALES & HITOS ({mensuales.length})</h4>
                    {mensuales.map((goal) => {
                      const gTasks = areaTasks.filter((t) => t.goalId === goal.id);
                      const done = gTasks.filter((t) => t.hecha).length;
                      const total = gTasks.length;
                      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                      const fi = FOCUS_LABELS[goal.focus];
                      return (
                        <div key={goal.id} className="goal-card">
                          <div className="goal-card-top">
                            <span className="goal-card-title">{goal.title}</span>
                            <span className="goal-area-badge" style={{ background: colorHex }}>
                              {area.name.slice(0, 5)}
                            </span>
                          </div>
                          <GoalMeta
                            goalId={goal.id}
                            fi={fi}
                            toggleFocus={toggleFocus}
                            focus={goal.focus}
                            done={done}
                            total={total}
                            pct={pct}
                            gTasks={gTasks}
                            quickTaskTarget={quickTaskTarget}
                            setQuickTaskTarget={setQuickTaskTarget}
                            areaId={area.id}
                            quickTaskTitle={quickTaskTitle}
                            setQuickTaskTitle={setQuickTaskTitle}
                            confirmarTareaRapida={confirmarTareaRapida}
                            onDelete={() => dispatch({ type: 'DELETE_GOAL', id: goal.id })}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Nueva Área */}
      {areaModal && (
        <div className="modal-backdrop" onClick={() => setAreaModal(false)}>
          <div className="modal goal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>NUEVA ÁREA DE VIDA</span>
              <button type="button" className="icon-btn" onClick={() => setAreaModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="d-field">
                <label>Nombre del área</label>
                <input
                  type="text"
                  placeholder="Ej: Salud, Trabajo, Estudios..."
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') guardarArea(); }}
                  autoFocus
                />
              </div>
              <div className="d-field" style={{ marginTop: 12 }}>
                <label>Color</label>
                <div className="color-picker">
                  {AREA_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`color-dot${areaColor === c.id ? ' active' : ''}`}
                      style={{ background: c.hex }}
                      onClick={() => setAreaColor(c.id)}
                    />
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setAreaModal(false)}>Cancelar</button>
                <button type="button" className="primary" onClick={guardarArea}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva Meta / Objetivo */}
      {goalModal && (
        <div className="modal-backdrop" onClick={() => setGoalModal(false)}>
          <div className="modal goal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>NUEVA META / OBJETIVO</span>
              <button type="button" className="icon-btn" onClick={() => setGoalModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="d-field">
                <label>HORIZONTE DE TIEMPO</label>
                <select
                  className="goal-select"
                  value={goalHorizon}
                  onChange={(e) => setGoalHorizon(e.target.value as GoalHorizon)}
                >
                  <option value="anual">🎯 Meta Anual (Largo Plazo)</option>
                  <option value="mensual">📅 Meta Mensual / Hito (30 días)</option>
                </select>
              </div>
              <div className="d-field">
                <label>ESTADO DE ENFOQUE</label>
                <select
                  className="goal-select"
                  value={goalFocus}
                  onChange={(e) => setGoalFocus(e.target.value as GoalFocus)}
                >
                  <option value="activo">🔥 En Enfoque Activo (Prioritaria)</option>
                  <option value="pausado">⏸ Pausado</option>
                  <option value="completado">✅ Completado</option>
                </select>
              </div>
              <div className="d-field">
                <label>TÍTULO DE LA META</label>
                <input
                  type="text"
                  placeholder="Ej: Redactar Capítulo 1 de la Tesis"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') guardarGoal(); }}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setGoalModal(false)}>Cancelar</button>
                <button type="button" className="primary goal-save" onClick={guardarGoal}>Guardar Meta</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

interface GoalMetaProps {
  goalId: string;
  fi: { label: string; icon: string; cls: string };
  toggleFocus: (id: string, current: GoalFocus) => void;
  focus: GoalFocus;
  done: number;
  total: number;
  pct: number;
  gTasks: { id: string; titulo: string; hecha: boolean; sesiones: { inicio: string }[]; estPomos: number; inicio: string; fin: string }[];
  quickTaskTarget: { areaId: string; goalId: string } | null;
  setQuickTaskTarget: (v: { areaId: string; goalId: string } | null) => void;
  areaId: string;
  quickTaskTitle: string;
  setQuickTaskTitle: (v: string) => void;
  confirmarTareaRapida: () => void;
  onDelete: () => void;
}

function GoalMeta({
  goalId, fi, toggleFocus, focus, done, total, pct, gTasks,
  quickTaskTarget, setQuickTaskTarget, areaId, quickTaskTitle,
  setQuickTaskTitle, confirmarTareaRapida, onDelete,
}: GoalMetaProps) {
  return (
    <div className="goal-meta-block">
      <div className="goal-meta-controls">
        <button
          type="button"
          className={`focus-badge ${fi.cls}`}
          onClick={() => toggleFocus(goalId, focus)}
          title="Cambiar estado"
        >
          {fi.icon} {fi.label}
        </button>
        <button
          type="button"
          className="mini-btn"
          onClick={() => setQuickTaskTarget({ areaId, goalId })}
        >
          + Actividad
        </button>
        <button type="button" className="goal-edit-btn" title="Eliminar meta" onClick={onDelete}>
          🗑
        </button>
      </div>

      <div className="goal-progress-row">
        <span className="goal-progress-text">Progreso: {done}/{total} tareas</span>
        <span className="goal-progress-pct">{pct}%</span>
      </div>
      <div className="goal-progress-bar">
        <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {gTasks.length > 0 && (
        <div className="goal-task-list">
          {gTasks.map((t) => (
            <div key={t.id} className={`goal-task-item${t.hecha ? ' done' : ''}`}>
              <span className="goal-task-check">{t.hecha ? '●' : '○'}</span>
              <span className="goal-task-name">{t.titulo}</span>
              {t.inicio && t.fin && <span className="goal-task-time">{t.inicio} – {t.fin}</span>}
              <span className="goal-task-pomos">{t.sesiones.length}/{t.estPomos} pomos</span>
            </div>
          ))}
        </div>
      )}

      {quickTaskTarget?.goalId === goalId && (
        <div className="quick-task-input">
          <input
            type="text"
            placeholder="Nombre de la tarea..."
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmarTareaRapida();
              if (e.key === 'Escape') setQuickTaskTarget(null);
            }}
            autoFocus
          />
          <button type="button" className="primary" onClick={confirmarTareaRapida}>Agregar</button>
        </div>
      )}
    </div>
  );
}
