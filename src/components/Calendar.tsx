import { useCallback, useMemo, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import type { HourFormat, Task } from '../types';
import {
  DIAS_C,
  MESES,
  fmtHora,
  fmtHoraNum,
  hoyISO,
  inicioDeSemana,
  isoADate,
  sumarDias,
  toISODate,
} from '../utils/date';

const HORAS = Array.from({ length: 24 }, (_, h) => h);
const DIAS_HEADER = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

function getMesGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const startOff = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOff);
  const weeks: Date[][] = [];
  const d = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    weeks.push(week);
    if (weeks.length >= 5 && week[6].getMonth() !== month) break;
  }
  return weeks;
}

interface QuickAdd {
  fecha: string;
  hora: number;
  x: number;
  y: number;
}

export function Calendar() {
  const { state, dispatch, showToast, calModo, setCalModo, calFecha, setCalFecha, eventosDelDia, abrirDetalle } = useApp();
  const { hourFormat } = state.ajustes;
  const hoy = hoyISO();
  const horaActual = new Date().getHours();
  const minutoActual = new Date().getMinutes();

  const dias = useMemo(() => {
    if (calModo === 'dia') return [new Date(calFecha)];
    if (calModo === 'mes') return [];
    const lunes = inicioDeSemana(calFecha);
    return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  }, [calFecha, calModo]);

  const mesGrid = useMemo(
    () => calModo === 'mes' ? getMesGrid(calFecha.getFullYear(), calFecha.getMonth()) : [],
    [calFecha, calModo],
  );

  const tituloHeader = useMemo(() => {
    if (calModo === 'mes') {
      return `${MESES[calFecha.getMonth()].charAt(0).toUpperCase() + MESES[calFecha.getMonth()].slice(1)} ${calFecha.getFullYear()}`;
    }
    if (calModo === 'dia') {
      const d = calFecha;
      return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    }
    const lunes = dias[0];
    const dom = dias[6];
    if (lunes.getMonth() === dom.getMonth()) {
      return `${lunes.getDate()} – ${dom.getDate()} de ${MESES[lunes.getMonth()]} de ${lunes.getFullYear()}`;
    }
    return `${lunes.getDate()} de ${MESES[lunes.getMonth()].slice(0, 3)} – ${dom.getDate()} de ${MESES[dom.getMonth()].slice(0, 3)} de ${dom.getFullYear()}`;
  }, [calFecha, calModo, dias]);

  const sinHorario = useMemo(
    () =>
      state.tareas
        .filter((t) => !t.hecha && !t.inicio)
        .sort((a, b) => {
          if (a.importante !== b.importante) return a.importante ? -1 : 1;
          if (a.quadrant < b.quadrant) return -1;
          if (a.quadrant > b.quadrant) return 1;
          return 0;
        })
        .slice(0, 12),
    [state.tareas],
  );

  const [sugOpen, setSugOpen] = useState(false);

  // Quick-add state
  const [quickAdd, setQuickAdd] = useState<QuickAdd | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const quickInputRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const openQuickAdd = useCallback((fecha: string, hora: number, e: React.MouseEvent) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    // Keep popup within bounds
    if (x + 280 > rect.width) x = rect.width - 290;
    if (x < 10) x = 10;
    if (y + 180 > rect.height) y = y - 180;
    setQuickAdd({ fecha, hora, x, y });
    setQuickTitle('');
    setTimeout(() => quickInputRef.current?.focus(), 50);
  }, []);

  const submitQuickAdd = useCallback(() => {
    if (!quickAdd || !quickTitle.trim()) return;
    const inicio = `${String(quickAdd.hora).padStart(2, '0')}:00`;
    const finH = Math.min(quickAdd.hora + 1, 23);
    const fin = `${String(finH).padStart(2, '0')}:00`;
    dispatch({
      type: 'ADD_TASK',
      input: {
        titulo: quickTitle.trim(),
        fecha: quickAdd.fecha,
        inicio,
        fin,
        estPomos: 1,
        miDia: quickAdd.fecha === hoy,
      },
    });
    showToast(`Tarea creada: ${fmtHora(inicio, hourFormat)} – ${fmtHora(fin, hourFormat)}`);
    setQuickAdd(null);
    setQuickTitle('');
  }, [quickAdd, quickTitle, dispatch, showToast, hourFormat, hoy]);

  const agregarAlCal = (id: string) => {
    const target = calModo === 'dia' ? toISODate(calFecha) : hoy;
    const now = new Date();
    let nextHour = now.getHours() + 1;
    if (nextHour > 22) nextHour = 9;
    const inicio = `${String(nextHour).padStart(2, '0')}:00`;
    const fin = `${String(Math.min(nextHour + 1, 23)).padStart(2, '0')}:00`;
    dispatch({ type: 'UPDATE_TASK', id, patch: { fecha: target, inicio, fin } });
    showToast('Tarea agregada al calendario');
  };

  const mover = (signo: number) => {
    if (calModo === 'mes') {
      const d = new Date(calFecha);
      d.setMonth(d.getMonth() + signo);
      setCalFecha(d);
    } else {
      setCalFecha(sumarDias(calFecha, signo * (calModo === 'dia' ? 1 : 7)));
    }
  };

  const irHoy = () => setCalFecha(new Date());

  return (
    <section className="view active gcal" id="viewCalendar" ref={sectionRef}>
      {/* ===== TOOLBAR ===== */}
      <div className="gcal-toolbar">
        <div className="gcal-toolbar-left">
          <button type="button" className="gcal-today-btn" onClick={irHoy}>Hoy</button>
          <button type="button" className="gcal-nav-btn" onClick={() => mover(-1)} aria-label="Anterior">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button type="button" className="gcal-nav-btn" onClick={() => mover(1)} aria-label="Siguiente">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <h2 className="gcal-title">{tituloHeader}</h2>
        </div>
        <div className="gcal-toolbar-right">
          {sinHorario.length > 0 && (
            <button type="button" className="gcal-sug-btn" onClick={() => setSugOpen((v) => !v)} title="Tareas sin horario">
              📋 {sinHorario.length}
            </button>
          )}
          <div className="gcal-mode-tabs">
            {(['dia', 'semana', 'mes'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`gcal-mode-tab${calModo === m ? ' active' : ''}`}
                onClick={() => setCalModo(m)}
              >
                {m === 'dia' ? 'Día' : m === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== SUGGESTIONS DROPDOWN ===== */}
      {sugOpen && sinHorario.length > 0 && (
        <div className="gcal-sug-dropdown">
          <div className="gcal-sug-header">
            <span>Tareas sin horario</span>
            <button type="button" className="gcal-sug-close" onClick={() => setSugOpen(false)}>✕</button>
          </div>
          <div className="gcal-sug-list">
            {sinHorario.map((t) => (
              <div key={t.id} className="gcal-sug-item" onClick={() => abrirDetalle(t.id)}>
                <div className="gcal-sug-dot" />
                <div className="gcal-sug-info">
                  <span className="gcal-sug-name">{t.titulo}</span>
                  <span className="gcal-sug-meta">
                    {t.estPomos} 🍅{t.quadrant !== 'Q2' ? ` · ${t.quadrant}` : ''}
                    {t.importante ? ' · ★' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="gcal-sug-add"
                  onClick={(e) => { e.stopPropagation(); agregarAlCal(t.id); }}
                  title="Agregar al calendario"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== QUICK ADD POPUP ===== */}
      {quickAdd && (
        <>
          <div className="gcal-quick-overlay" onClick={() => setQuickAdd(null)} />
          <div className="gcal-quick-popup" style={{ left: quickAdd.x, top: quickAdd.y }}>
            <input
              ref={quickInputRef}
              type="text"
              className="gcal-quick-input"
              placeholder="Nombre de la tarea"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitQuickAdd();
                if (e.key === 'Escape') setQuickAdd(null);
              }}
            />
            <div className="gcal-quick-info">
              <span>📅 {quickAdd.fecha}</span>
              <span>🕐 {fmtHoraNum(quickAdd.hora, hourFormat)} – {fmtHoraNum(Math.min(quickAdd.hora + 1, 23), hourFormat)}</span>
            </div>
            <div className="gcal-quick-actions">
              <button type="button" className="gcal-quick-save" onClick={submitQuickAdd}>
                Guardar
              </button>
              <button type="button" className="gcal-quick-cancel" onClick={() => setQuickAdd(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== MONTH VIEW ===== */}
      {calModo === 'mes' && (
        <div className="gcal-month-wrap">
          <div className="gcal-month-grid">
            {DIAS_HEADER.map((d) => (
              <div key={d} className="gcal-month-dayname">{d}</div>
            ))}
            {mesGrid.flat().map((d) => {
              const iso = toISODate(d);
              const isToday = iso === hoy;
              const isCurrentMonth = d.getMonth() === calFecha.getMonth();
              const evts = state.tareas.filter((t) => t.fecha === iso && !t.hecha).slice(0, 3);
              const allEvts = state.tareas.filter((t) => t.fecha === iso);
              const overflow = allEvts.length > 3 ? allEvts.length - 3 : 0;
              return (
                <div
                  key={iso}
                  className={`gcal-month-cell${!isCurrentMonth ? ' other' : ''}${isToday ? ' today' : ''}`}
                  onClick={() => { setCalFecha(isoADate(iso)); setCalModo('dia'); }}
                >
                  <span className={`gcal-month-num${isToday ? ' today-circle' : ''}`}>
                    {d.getDate()}
                  </span>
                  <div className="gcal-month-events">
                    {evts.map((t) => (
                      <div
                        key={t.id}
                        className={`gcal-month-ev${t.inicio ? ' timed' : ''}`}
                        onClick={(e) => { e.stopPropagation(); abrirDetalle(t.id); }}
                        title={t.titulo}
                      >
                        {t.inicio && <span className="gcal-month-ev-dot" />}
                        <span className="gcal-month-ev-text">
                          {t.inicio ? fmtHora(t.inicio, hourFormat) + ' ' : ''}{t.titulo}
                        </span>
                      </div>
                    ))}
                    {overflow > 0 && <div className="gcal-month-more">+{overflow} más</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== DAY / WEEK VIEW ===== */}
      {calModo !== 'mes' && (
        <div className="gcal-time-wrap">
          <div className="gcal-time-grid" style={{ gridTemplateColumns: `56px repeat(${dias.length}, 1fr)` }}>
            {/* Header row */}
            <div className="gcal-time-corner" />
            {dias.map((d) => {
              const iso = toISODate(d);
              const isToday = iso === hoy;
              return (
                <div key={`h-${iso}`} className={`gcal-time-head${isToday ? ' today' : ''}`}>
                  <span className="gcal-time-head-day">{DIAS_C[d.getDay()].toUpperCase()}</span>
                  <span className={`gcal-time-head-num${isToday ? ' today-circle' : ''}`}>
                    {d.getDate()}
                  </span>
                </div>
              );
            })}

            {/* Time rows */}
            {HORAS.map((h) => (
              <TimeRow
                key={h}
                hora={h}
                dias={dias}
                hoy={hoy}
                horaActual={horaActual}
                minutoActual={minutoActual}
                hourFormat={hourFormat}
                eventosDelDia={eventosDelDia}
                onAbrir={abrirDetalle}
                onSlotClick={openQuickAdd}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface TimeRowProps {
  hora: number;
  dias: Date[];
  hoy: string;
  horaActual: number;
  minutoActual: number;
  hourFormat: HourFormat;
  eventosDelDia: (iso: string) => Task[];
  onAbrir: (id: string) => void;
  onSlotClick: (fecha: string, hora: number, e: React.MouseEvent) => void;
}

function TimeRow({ hora, dias, hoy, horaActual, minutoActual, hourFormat, eventosDelDia, onAbrir, onSlotClick }: TimeRowProps) {
  return (
    <>
      <div className="gcal-time-label">
        {hora > 0 && <span>{fmtHoraNum(hora, hourFormat)}</span>}
      </div>
      {dias.map((d) => {
        const iso = toISODate(d);
        const isToday = iso === hoy;
        const showLine = isToday && hora === horaActual;
        const evs = eventosDelDia(iso).filter(
          (t) => parseInt(t.inicio.split(':')[0], 10) === hora,
        );
        return (
          <div
            key={`${iso}-${hora}`}
            className={`gcal-time-slot${isToday ? ' today-col' : ''}`}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('.gcal-event')) return;
              onSlotClick(iso, hora, e);
            }}
          >
            {showLine && (
              <div
                className="gcal-now-line"
                style={{ top: `${(minutoActual / 60) * 100}%` }}
              >
                <div className="gcal-now-dot" />
              </div>
            )}
            {evs.map((t) => {
              const startMin = parseInt((t.inicio.split(':')[1] || '0'), 10);
              const endH = t.fin ? parseInt(t.fin.split(':')[0], 10) : hora + 1;
              const endMin = t.fin ? parseInt((t.fin.split(':')[1] || '0'), 10) : 0;
              const durationMin = (endH - hora) * 60 + endMin - startMin;
              const topPct = (startMin / 60) * 100;
              const heightPct = Math.max((durationMin / 60) * 100, 22);
              return (
                <div
                  key={t.id}
                  className={`gcal-event${t.hecha ? ' done' : ''}`}
                  style={{ top: `${topPct}%`, height: `${heightPct}%`, minHeight: '22px' }}
                  title={t.titulo}
                  role="button"
                  tabIndex={0}
                  onClick={() => onAbrir(t.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onAbrir(t.id); }}
                >
                  <span className="gcal-event-title">{t.titulo}</span>
                  <span className="gcal-event-time">
                    {fmtHora(t.inicio, hourFormat)}
                    {t.fin ? ` – ${fmtHora(t.fin, hourFormat)}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
