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
  let check = new Date(hoy);
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

export function HabitsSection() {
  const { state, dispatch, showToast } = useApp();
  const [titulo, setTitulo] = useState('');
  const [goalId, setGoalId] = useState('');

  const week = getWeekDates();
  const hoyStr = week.find((d) => {
    const hoy = new Date();
    return d === `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  }) ?? '';

  const agregar = () => {
    if (!titulo.trim() || !goalId) return;
    dispatch({ type: 'ADD_HABIT', titulo: titulo.trim(), goalId });
    setTitulo('');
    showToast('Hábito creado');
  };

  if (state.goals.length === 0 && state.habits.length === 0) return null;

  return (
    <div className="habits-section">
      <h3 className="habits-section-title">🔄 Hábitos Diarios</h3>

      {state.habits.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
          Agrega hábitos diarios vinculados a tus metas para avanzar consistentemente.
        </p>
      ) : (
        <div className="habits-list">
          {state.habits.map((h) => {
            const goal = state.goals.find((g) => g.id === h.goalId);
            const area = goal ? state.areas.find((a) => a.id === goal.areaId) : null;
            const streak = calcStreak(h.diasCompletados);
            const thisWeekDone = week.filter((d) => h.diasCompletados.includes(d)).length;

            return (
              <div key={h.id} className="habit-card">
                <div className="habit-card-top">
                  <span className="habit-card-title">{h.titulo}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {goal && (
                      <span className="habit-card-goal">
                        {area ? `${area.name} · ` : ''}{goal.title}
                      </span>
                    )}
                    <button
                      type="button"
                      className="habit-card-del"
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
                  <div className="habit-streak">🔥 Racha: {streak} día{streak > 1 ? 's' : ''}</div>
                )}

                <div className="habit-week">
                  {week.map((dia, i) => {
                    const done = h.diasCompletados.includes(dia);
                    const isToday = dia === hoyStr;
                    return (
                      <button
                        key={dia}
                        type="button"
                        className={`habit-day${done ? ' done' : ''}${isToday ? ' today' : ''}`}
                        onClick={() => dispatch({ type: 'TOGGLE_HABIT_DAY', habitId: h.id, dia })}
                        title={dia}
                      >
                        {DIAS[i]}
                      </button>
                    );
                  })}
                </div>
                <div className="habit-progress-label">
                  Esta semana: {thisWeekDone}/7 días completados
                </div>
              </div>
            );
          })}
        </div>
      )}

      {state.goals.length > 0 && (
        <div className="habit-add-row">
          <input
            type="text"
            className="habit-add-input"
            placeholder="Nuevo hábito diario..."
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') agregar(); }}
          />
          <select
            className="habit-add-select"
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
          <button type="button" className="habit-add-btn" onClick={agregar}>
            + Hábito
          </button>
        </div>
      )}
    </div>
  );
}
