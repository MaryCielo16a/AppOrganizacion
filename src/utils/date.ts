import type { HourFormat } from '../types';

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Fecha local en formato 'YYYY-MM-DD' (nunca UTC, para no cruzar de día). */
export function toISODate(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
}

export function hoyISO(): string {
  return toISODate(new Date());
}

/** 'YYYY-MM-DD' -> Date local a medianoche. */
export function isoADate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function fechaLarga(d: Date): string {
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** 'HH:MM' -> '09:30' o '9:30 am' según el formato configurado. */
export function fmtHora(hhmm: string, formato: HourFormat): string {
  if (!hhmm) return '';
  const [hStr, m] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  if (formato === '12') {
    const suf = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${suf}`;
  }
  return `${String(h).padStart(2, '0')}:${m}`;
}

/** Etiqueta de la columna de horas del calendario. */
export function fmtHoraNum(h: number, formato: HourFormat): string {
  if (formato === '12') {
    const suf = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12} ${suf}`;
  }
  return `${String(h).padStart(2, '0')}:00`;
}

/** Lunes de la semana a la que pertenece `d`. */
export function inicioDeSemana(d: Date): Date {
  const r = new Date(d);
  r.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  r.setHours(0, 0, 0, 0);
  return r;
}

export function sumarDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

export function mmss(totalSegundos: number): string {
  const seguro = Math.max(0, totalSegundos);
  const m = Math.floor(seguro / 60);
  const s = seguro % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
