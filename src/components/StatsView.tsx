import { useCallback, useEffect, useMemo, useState } from 'react';
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

function calcBestStreak(tareas: Task[]): number {
  const completed = new Set<string>();
  for (const t of tareas) {
    if (t.hecha && t.fecha) completed.add(t.fecha);
    if (t.hecha && t.creada) completed.add(t.creada.slice(0, 10));
  }
  const sorted = [...completed].sort();
  if (sorted.length === 0) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const curr = new Date(sorted[i] + 'T00:00:00');
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }
  return best;
}

const LEVELS = [
  { min: 0, name: 'Novato', icon: '🌱' },
  { min: 10, name: 'Aprendiz', icon: '📘' },
  { min: 30, name: 'Enfocado', icon: '🎯' },
  { min: 60, name: 'Productivo', icon: '⚡' },
  { min: 100, name: 'Constante', icon: '🔥' },
  { min: 150, name: 'Experto', icon: '🏆' },
  { min: 250, name: 'Maestro', icon: '👑' },
  { min: 400, name: 'Leyenda', icon: '💎' },
];

function getLevel(xp: number) {
  let level = LEVELS[0];
  let nextLevel = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) {
      level = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
    }
  }
  const xpInLevel = xp - level.min;
  const xpForNext = nextLevel ? nextLevel.min - level.min : 1;
  const pct = nextLevel ? Math.min((xpInLevel / xpForNext) * 100, 100) : 100;
  return { level, nextLevel, xpInLevel, xpForNext, pct, levelIndex: LEVELS.indexOf(level) + 1 };
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

function last84Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) days.push(toISODate(sumarDias(today, -i)));
  return days;
}

interface GitHubEvent {
  type: string;
  created_at: string;
}

const GH_KEY = 'stats_github_username';

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
  const bestStreak = useMemo(() => calcBestStreak(tareas), [tareas]);
  const phrase = motivationalPhrase(streak);

  // XP: 1 per completed task + bonus for streaks
  const xp = totalCompletadas;
  const levelInfo = getLevel(xp);

  // 7-day data
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

  // Weekly trends: this week vs last week
  const trends = useMemo(() => {
    const today = new Date();
    const thisWeekDays: string[] = [];
    const lastWeekDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      thisWeekDays.push(toISODate(sumarDias(today, -i)));
      lastWeekDays.push(toISODate(sumarDias(today, -7 - i)));
    }

    let thisWeekTasks = 0;
    let lastWeekTasks = 0;
    let thisWeekMin = 0;
    let lastWeekMin = 0;
    const thisSet = new Set(thisWeekDays);
    const lastSet = new Set(lastWeekDays);

    for (const t of tareas) {
      if (!t.hecha) continue;
      const key = t.fecha || t.creada.slice(0, 10);
      if (thisSet.has(key)) thisWeekTasks++;
      if (lastSet.has(key)) lastWeekTasks++;
      for (const s of t.sesiones) {
        const sk = s.inicio.slice(0, 10);
        if (thisSet.has(sk)) thisWeekMin += s.minutos;
        if (lastSet.has(sk)) lastWeekMin += s.minutos;
      }
    }

    return {
      tasksDiff: thisWeekTasks - lastWeekTasks,
      minDiff: thisWeekMin - lastWeekMin,
      thisWeekTasks,
      lastWeekTasks,
    };
  }, [tareas]);

  // Heatmap: 84 days (12 weeks)
  const heatmapDays = useMemo(last84Days, []);
  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of heatmapDays) map[d] = 0;
    for (const t of tareas) {
      if (!t.hecha) continue;
      const key = t.fecha || t.creada.slice(0, 10);
      if (key in map) map[key]++;
    }
    return map;
  }, [tareas, heatmapDays]);

  const heatmapMax = Math.max(1, ...Object.values(heatmapData));

  // Group heatmap into weeks (columns)
  const heatmapWeeks = useMemo(() => {
    const weeks: string[][] = [];
    let week: string[] = [];
    const firstDow = new Date(heatmapDays[0] + 'T00:00:00').getDay();
    for (let i = 0; i < firstDow; i++) week.push('');
    for (const d of heatmapDays) {
      week.push(d);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push('');
      weeks.push(week);
    }
    return weeks;
  }, [heatmapDays]);

  // Per-area progress
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

  // Personal records
  const bestDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tareas) {
      if (!t.hecha) continue;
      const key = t.fecha || t.creada.slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    }
    let best = 0;
    for (const v of Object.values(map)) if (v > best) best = v;
    return best;
  }, [tareas]);

  const daysActive = useMemo(() => {
    const set = new Set<string>();
    for (const t of tareas) {
      if (!t.hecha) continue;
      set.add(t.fecha || t.creada.slice(0, 10));
    }
    return set.size;
  }, [tareas]);

  // Consistency: % of last 30 days with at least 1 completed task
  const consistency = useMemo(() => {
    const set = new Set<string>();
    for (const t of tareas) {
      if (!t.hecha) continue;
      set.add(t.fecha || t.creada.slice(0, 10));
    }
    const today = new Date();
    let active = 0;
    for (let i = 0; i < 30; i++) {
      const d = toISODate(sumarDias(today, -i));
      if (set.has(d)) active++;
    }
    return Math.round((active / 30) * 100);
  }, [tareas]);

  // SVG donut
  const circR = 54;
  const circC = 2 * Math.PI * circR;
  const circOffset = circC - (tasa / 100) * circC;

  // GitHub integration
  const [ghUser, setGhUser] = useState(() => {
    try { return localStorage.getItem(GH_KEY) || ''; } catch { return ''; }
  });
  const [ghInput, setGhInput] = useState('');
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState('');
  const [ghEvents, setGhEvents] = useState<GitHubEvent[]>([]);
  const [ghEditing, setGhEditing] = useState(false);

  const fetchGitHub = useCallback(async (username: string) => {
    if (!username) return;
    setGhLoading(true);
    setGhError('');
    try {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`,
      );
      if (!res.ok) throw new Error(res.status === 404 ? 'Usuario no encontrado' : `Error ${res.status}`);
      const data: GitHubEvent[] = await res.json();
      setGhEvents(data);
    } catch (e: unknown) {
      setGhError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setGhLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ghUser) void fetchGitHub(ghUser);
  }, [ghUser, fetchGitHub]);

  const connectGitHub = () => {
    const u = ghInput.trim();
    if (!u) return;
    try { localStorage.setItem(GH_KEY, u); } catch { /* ok */ }
    setGhUser(u);
    setGhEditing(false);
  };

  const disconnectGitHub = () => {
    try { localStorage.removeItem(GH_KEY); } catch { /* ok */ }
    setGhUser('');
    setGhEvents([]);
    setGhInput('');
  };

  // GitHub heatmap data
  const ghHeatmap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of heatmapDays) map[d] = 0;
    for (const ev of ghEvents) {
      const key = ev.created_at.slice(0, 10);
      if (key in map) map[key]++;
    }
    return map;
  }, [ghEvents, heatmapDays]);

  const ghHeatmapMax = Math.max(1, ...Object.values(ghHeatmap));

  const ghThisWeek = useMemo(() => {
    const today = new Date();
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = toISODate(sumarDias(today, -i));
      count += ghHeatmap[d] || 0;
    }
    return count;
  }, [ghHeatmap]);

  const trendArrow = (diff: number) => {
    if (diff > 0) return <span className="stats-trend up">▲ +{diff}</span>;
    if (diff < 0) return <span className="stats-trend down">▼ {diff}</span>;
    return <span className="stats-trend neutral">= 0</span>;
  };

  const heatColor = (val: number, max: number) => {
    if (val === 0) return 'var(--line)';
    const intensity = val / max;
    if (intensity <= 0.25) return 'var(--accent-soft)';
    if (intensity <= 0.5) return 'var(--accent)';
    if (intensity <= 0.75) return 'var(--accent-dark)';
    return 'var(--accent-dark)';
  };

  const heatOpacity = (val: number, max: number) => {
    if (val === 0) return 0.3;
    const intensity = val / max;
    if (intensity <= 0.25) return 0.5;
    if (intensity <= 0.5) return 0.7;
    if (intensity <= 0.75) return 0.85;
    return 1;
  };

  const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const heatmapMonths = useMemo(() => {
    const months: { label: string; col: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < heatmapWeeks.length; w++) {
      const firstDay = heatmapWeeks[w].find((d) => d !== '');
      if (!firstDay) continue;
      const m = new Date(firstDay + 'T00:00:00').getMonth();
      if (m !== lastMonth) {
        months.push({ label: MONTH_LABELS_ES[m], col: w });
        lastMonth = m;
      }
    }
    return months;
  }, [heatmapWeeks]);

  return (
    <div className="stats-view">
      <h2 className="stats-header">Mi Progreso</h2>
      <p className="stats-phrase">{phrase}</p>

      {/* Level / XP bar */}
      <div className="stats-level-card">
        <div className="stats-level-top">
          <span className="stats-level-icon">{levelInfo.level.icon}</span>
          <span className="stats-level-badge">Nivel {levelInfo.levelIndex}</span>
          <span className="stats-level-name">{levelInfo.level.name}</span>
          {levelInfo.nextLevel && (
            <span className="stats-level-next">→ {levelInfo.nextLevel.icon} {levelInfo.nextLevel.name}</span>
          )}
        </div>
        <div className="stats-xp-bar-bg">
          <div
            className="stats-xp-bar-fill"
            style={{ width: `${levelInfo.pct}%` }}
          />
        </div>
        <div className="stats-xp-label">
          {levelInfo.nextLevel
            ? `${levelInfo.xpInLevel} / ${levelInfo.xpForNext} XP para siguiente nivel`
            : '¡Nivel máximo alcanzado! 🎉'}
        </div>
      </div>

      {/* KPIs with trends */}
      <div className="stats-kpis">
        <div className="stats-kpi">
          <span className="stats-kpi-num">{streak}</span>
          <span className="stats-kpi-label">Días de racha</span>
          {streak > 0 && <span className="stats-kpi-fire">{'🔥'.repeat(Math.min(streak, 5))}</span>}
        </div>
        <div className="stats-kpi">
          <span className="stats-kpi-num">{completadasHoy}</span>
          <span className="stats-kpi-label">Hoy completadas</span>
        </div>
        <div className="stats-kpi">
          <span className="stats-kpi-num">{totalCompletadas}</span>
          <span className="stats-kpi-label">Total completadas</span>
          {trendArrow(trends.tasksDiff)}
        </div>
        <div className="stats-kpi">
          <span className="stats-kpi-num">{totalMinutos}</span>
          <span className="stats-kpi-label">Min enfoque total</span>
          {trendArrow(trends.minDiff)}
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="stats-card">
        <div className="stats-card-title">Actividad (12 semanas)</div>
        <div className="stats-heatmap-wrap">
          <div className="stats-heatmap-months">
            {heatmapMonths.map((m) => (
              <span key={`${m.label}-${m.col}`} style={{ gridColumn: m.col + 1 }}>{m.label}</span>
            ))}
          </div>
          <div className="stats-heatmap">
            {heatmapWeeks.map((week, wi) => (
              <div key={wi} className="stats-heatmap-col">
                {week.map((d, di) => (
                  <div
                    key={di}
                    className={`stats-heatmap-cell${d === hoy ? ' today' : ''}`}
                    title={d ? `${d}: ${heatmapData[d] || 0} tareas` : ''}
                    style={d ? {
                      background: heatColor(heatmapData[d] || 0, heatmapMax),
                      opacity: heatOpacity(heatmapData[d] || 0, heatmapMax),
                    } : { background: 'transparent' }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="stats-heatmap-legend">
            <span>Menos</span>
            <div className="stats-heatmap-cell" style={{ background: 'var(--line)', opacity: 0.3 }} />
            <div className="stats-heatmap-cell" style={{ background: 'var(--accent-soft)', opacity: 0.5 }} />
            <div className="stats-heatmap-cell" style={{ background: 'var(--accent)', opacity: 0.7 }} />
            <div className="stats-heatmap-cell" style={{ background: 'var(--accent-dark)', opacity: 1 }} />
            <span>Más</span>
          </div>
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

      {/* Focus minutes chart */}
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

      {/* Personal Records & Achievements */}
      <div className="stats-card">
        <div className="stats-card-title">Logros personales</div>
        <div className="stats-achievements">
          <div className="stats-achievement">
            <span className="stats-achievement-icon">🏅</span>
            <div className="stats-achievement-info">
              <span className="stats-achievement-val">{bestStreak}</span>
              <span className="stats-achievement-label">Mejor racha (días)</span>
            </div>
          </div>
          <div className="stats-achievement">
            <span className="stats-achievement-icon">⚡</span>
            <div className="stats-achievement-info">
              <span className="stats-achievement-val">{bestDay}</span>
              <span className="stats-achievement-label">Mejor día (tareas)</span>
            </div>
          </div>
          <div className="stats-achievement">
            <span className="stats-achievement-icon">📅</span>
            <div className="stats-achievement-info">
              <span className="stats-achievement-val">{daysActive}</span>
              <span className="stats-achievement-label">Días activos</span>
            </div>
          </div>
          <div className="stats-achievement">
            <span className="stats-achievement-icon">📊</span>
            <div className="stats-achievement-info">
              <span className="stats-achievement-val">{consistency}%</span>
              <span className="stats-achievement-label">Consistencia (30 días)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-area breakdown */}
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

      {/* GitHub Integration */}
      <div className="stats-card stats-github-card">
        <div className="stats-card-title">
          <span>GitHub</span>
          {ghUser && !ghEditing && (
            <span className="stats-gh-connected">
              ✓ @{ghUser}
              <button className="stats-gh-edit-btn" onClick={() => { setGhEditing(true); setGhInput(ghUser); }}>✏️</button>
              <button className="stats-gh-edit-btn" onClick={disconnectGitHub}>✕</button>
            </span>
          )}
        </div>

        {(!ghUser || ghEditing) ? (
          <div className="stats-gh-connect">
            <p className="stats-gh-desc">
              Conecta tu GitHub para ver tu actividad de código junto a tus tareas.
            </p>
            <div className="stats-gh-form">
              <input
                className="stats-gh-input"
                placeholder="Tu usuario de GitHub"
                value={ghInput}
                onChange={(e) => setGhInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && connectGitHub()}
              />
              <button className="stats-gh-btn" onClick={connectGitHub}>
                Conectar
              </button>
              {ghEditing && (
                <button className="stats-gh-btn secondary" onClick={() => setGhEditing(false)}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        ) : ghLoading ? (
          <div className="stats-gh-loading">Cargando actividad de GitHub...</div>
        ) : ghError ? (
          <div className="stats-gh-error">{ghError}</div>
        ) : (
          <div className="stats-gh-data">
            <div className="stats-gh-summary">
              <span className="stats-kpi-num">{ghEvents.length}</span>
              <span className="stats-kpi-label">Eventos recientes</span>
              <span className="stats-kpi-num" style={{ marginLeft: 24 }}>{ghThisWeek}</span>
              <span className="stats-kpi-label">Esta semana</span>
            </div>
            <div className="stats-heatmap-wrap">
              <div className="stats-heatmap">
                {heatmapWeeks.map((week, wi) => (
                  <div key={wi} className="stats-heatmap-col">
                    {week.map((d, di) => (
                      <div
                        key={di}
                        className="stats-heatmap-cell"
                        title={d ? `${d}: ${ghHeatmap[d] || 0} eventos` : ''}
                        style={d ? {
                          background: (ghHeatmap[d] || 0) > 0 ? '#39d353' : 'var(--line)',
                          opacity: (ghHeatmap[d] || 0) > 0
                            ? 0.4 + 0.6 * ((ghHeatmap[d] || 0) / ghHeatmapMax)
                            : 0.3,
                        } : { background: 'transparent' }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="stats-heatmap-legend">
                <span>Menos</span>
                <div className="stats-heatmap-cell" style={{ background: 'var(--line)', opacity: 0.3 }} />
                <div className="stats-heatmap-cell" style={{ background: '#39d353', opacity: 0.4 }} />
                <div className="stats-heatmap-cell" style={{ background: '#39d353', opacity: 0.6 }} />
                <div className="stats-heatmap-cell" style={{ background: '#39d353', opacity: 1 }} />
                <span>Más</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
