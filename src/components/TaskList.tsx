import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { TaskItem } from './TaskItem';
import { ImageTaskExtractor } from './ImageTaskExtractor';
import { fechaLarga, fmtHora, hoyISO } from '../utils/date';
import type { Quadrant } from '../types';

export function TaskList() {
  const {
    state,
    dispatch,
    vista,
    irA,
    tareasVisibles,
    tituloVista,
    ordenAlfabetico,
    alternarOrden,
    showToast,
    nombreLista,
  } = useApp();

  const [titulo, setTitulo] = useState('');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [fecha, setFecha] = useState<string>(() => hoyISO());
  const [pomos, setPomos] = useState('1');
  const [quadrant, setQuadrant] = useState<Quadrant>('Q2');
  const [areaId, setAreaId] = useState('');
  const [imgExtractor, setImgExtractor] = useState(false);

  const esLista = vista.startsWith('lista:');
  const listaId = esLista ? vista.slice(6) : 'tareas';

  const pendientes = vista === 'completadas' ? tareasVisibles : tareasVisibles.filter((t) => !t.hecha);
  const completadas = vista === 'completadas' ? [] : tareasVisibles.filter((t) => t.hecha);

  const agregar = () => {
    const limpio = titulo.trim();
    if (!limpio) return;

    // Si hay hora pero no fecha, se asume hoy -> registro automático en el calendario.
    const fechaFinal = inicio && !fecha ? hoyISO() : fecha;
    const estPomos = Math.max(1, parseInt(pomos, 10) || 1);

    dispatch({
      type: 'ADD_TASK',
      input: {
        titulo: limpio,
        listaId,
        miDia: vista === 'miDia' || fechaFinal === hoyISO(),
        importante: vista === 'importante',
        asignada: vista === 'asignadas',
        fecha: fechaFinal,
        inicio,
        fin,
        estPomos,
        quadrant,
        areaId: areaId || undefined,
      },
    });

    if (fechaFinal && inicio) {
      showToast(`Agregada y registrada en el calendario: ${fmtHora(inicio, state.ajustes.hourFormat)}`);
    } else {
      showToast('Tarea agregada');
    }

    setTitulo('');
    setInicio('');
    setFin('');
    setPomos('1');
  };

  const renombrarLista = () => {
    const actual = nombreLista(listaId);
    const nuevo = window.prompt('Nuevo nombre:', actual);
    if (!nuevo?.trim()) return;
    dispatch({ type: 'RENAME_LIST', id: listaId, nombre: nuevo.trim() });
  };

  const borrarLista = () => {
    if (!window.confirm('¿Eliminar la lista? Sus tareas pasarán a «Tareas».')) return;
    dispatch({ type: 'DELETE_LIST', id: listaId });
    irA('tareas');
  };

  return (
    <section className="view active" id="viewTasks">
      <header className="main-header">
        <div>
          <h1>{tituloVista}</h1>
          <p className="subtitle">{vista === 'miDia' ? fechaLarga(new Date()) : ''}</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="icon-btn"
            title="Extraer tareas de imagen"
            onClick={() => setImgExtractor(true)}
          >
            📷
          </button>
          <button
            type="button"
            className="icon-btn"
            title={ordenAlfabetico ? 'Orden alfabético (activo)' : 'Ordenar alfabéticamente'}
            onClick={() => {
              alternarOrden();
              showToast(!ordenAlfabetico ? 'Orden alfabético' : 'Orden por creación');
            }}
          >
            ⇅
          </button>
          {esLista && (
            <>
              <button type="button" className="icon-btn" title="Renombrar lista" onClick={renombrarLista}>
                ✎
              </button>
              <button type="button" className="icon-btn danger" title="Eliminar lista" onClick={borrarLista}>
                🗑
              </button>
            </>
          )}
        </div>
      </header>

      <div className="task-scroll">
        <ul className="task-list">
          {pendientes.map((t) => (
            <TaskItem key={t.id} tarea={t} />
          ))}
        </ul>
        {completadas.length > 0 && (
          <ul className="task-list muted">
            {completadas.map((t) => (
              <TaskItem key={t.id} tarea={t} />
            ))}
          </ul>
        )}
        {tareasVisibles.length === 0 && (
          <p className="empty-msg">No hay tareas todavía. Agrega una abajo o sube una foto de tu horario 📷</p>
        )}
      </div>

      <div className="add-task-bar">
        <span className="plus">＋</span>
        <input
          type="text"
          placeholder="Agregar una tarea (ej. Estudiar cálculo)"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') agregar();
          }}
        />
        <label className="field">
          Hora
          <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
        <label className="field">
          Fin
          <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} />
        </label>
        <label className="field">
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="field narrow">
          🍅
          <input
            type="number"
            min={1}
            max={20}
            value={pomos}
            onChange={(e) => setPomos(e.target.value)}
          />
        </label>
        <label className="field">
          Cuadrante
          <select value={quadrant} onChange={(e) => setQuadrant(e.target.value as Quadrant)}>
            <option value="Q1">Q1 · Hacer ya</option>
            <option value="Q2">Q2 · Planificar</option>
            <option value="Q3">Q3 · Delegar</option>
            <option value="Q4">Q4 · Eliminar</option>
          </select>
        </label>
        {state.areas.length > 0 && (
          <label className="field">
            Área
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="">Sin área</option>
              {state.areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="primary" onClick={agregar}>
          Agregar
        </button>
        <button type="button" className="img-btn" onClick={() => setImgExtractor(true)} title="Extraer tareas desde una foto">
          📷 Desde foto
        </button>
      </div>

      <p className="hint">
        Si escribes una hora, la actividad se registra automáticamente en el calendario.
      </p>

      {imgExtractor && <ImageTaskExtractor onClose={() => setImgExtractor(false)} />}
    </section>
  );
}
