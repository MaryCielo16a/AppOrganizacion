import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import type { HourFormat, Task } from '../types';
import {
  DIAS_C,
  MESES,
  fechaLarga,
  fmtHora,
  fmtHoraNum,
  hoyISO,
  inicioDeSemana,
  sumarDias,
  toISODate,
} from '../utils/date';

const HORAS = Array.from({ length: 24 }, (_, h) => h);

export function Calendar() {
  const { state, dispatch, showToast, calModo, setCalModo, calFecha, setCalFecha, eventosDelDia, abrirDetalle } = useApp();
  const { hourFormat } = state.ajustes;

  const dias = useMemo(() => {
    if (calModo === 'dia') return [new Date(calFecha)];
    const lunes = inicioDeSemana(calFecha);
    return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  }, [calFecha, calModo]);

  const subtitulo =
    calModo === 'dia'
      ? fechaLarga(calFecha)
      : `Semana del ${dias[0].getDate()} de ${MESES[dias[0].getMonth()]} al ${dias[6].getDate()} de ${MESES[dias[6].getMonth()]}`;

  const hoy = hoyISO();
  const horaActual = new Date().getHours();
  const total = dias.reduce((a, d) => a + eventosDelDia(toISODate(d)).length, 0);

  const calISO = calModo === 'dia' ? toISODate(calFecha) : '';
  const fechaCorta = calFecha.toLocaleDateString('es', { day: 'numeric', month: 'short' });

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

  const [panelAbierto, setPanelAbierto] = useState(true);

  const agregarAlCal = (id: string) => {
    const target = calModo === 'dia' ? calISO : hoy;
    const now = new Date();
    let nextHour = now.getHours() + 1;
    if (nextHour > 22) nextHour = 9;
    const inicio = `${String(nextHour).padStart(2, '0')}:00`;
    const fin = `${String(Math.min(nextHour + 1, 23)).padStart(2, '0')}:00`;
    dispatch({ type: 'UPDATE_TASK', id, patch: { fecha: target, inicio, fin } });
    showToast('Tarea agregada al calendario');
  };

  const mover = (signo: number) => {
    setCalFecha(sumarDias(calFecha, signo * (calModo === 'dia' ? 1 : 7)));
  };

  return (
    <section className="view active" id="viewCalendar">
      <header className="main-header">
        <div>
          <h1>Calendario</h1>
          <p className="subtitle">{subtitulo}</p>
        </div>
        <div className="header-actions">
          <div className="seg">
            <button
              type="button"
              className={`seg-btn${calModo === 'dia' ? ' active' : ''}`}
              onClick={() => setCalModo('dia')}
            >
              Día
            </button>
            <button
              type="button"
              className={`seg-btn${calModo === 'semana' ? ' active' : ''}`}
              onClick={() => setCalModo('semana')}
            >
              Semana
            </button>
          </div>
          <button type="button" className="icon-btn" onClick={() => mover(-1)} aria-label="Anterior">
            ‹
          </button>
          <button type="button" className="icon-btn" onClick={() => setCalFecha(new Date())}>
            Hoy
          </button>
          <button type="button" className="icon-btn" onClick={() => mover(1)} aria-label="Siguiente">
            ›
          </button>
        </div>
      </header>

      {sinHorario.length > 0 && (
        <div className="cal-suggestions">
          <button
            type="button"
            className="cal-sug-toggle"
            onClick={() => setPanelAbierto((v) => !v)}
          >
            <span>📋 Tareas sin horario ({sinHorario.length})</span>
            <span className="cal-sug-arrow">{panelAbierto ? '▾' : '▸'}</span>
          </button>
          {panelAbierto && (
            <div className="cal-sug-list">
              {sinHorario.map((t) => (
                <div key={t.id} className="cal-sug-card">
                  <div className="cal-sug-info">
                    <span className="cal-sug-name">{t.titulo}</span>
                    <span className="cal-sug-meta">
                      {t.estPomos} 🍅{t.quadrant !== 'Q2' ? ` · ${t.quadrant}` : ''}
                      {t.importante ? ' · ⭐' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="cal-sug-add"
                    onClick={() => agregarAlCal(t.id)}
                  >
                    + {calModo === 'dia' ? fechaCorta : 'Hoy'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="calendar-wrap">
        <div
          className="cal-grid"
          style={{ gridTemplateColumns: `70px repeat(${dias.length}, 1fr)` }}
        >
          <div className="cal-cell-head" />
          {dias.map((d) => (
            <div
              key={`head-${toISODate(d)}`}
              className={`cal-cell-head${toISODate(d) === hoy ? ' today' : ''}`}
            >
              {DIAS_C[d.getDay()]} {d.getDate()}
            </div>
          ))}

          {HORAS.map((h) => (
            <ReglaHora
              key={`fila-${h}`}
              hora={h}
              dias={dias}
              hoy={hoy}
              horaActual={horaActual}
              hourFormat={hourFormat}
              eventosDelDia={eventosDelDia}
              onAbrir={abrirDetalle}
            />
          ))}
        </div>

        <p className="cal-legend">
          {total} actividad(es) registrada(s) automáticamente en este periodo. Toda tarea con fecha
          y hora aparece aquí sin pasos extra.
        </p>
      </div>
    </section>
  );
}

interface ReglaProps {
  hora: number;
  dias: Date[];
  hoy: string;
  horaActual: number;
  hourFormat: HourFormat;
  eventosDelDia: (iso: string) => Task[];
  onAbrir: (id: string) => void;
}

function ReglaHora({ hora, dias, hoy, horaActual, hourFormat, eventosDelDia, onAbrir }: ReglaProps) {
  return (
    <>
      <div className="cal-hour">{fmtHoraNum(hora, hourFormat)}</div>
      {dias.map((d) => {
        const iso = toISODate(d);
        const ahora = iso === hoy && hora === horaActual;
        const evs = eventosDelDia(iso).filter(
          (t) => parseInt(t.inicio.split(':')[0], 10) === hora,
        );
        return (
          <div key={`${iso}-${hora}`} className={`cal-slot${ahora ? ' now' : ''}`}>
            {evs.map((t) => (
              <div
                key={t.id}
                className={`cal-event${t.hecha ? ' done' : ''}`}
                title={t.titulo}
                role="button"
                tabIndex={0}
                onClick={() => onAbrir(t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onAbrir(t.id);
                }}
              >
                {t.titulo}
                <small>
                  {fmtHora(t.inicio, hourFormat)}
                  {t.fin ? ` - ${fmtHora(t.fin, hourFormat)}` : ''} · {t.sesiones.length}/
                  {t.estPomos} 🍅
                </small>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
