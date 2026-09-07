import { useState } from 'react';
import { useApp } from '../store/AppContext';

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

export function AreasView() {
  const { state, dispatch, showToast } = useApp();

  const [areaModal, setAreaModal] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [areaColor, setAreaColor] = useState('purple');

  const [goalModal, setGoalModal] = useState(false);
  const [goalAreaId, setGoalAreaId] = useState('');
  const [goalTitle, setGoalTitle] = useState('');

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
    dispatch({ type: 'ADD_GOAL', areaId: goalAreaId, title: goalTitle.trim() });
    setGoalTitle('');
    setGoalModal(false);
    showToast('Meta agregada');
  };

  const abrirGoalModal = (areaId: string) => {
    setGoalAreaId(areaId);
    setGoalTitle('');
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

  return (
    <section className="view active" id="viewAreas">
      <header className="main-header">
        <div>
          <h1>Áreas y Metas</h1>
          <p className="subtitle">Define tus áreas de vida y establece metas</p>
        </div>
        <div className="header-actions">
          <button type="button" className="primary" onClick={() => setAreaModal(true)}>
            ＋ Nueva Área
          </button>
        </div>
      </header>

      <div className="areas-scroll">
        {state.areas.length === 0 ? (
          <p className="empty-msg">
            No tienes áreas definidas. Crea una para organizar tus metas y tareas.
          </p>
        ) : (
          <div className="areas-grid">
            {state.areas.map((area) => {
              const areaGoals = state.goals.filter((g) => g.areaId === area.id);
              const areaTasks = state.tareas.filter((t) => t.areaId === area.id);
              const colorHex =
                AREA_COLORS.find((c) => c.id === area.color)?.hex ?? 'var(--accent)';

              return (
                <div key={area.id} className="area-card">
                  <div className="area-card-head">
                    <div className="area-card-title">
                      <span className="area-color-dot" style={{ background: colorHex }} />
                      <h3>{area.name}</h3>
                      <span className="area-count">{areaTasks.length} tareas</span>
                    </div>
                    <div className="area-card-actions">
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => abrirGoalModal(area.id)}
                      >
                        ＋ Meta
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
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
                  </div>

                  <div className="area-goals">
                    {areaGoals.length === 0 ? (
                      <p className="eq-empty">No hay metas definidas para esta área.</p>
                    ) : (
                      areaGoals.map((goal) => {
                        const goalTasks = areaTasks.filter((t) => t.goalId === goal.id);
                        return (
                          <div key={goal.id} className="goal-block">
                            <div className="goal-head">
                              <span className="goal-icon">🎯</span>
                              <span className="goal-title">{goal.title}</span>
                              <button
                                type="button"
                                className="goal-add-task"
                                onClick={() => {
                                  setQuickTaskTarget({ areaId: area.id, goalId: goal.id });
                                  setQuickTaskTitle('');
                                }}
                              >
                                + Tarea
                              </button>
                              <button
                                type="button"
                                className="goal-del"
                                title="Eliminar meta"
                                onClick={() => {
                                  dispatch({ type: 'DELETE_GOAL', id: goal.id });
                                }}
                              >
                                ✕
                              </button>
                            </div>
                            <div className="goal-tasks">
                              {goalTasks.length === 0 && !quickTaskTarget ? (
                                <p className="goal-empty">Sin tareas vinculadas</p>
                              ) : (
                                goalTasks.map((t) => (
                                  <div key={t.id} className="goal-task-row">
                                    <span className={t.hecha ? 'done-text' : ''}>
                                      {t.titulo}
                                    </span>
                                    <span className="eq-pomo">
                                      {t.sesiones.length}/{t.estPomos} 🍅
                                    </span>
                                  </div>
                                ))
                              )}
                              {quickTaskTarget?.goalId === goal.id && (
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
                                  <button type="button" className="primary" onClick={confirmarTareaRapida}>
                                    Agregar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>NUEVA ÁREA DE VIDA</span>
              <button type="button" className="icon-btn" onClick={() => setAreaModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="d-field">
                <label>Nombre del área</label>
                <input
                  type="text"
                  placeholder="Ej: Salud, Trabajo, Estudios..."
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') guardarArea();
                  }}
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
                <button type="button" className="ghost-btn" onClick={() => setAreaModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="primary" onClick={guardarArea}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva Meta */}
      {goalModal && (
        <div className="modal-backdrop" onClick={() => setGoalModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>NUEVA META</span>
              <button type="button" className="icon-btn" onClick={() => setGoalModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="d-field">
                <label>
                  Meta para: {state.areas.find((a) => a.id === goalAreaId)?.name}
                </label>
                <input
                  type="text"
                  placeholder="Ej: Aprender React, Correr 5km..."
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') guardarGoal();
                  }}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setGoalModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="primary" onClick={guardarGoal}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
