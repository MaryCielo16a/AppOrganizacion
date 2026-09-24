import { useState } from 'react';
import { useApp } from '../store/AppContext';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function getWeekDates(): string[] {
  const hoy = new Date();
  const day = hoy.getDay();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

function calcStreak(dias: string[]): number {
  if (dias.length === 0) return 0;
  const sorted = [...dias].sort().reverse();
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  let count = 0;
  const check = new Date(hoy);
  if (sorted[0] !== hoyStr) {
    check.setDate(check.getDate() - 1);
    const ayerStr = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`;
    if (sorted[0] !== ayerStr) return 0;
  }
  while (true) {
    const str = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`;
    if (dias.includes(str)) {
      count++;
      check.setDate(check.getDate() - 1);
    } else break;
  }
  return count;
}

function fmtHora12(h: string): string {
  if (!h) return '';
  const [hh, mm] = h.split(':').map(Number);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

export function HabitsView() {
  const { state, dispatch, showToast } = useApp();
  const [titulo, setTitulo] = useState('');
  const [goalId, setGoalId] = useState('');
  const [hora, setHora] = useState('');
  const [editingHora, setEditingHora] = useState<string | null>(null);

  const week = getWeekDates();
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const agregar = () => {
    if (!titulo.trim() || !goalId) return;
    dispatch({ type: 'ADD_HABIT', titulo: titulo.trim(), goalId, hora });
    setTitulo('');
    setHora('');
    showToast('Hábito creado');
  };

  const totalHabits = state.habits.length;
  const todayDone = state.habits.filter((h) => h.diasCompletados.includes(hoyStr)).length;
  const bestStreak = Math.max(0, ...state.habits.map((h) => calcStreak(h.diasCompletados)));

  return (
    <div className="habits-view">
      <h2 className="habits-view-header">Mis Hábitos</h2>

      {/* Summary KPIs */}
      {totalHabits > 0 && (
        <div className="habits-kpis">
          <div className="habits-kpi">
            <span className="habits-kpi-num">{todayDone}/{totalHabits}</span>
            <span className="habits-kpi-label">Completados hoy</span>
          </div>
          <div className="habits-kpi">
            <span className="habits-kpi-num">{bestStreak}</span>
            <span className="habits-kpi-label">Mejor racha</span>
          </div>
          <div className="habits-kpi">
            <span className="habits-kpi-num">
              {totalHabits > 0 ? Math.round((todayDone / totalHabits) * 100) : 0}%
            </span>
            <span className="habits-kpi-label">Cumplimiento hoy</span>
          </div>
        </div>
      )}

      {/* Habits list */}
      {state.habits.length === 0 ? (
        <div className="habits-empty">
          <p>No tienes hábitos todavía. Crea uno vinculado a una meta para empezar.</p>
        </div>
      ) : (
        <div className="habits-grid">
          {state.habits.map((h) => {
            const goal = state.goals.find((g) => g.id === h.goalId);
            const area = goal ? state.areas.find((a) => a.id === goal.areaId) : null;
            const streak = calcStreak(h.diasCompletados);
            const thisWeekDone = week.filter((d) => h.diasCompletados.includes(d)).length;
            const todayChecked = h.diasCompletados.includes(hoyStr);

            return (
              <div key={h.id} className={`hv-card${todayChecked ? ' hv-done-today' : ''}`}>
                <div className="hv-card-header">
                  <div className="hv-card-left">
                    <button
                      type="button"
                      className={`hv-today-check${todayChecked ? ' checked' : ''}`}
                      onClick={() => dispatch({ type: 'TOGGLE_HABIT_DAY', habitId: h.id, dia: hoyStr })}
                      title={todayChecked ? 'Desmarcar hoy' : 'Marcar hoy'}
                    >
                      {todayChecked ? '✓' : ''}
                    </button>
                    <div>
                      <span className="hv-card-title">{h.titulo}</span>
                      {goal && (
                        <span className="hv-card-goal">
                          {area ? `${area.name} · ` : ''}{goal.title}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hv-card-actions">
                    {h.hora && editingHora !== h.id && (
                      <span className="hv-alarm" onClick={() => setEditingHora(h.id)} title="Cambiar hora">
                        ⏰ {fmtHora12(h.hora)}
                      </span>
                    )}
                    {!h.hora && editingHora !== h.id && (
                      <button
                        type="button"
                        className="hv-set-alarm"
                        onClick={() => setEditingHora(h.id)}
                        title="Establecer hora"
                      >
                        ⏰
                      </button>
                    )}
                    {editingHora === h.id && (
                      <div className="hv-alarm-edit">
                        <input
                          type="time"
                          className="hv-alarm-input"
                          value={h.hora}
                          onChange={(e) => dispatch({ type: 'UPDATE_HABIT', id: h.id, patch: { hora: e.target.value } })}
                        />
                        <button type="button" className="hv-alarm-ok" onClick={() => setEditingHora(null)}>✓</button>
                        {h.hora && (
                          <button
                            type="button"
                            className="hv-alarm-clear"
                            onClick={() => {
                              dispatch({ type: 'UPDATE_HABIT', id: h.id, patch: { hora: '' } });
                              setEditingHora(null);
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      className="hv-delete"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar hábito "${h.titulo}"?`)) {
                          dispatch({ type: 'DELETE_HABIT', id: h.id });
                          showToast('Hábito eliminado');
                        }
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {streak > 0 && (
                  <div className="hv-streak">
                    {'🔥'.repeat(Math.min(streak, 5))} Racha: {streak} día{streak > 1 ? 's' : ''}
                  </div>
                )}

                <div className="hv-week">
                  {week.map((dia, i) => {
                    const done = h.diasCompletados.includes(dia);
                    const isToday = dia === hoyStr;
                    return (
                      <button
                        key={dia}
                        type="button"
                        className={`hv-day${done ? ' done' : ''}${isToday ? ' today' : ''}`}
                        onClick={() => dispatch({ type: 'TOGGLE_HABIT_DAY', habitId: h.id, dia })}
                        title={dia}
                      >
                        <span className="hv-day-letter">{DIAS[i]}</span>
                        <span className="hv-day-check">{done ? '✓' : ''}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="hv-progress">
                  <div className="hv-progress-bar">
                    <div className="hv-progress-fill" style={{ width: `${(thisWeekDone / 7) * 100}%` }} />
                  </div>
                  <span className="hv-progress-label">{thisWeekDone}/7 esta semana</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add habit form */}
      {state.goals.length > 0 && (
        <div className="hv-add">
          <div className="hv-add-title">Agregar hábito</div>
          <div className="hv-add-row">
            <input
              type="text"
              className="hv-add-input"
              placeholder="Nombre del hábito..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') agregar(); }}
            />
            <select
              className="hv-add-select"
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
            >
              <option value="">Meta...</option>
              {state.goals.map((g) => {
                const area = state.areas.find((a) => a.id === g.areaId);
                return (
                  <option key={g.id} value={g.id}>
                    {area ? `${area.name}: ` : ''}{g.title}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="hv-add-row">
            <input
              type="time"
              className="hv-add-time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
            <span className="hv-add-time-label">Hora recordatorio (opcional)</span>
            <button type="button" className="hv-add-btn" onClick={agregar}>
              + Hábito
            </button>
          </div>
        </div>
      )}

      {state.goals.length === 0 && (
        <div className="habits-empty">
          <p>Primero crea un área y una meta en "Áreas y Metas" para poder vincular hábitos.</p>
        </div>
      )}
    </div>
  );
}
