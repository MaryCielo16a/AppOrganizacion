import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { toISODate, sumarDias, DIAS_C } from '../utils/date';
import type { Task } from '../types';

function last7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) days.push(toISODate(sumarDias(today, -i)));
  return days;
}

function dayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return DIAS_C[d.getDay()];
}

function calcStreak(tareas: Task[]): number {
  const completed = new Set<string>();
  for (const t of tareas) {
    if (t.hecha && t.fecha) completed.add(t.fecha);
    if (t.hecha && t.creada) completed.add(t.creada.slice(0, 10));
  }
  let streak = 0;
  const d = new Date();
  while (true) {
    const iso = toISODate(d);
    if (completed.has(iso)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

const FRASES = [
  { min: 0, msg: '¡Empieza hoy! Cada tarea completada cuenta.' },
  { min: 1, msg: '¡Buen inicio! Sigue así.' },
  { min: 3, msg: '¡Vas muy bien! La constancia es clave.' },
  { min: 7, msg: '¡Una semana de racha! Eres imparable.' },
  { min: 14, msg: '¡Dos semanas seguidas! Estás creando un hábito.' },
  { min: 30, msg: '¡Un mes de constancia! Eres una máquina.' },
];

function motivationalPhrase(streak: number): string {
  let phrase = FRASES[0].msg;
  for (const f of FRASES) {
    if (streak >= f.min) phrase = f.msg;
  }
  return phrase;
}

export function StatsView() {
  const { state } = useApp();
  const { tareas, areas } = state;

  const days = useMemo(last7Days, []);
  const hoy = days[days.length - 1];

  const completadasHoy = useMemo(
    () => tareas.filter((t) => t.hecha && (t.fecha === hoy || t.creada.startsWith(hoy))).length,
    [tareas, hoy],
  );

  const totalCompletadas = useMemo(() => tareas.filter((t) => t.hecha).length, [tareas]);
  const totalPendientes = useMemo(() => tareas.filter((t) => !t.hecha).length, [tareas]);
  const tasa = totalCompletadas + totalPendientes > 0
    ? Math.round((totalCompletadas / (totalCompletadas + totalPendientes)) * 100)
    : 0;

  const streak = useMemo(() => calcStreak(tareas), [tareas]);
  const phrase = motivationalPhrase(streak);

  const completadasPorDia = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of days) map[d] = 0;
    for (const t of tareas) {
      if (!t.hecha) continue;
      const key = t.fecha || t.creada.slice(0, 10);
      if (key in map) map[key]++;
    }
    return map;
  }, [tareas, days]);

  const maxCompletadas = Math.max(1, ...Object.values(completadasPorDia));

  const minutosPorDia = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of days) map[d] = 0;
    for (const t of tareas) {
      for (const s of t.sesiones) {
        const key = s.inicio.slice(0, 10);
        if (key in map) map[key] += s.minutos;
      }
    }
    return map;
  }, [tareas, days]);

  const maxMinutos = Math.max(1, ...Object.values(minutosPorDia));

  const totalMinutos = useMemo(() => {
    let sum = 0;
    for (const t of tareas) for (const s of t.sesiones) sum += s.minutos;
    return sum;
  }, [tareas]);

  const porArea = useMemo(() => {
    const map: Record<string, { name: string; color: string; done: number; total: number }> = {};
    for (const a of areas) map[a.id] = { name: a.name, color: a.color, done: 0, total: 0 };
    for (const t of tareas) {
      if (!t.areaId || !map[t.areaId]) continue;
      map[t.areaId].total++;
      if (t.hecha) map[t.areaId].done++;
    }
    return Object.values(map).filter((a) => a.total > 0);
  }, [tareas, areas]);

  const circR = 54;
  const circC = 2 * Math.PI * circR;
  const circOffset = circC - (tasa / 100) * circC;

  return (
    <div className="stats-view">
      <h2 className="stats-header">Mi Progreso</h2>
      <p className="stats-phrase">{phrase}</p>

      {/* Row 1: KPIs */}
      <div className="stats-kpis">
        <div className="stats-kpi">
          <span className="stats-kpi-num">{streak}</span>
          <span className="stats-kpi-label">Días de racha</span>
        </div>
        <div className="stats-kpi">
          <span className="stats-kpi-num">{completadasHoy}</span>
          <span className="stats-kpi-label">Hoy completadas</span>
        </div>
        <div className="stats-kpi">
          <span className="stats-kpi-num">{totalCompletadas}</span>
          <span className="stats-kpi-label">Total completadas</span>
        </div>
        <div className="stats-kpi">
          <span className="stats-kpi-num">{totalMinutos}</span>
          <span className="stats-kpi-label">Min enfoque total</span>
        </div>
      </div>

      {/* Row 2: Completion rate circle + bar chart */}
      <div className="stats-row2">
        <div className="stats-card stats-rate-card">
          <div className="stats-card-title">Tasa de completado</div>
          <svg className="stats-circle" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={circR} fill="none" stroke="var(--line)" strokeWidth="10" />
            <circle
              cx="64" cy="64" r={circR} fill="none"
              stroke="var(--accent)" strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circC}
              strokeDashoffset={circOffset}
              transform="rotate(-90 64 64)"
              style={{ transition: 'stroke-dashoffset .6s ease' }}
            />
            <text x="64" y="68" textAnchor="middle" fill="var(--text)" fontSize="22" fontWeight="700">
              {tasa}%
            </text>
          </svg>
          <div className="stats-rate-legend">
            <span>{totalCompletadas} hechas</span>
            <span>{totalPendientes} pendientes</span>
          </div>
        </div>

        <div className="stats-card stats-bar-card">
          <div className="stats-card-title">Tareas completadas (7 días)</div>
          <div className="stats-bar-chart">
            {days.map((d) => {
              const val = completadasPorDia[d];
              const pct = (val / maxCompletadas) * 100;
              return (
                <div key={d} className="stats-bar-col">
                  <div className="stats-bar-wrap">
                    <div
                      className="stats-bar"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="stats-bar-val">{val}</span>
                  <span className="stats-bar-label">{dayLabel(d)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Focus minutes chart */}
      <div className="stats-card">
        <div className="stats-card-title">Minutos de enfoque (7 días)</div>
        <div className="stats-bar-chart">
          {days.map((d) => {
            const val = minutosPorDia[d];
            const pct = (val / maxMinutos) * 100;
            return (
              <div key={d} className="stats-bar-col">
                <div className="stats-bar-wrap">
                  <div
                    className="stats-bar focus"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                </div>
                <span className="stats-bar-val">{val}</span>
                <span className="stats-bar-label">{dayLabel(d)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 4: Per-area breakdown */}
      {porArea.length > 0 && (
        <div className="stats-card">
          <div className="stats-card-title">Progreso por área</div>
          <div className="stats-areas">
            {porArea.map((a) => {
              const pct = a.total > 0 ? Math.round((a.done / a.total) * 100) : 0;
              return (
                <div key={a.name} className="stats-area-row">
                  <span className="stats-area-dot" style={{ background: `var(--area-${a.color}, var(--accent))` }} />
                  <span className="stats-area-name">{a.name}</span>
                  <div className="stats-area-bar-bg">
                    <div
                      className="stats-area-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: `var(--area-${a.color}, var(--accent))`,
                      }}
                    />
                  </div>
                  <span className="stats-area-pct">{pct}%</span>
                  <span className="stats-area-count">{a.done}/{a.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
