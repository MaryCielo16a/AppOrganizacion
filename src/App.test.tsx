import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AppProvider } from './store/AppContext';
import { App } from './App';
import { STORAGE_KEY } from './store/defaults';
import type { PersistedState } from './types';

function renderApp() {
  return render(
    <AppProvider>
      <App />
    </AppProvider>,
  );
}

/**
 * La persistencia va con un debounce de 150 ms, así que hay que dejar
 * correr los temporizadores antes de leer localStorage.
 */
function flushPersistencia() {
  act(() => {
    vi.advanceTimersByTime(300);
  });
}

function leerStorage(): PersistedState {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as PersistedState;
}

/** Escribe en un input controlado por React. */
function setInput(el: HTMLElement, valor: string) {
  fireEvent.change(el, { target: { value: valor } });
}

function filaConTexto(texto: string): HTMLElement {
  const li = screen
    .getAllByRole('listitem')
    .find((x) => x.className.includes('task-item') && x.textContent?.includes(texto));
  if (!li) throw new Error(`No se encontró la tarea "${texto}"`);
  return li;
}

/** Crea la tarea de prueba con hora 21:00-22:00 y 3 pomodoros estimados. */
function crearTareaConHora() {
  const barra = document.querySelector('.add-task-bar') as HTMLElement;
  setInput(within(barra).getByPlaceholderText(/Agregar una tarea/i), 'Reunión de tesis');
  const horas = barra.querySelectorAll('input[type="time"]');
  setInput(horas[0] as HTMLElement, '21:00');
  setInput(horas[1] as HTMLElement, '22:00');
  setInput(barra.querySelector('input[type="number"]') as HTMLElement, '3');
  fireEvent.click(within(barra).getByRole('button', { name: 'Agregar' }));
}

function irASeccion(nombre: string | RegExp) {
  const sidebar = document.getElementById('sidebar') as HTMLElement;
  fireEvent.click(within(sidebar).getByRole('button', { name: new RegExp(nombre, 'i') }));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(window, 'prompt').mockReturnValue('Lista de prueba');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Arranque y barra lateral', () => {
  it('muestra las secciones esperadas y ninguna lista de Comestibles', () => {
    renderApp();
    const sidebar = document.getElementById('sidebar') as HTMLElement;
    for (const s of [
      'Mi día',
      'Importante',
      'Planeado',
      'Completadas',
      'Asignado a mí',
      'Tareas',
      'Calendario',
      'Pomodoro',
    ]) {
      expect(within(sidebar).getByText(s)).toBeTruthy();
    }
    expect(document.body.textContent?.toLowerCase()).not.toContain('comestible');
  });

  it('siembra tareas de ejemplo la primera vez', () => {
    renderApp();
    expect(document.querySelectorAll('.task-item').length).toBe(3);
    expect(document.querySelector('.main-header h1')?.textContent).toBe('Mi día');
  });
});

describe('Crear tarea con hora -> registro automático en el calendario', () => {
  it('la tarea aparece con contador 0/3 y su horario', () => {
    renderApp();
    crearTareaConHora();

    const li = filaConTexto('Reunión de tesis');
    expect(li.querySelector('.pomo-count')?.textContent?.replace(/\s+/g, '')).toBe('0/3🍅');
    expect(li.querySelector('.task-meta')?.textContent).toContain('21:00');
    expect(li.querySelector('.task-meta')?.textContent).toContain('22:00');
    expect(screen.getByRole('status').textContent).toContain('registrada en el calendario');
  });

  it('aparece en el calendario sin ningún paso extra', () => {
    renderApp();
    crearTareaConHora();
    irASeccion('Calendario');

    expect(document.querySelectorAll('.cal-hour').length).toBe(24);

    const eventos = Array.from(document.querySelectorAll('.cal-event'));
    const ev = eventos.find((e) => e.textContent?.includes('Reunión de tesis'));
    expect(ev).toBeTruthy();
    expect(ev?.textContent).toContain('21:00 - 22:00');
    expect(ev?.textContent).toContain('0/3');

    // 3 ejemplos con hora + la nueva
    expect(eventos.length).toBe(4);
  });

  it('la vista Semana muestra 7 días', () => {
    renderApp();
    irASeccion('Calendario');
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }));
    // 1 celda vacía de la esquina + 7 días
    expect(document.querySelectorAll('.cal-cell-head').length).toBe(8);
  });

  it('al pulsar el evento se abre el detalle y avisa de que está registrada', () => {
    renderApp();
    crearTareaConHora();
    irASeccion('Calendario');
    const ev = Array.from(document.querySelectorAll('.cal-event')).find((e) =>
      e.textContent?.includes('Reunión de tesis'),
    ) as HTMLElement;
    fireEvent.click(ev);

    const detalle = document.getElementById('detail') as HTMLElement;
    expect(detalle).toBeTruthy();
    expect(detalle.textContent).toContain('Registrada automáticamente');
    expect(detalle.querySelector('.pomo-log')?.textContent).toContain('Sin pomodoros completados');
  });
});

describe('Pomodoro por tarea', () => {
  it('cuenta atrás, completa el bloque y sube el contador a 1/3', () => {
    vi.useFakeTimers();
    renderApp();
    crearTareaConHora();

    // Silenciar alarma para no tocar Web Audio en jsdom
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    const modal = document.querySelector('.modal') as HTMLElement;
    const selects = modal.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'ninguno' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Aceptar' }));

    // Activar la tarea en el temporizador
    fireEvent.click(within(filaConTexto('Reunión de tesis')).getByRole('button', { name: /Pomodoro/ }));

    expect(document.getElementById('viewPomodoro')).toBeTruthy();
    expect(document.querySelector('.pomo-task')?.textContent).toBe('Reunión de tesis');
    expect(screen.getByTestId('pomo-time').textContent).toBe('25:00');

    // Arrancar y dejar correr 3 segundos
    fireEvent.click(screen.getByRole('button', { name: 'START' }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('pomo-time').textContent).toBe('24:57');
    expect(screen.getByRole('button', { name: 'PAUSE' })).toBeTruthy();

    // Saltar el bloque -> registra la sesión
    fireEvent.click(screen.getByRole('button', { name: 'Saltar este bloque' }));
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const item = Array.from(document.querySelectorAll('.pomo-task-list li')).find((x) =>
      x.textContent?.includes('Reunión de tesis'),
    );
    expect(item?.querySelector('.p-count')?.textContent?.replace(/\s+/g, '')).toBe('1/3');
    expect(document.querySelector('.pomo-round')?.textContent).toContain('#2');
    expect(document.querySelector('.pomo-tab.active')?.textContent).toBe('Descanso corto');
    expect(document.querySelector('.pomo-summary')?.textContent).toContain(
      'Pomodoros completados: 1',
    );

    // La sesión queda en el historial de la tarea
    flushPersistencia();
    const guardado = leerStorage();
    const tarea = guardado.tareas.find((t) => t.titulo === 'Reunión de tesis');
    expect(tarea?.sesiones.length).toBe(1);
    expect(tarea?.sesiones[0]?.minutos).toBe(25);
  });

  it('marca la tarea como completada al alcanzar los pomodoros estimados', () => {
    vi.useFakeTimers();
    renderApp();

    const barra = document.querySelector('.add-task-bar') as HTMLElement;
    setInput(within(barra).getByPlaceholderText(/Agregar una tarea/i), 'Tarea de 1 pomodoro');
    setInput(barra.querySelector('input[type="number"]') as HTMLElement, '1');
    fireEvent.click(within(barra).getByRole('button', { name: 'Agregar' }));

    fireEvent.click(
      within(filaConTexto('Tarea de 1 pomodoro')).getByRole('button', { name: /Pomodoro/ }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'START' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saltar este bloque' }));
    act(() => {
      vi.advanceTimersByTime(100);
    });

    flushPersistencia();
    const tarea = leerStorage().tareas.find((t) => t.titulo === 'Tarea de 1 pomodoro');
    expect(tarea?.hecha).toBe(true);
  });
});

describe('Ajustes y persistencia', () => {
  it('guarda los ajustes y sobreviven a recargar la app', () => {
    vi.useFakeTimers();
    const { unmount } = renderApp();
    crearTareaConHora();

    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    const modal = document.querySelector('.modal') as HTMLElement;

    setInput(modal.querySelector('.time-grid input') as HTMLElement, '30');
    const selectHora = Array.from(modal.querySelectorAll('select')).find((s) =>
      s.querySelector('option[value="12"]'),
    ) as HTMLSelectElement;
    fireEvent.change(selectHora, { target: { value: '12' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Tema azul' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Aceptar' }));

    flushPersistencia();
    const guardado = leerStorage();
    expect(guardado.ajustes.pomodoro).toBe(30);
    expect(guardado.ajustes.hourFormat).toBe('12');
    expect(guardado.ajustes.theme).toBe('azul');
    expect(guardado.tareas.length).toBe(4);

    // "Recargar": desmontar y volver a montar leyendo de localStorage
    unmount();
    renderApp();

    expect(document.querySelectorAll('.task-item').length).toBe(4);
    expect(document.body.dataset.theme).toBe('azul');

    irASeccion('Calendario');
    const horas = document.querySelectorAll('.cal-hour');
    expect(horas[0].textContent).toBe('12 am');
    expect(horas[13].textContent).toBe('1 pm');

    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    expect((document.querySelector('.time-grid input') as HTMLInputElement).value).toBe('30');
  });

  it('conserva las tareas y sus pomodoros al recargar', () => {
    vi.useFakeTimers();
    const { unmount } = renderApp();
    crearTareaConHora();

    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }));
    const modal = document.querySelector('.modal') as HTMLElement;
    fireEvent.change(modal.querySelectorAll('select')[0], { target: { value: 'ninguno' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Aceptar' }));

    fireEvent.click(within(filaConTexto('Reunión de tesis')).getByRole('button', { name: /Pomodoro/ }));
    fireEvent.click(screen.getByRole('button', { name: 'START' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saltar este bloque' }));
    flushPersistencia();

    unmount();
    renderApp();

    const li = filaConTexto('Reunión de tesis');
    expect(li.querySelector('.pomo-count')?.textContent?.replace(/\s+/g, '')).toBe('1/3🍅');
  });
});

describe('Listas propias', () => {
  it('crea una lista y las tareas nuevas caen en ella', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Nueva lista/ }));

    expect(document.querySelector('.main-header h1')?.textContent).toBe('Lista de prueba');

    const barra = document.querySelector('.add-task-bar') as HTMLElement;
    setInput(within(barra).getByPlaceholderText(/Agregar una tarea/i), 'Comprar cuaderno');
    fireEvent.click(within(barra).getByRole('button', { name: 'Agregar' }));

    expect(document.querySelectorAll('.task-item').length).toBe(1);
    expect(filaConTexto('Comprar cuaderno').querySelector('.task-meta')?.textContent).toContain(
      'Lista de prueba',
    );
  });
});
