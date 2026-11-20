import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { useConfetti } from './Confetti';
import { toISODate } from '../utils/date';

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
  for (const l of LEVELS) {
    if (xp >= l.min) level = l;
  }
  return level;
}

function playSound(type: 'complete' | 'levelup' | 'streak') {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;

    if (type === 'complete') {
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1200;
      osc2.type = 'sine';
      gain2.gain.value = 0.12;
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.25);
    } else if (type === 'levelup') {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = 'sine';
        g.gain.value = 0.12;
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15 * (i + 1) + 0.2);
        o.start(ctx.currentTime + 0.15 * i);
        o.stop(ctx.currentTime + 0.15 * (i + 1) + 0.2);
      });
    } else {
      osc.frequency.value = 600;
      osc.type = 'triangle';
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch { /* audio not available */ }
}

interface XpPopup {
  id: number;
  amount: number;
  x: number;
  y: number;
}

export function Gamification() {
  const { state } = useApp();
  const { burst, rain } = useConfetti();
  const [xpPopups, setXpPopups] = useState<XpPopup[]>([]);
  const [levelUp, setLevelUp] = useState<{ name: string; icon: string } | null>(null);
  const prevCompleted = useRef(-1);
  const prevXp = useRef(-1);
  const popupId = useRef(0);

  const xp = useMemo(() => {
    let total = state.tareas.filter((t) => t.hecha).length;
    for (const t of state.tareas) total += Math.floor(t.subtareas.filter((s) => s.hecha).length * 0.5);
    return total;
  }, [state.tareas]);

  const completed = useMemo(() => state.tareas.filter((t) => t.hecha).length, [state.tareas]);

  useEffect(() => {
    if (prevCompleted.current === -1) {
      prevCompleted.current = completed;
      prevXp.current = xp;
      return;
    }

    if (completed > prevCompleted.current) {
      const diff = completed - prevCompleted.current;
      playSound('complete');

      const el = document.querySelector('.task-item.done .check');
      const rect = el?.getBoundingClientRect();
      burst(rect?.left ?? undefined, rect?.top ?? undefined);

      const id = ++popupId.current;
      setXpPopups((prev) => [...prev, {
        id,
        amount: diff,
        x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        y: rect ? rect.top : window.innerHeight / 2,
      }]);
      setTimeout(() => setXpPopups((prev) => prev.filter((p) => p.id !== id)), 1500);
    }

    if (xp > prevXp.current) {
      const oldLevel = getLevel(prevXp.current);
      const newLevel = getLevel(xp);
      if (newLevel.min > oldLevel.min) {
        playSound('levelup');
        rain();
        setLevelUp({ name: newLevel.name, icon: newLevel.icon });
        setTimeout(() => setLevelUp(null), 4000);
      }
    }

    prevCompleted.current = completed;
    prevXp.current = xp;
  }, [completed, xp, burst, rain]);

  return (
    <>
      {/* XP popups */}
      {xpPopups.map((p) => (
        <div
          key={p.id}
          className="xp-popup"
          style={{ left: p.x, top: p.y }}
        >
          +{p.amount} XP
        </div>
      ))}

      {/* Level up celebration */}
      {levelUp && (
        <div className="levelup-overlay" onClick={() => setLevelUp(null)}>
          <div className="levelup-card">
            <div className="levelup-icon">{levelUp.icon}</div>
            <div className="levelup-title">Level Up!</div>
            <div className="levelup-name">{levelUp.name}</div>
            <div className="levelup-sub">Sigue así, vas increíble</div>
          </div>
        </div>
      )}
    </>
  );
}

export function DailyProgress() {
  const { state } = useApp();

  const hoy = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todayCompleted = useMemo(
    () => state.tareas.filter((t) => t.hecha && (t.fecha === hoy || t.creada.startsWith(hoy))).length,
    [state.tareas, hoy],
  );

  const streak = useMemo(() => {
    const completed = new Set<string>();
    for (const t of state.tareas) {
      if (t.hecha && t.fecha) completed.add(t.fecha);
      if (t.hecha && t.creada) completed.add(t.creada.slice(0, 10));
    }
    let s = 0;
    const d = new Date();
    while (true) {
      const iso = toISODate(d);
      if (completed.has(iso)) {
        s++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return s;
  }, [state.tareas]);

  const xp = useMemo(() => {
    let total = state.tareas.filter((t) => t.hecha).length;
    for (const t of state.tareas) total += Math.floor(t.subtareas.filter((s) => s.hecha).length * 0.5);
    return total;
  }, [state.tareas]);

  const level = getLevel(xp);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const pct = nextLevel ? Math.min(((xp - level.min) / (nextLevel.min - level.min)) * 100, 100) : 100;

  // Daily challenges
  const challenges = useMemo(() => {
    const c: { text: string; done: boolean; icon: string }[] = [];

    c.push({
      text: 'Completa 1 tarea',
      done: todayCompleted >= 1,
      icon: '✅',
    });
    c.push({
      text: 'Completa 3 tareas',
      done: todayCompleted >= 3,
      icon: '🎯',
    });

    const todayHabits = state.habits.filter((h) => h.diasCompletados.includes(hoy)).length;
    if (state.habits.length > 0) {
      c.push({
        text: 'Completa un hábito',
        done: todayHabits >= 1,
        icon: '🔄',
      });
    }

    const todayPomos = state.tareas.reduce((sum, t) =>
      sum + t.sesiones.filter((s) => s.inicio.startsWith(hoy)).length, 0);
    c.push({
      text: 'Haz un pomodoro',
      done: todayPomos >= 1,
      icon: '🍅',
    });

    return c;
  }, [todayCompleted, state.habits, state.tareas, hoy]);

  const challengesDone = challenges.filter((c) => c.done).length;

  if (state.tareas.length === 0) return null;

  return (
    <div className="daily-progress">
      <div className="dp-level">
        <span className="dp-level-icon">{level.icon}</span>
        <div className="dp-level-info">
          <div className="dp-level-bar">
            <div className="dp-level-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="dp-level-text">{level.name} · {xp} XP</span>
        </div>
      </div>

      <div className="dp-stats">
        {streak > 0 && (
          <div className="dp-streak" title="Racha de días">
            🔥 {streak}
          </div>
        )}
        <div className="dp-today" title="Completadas hoy">
          ✅ {todayCompleted}
        </div>
      </div>

      <div className="dp-challenges">
        <div className="dp-ch-header">
          Retos diarios ({challengesDone}/{challenges.length})
        </div>
        {challenges.map((c) => (
          <div key={c.text} className={`dp-ch${c.done ? ' done' : ''}`}>
            <span className="dp-ch-icon">{c.done ? '✓' : c.icon}</span>
            <span className="dp-ch-text">{c.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
