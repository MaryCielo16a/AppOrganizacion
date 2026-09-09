import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { hoyISO } from '../utils/date';
import type { ViewId } from '../types';

interface NavDef {
  view: ViewId;
  icono: string;
  clase: string;
  etiqueta: string;
}

const NAV_PRINCIPAL: NavDef[] = [
  { view: 'miDia', icono: '☀', clase: 'sun', etiqueta: 'Mi día' },
  { view: 'importante', icono: '★', clase: 'star', etiqueta: 'Importante' },
  { view: 'planeado', icono: '🗓', clase: 'plan', etiqueta: 'Planeado' },
  { view: 'completadas', icono: '✓', clase: 'done', etiqueta: 'Completadas' },
  { view: 'asignadas', icono: '👤', clase: 'assign', etiqueta: 'Asignado a mí' },
  { view: 'tareas', icono: '🏠', clase: 'home', etiqueta: 'Tareas' },
];

const NAV_HERRAMIENTAS: NavDef[] = [
  { view: 'pomodoro', icono: '🍅', clase: 'tom', etiqueta: 'Pomodoro' },
  { view: 'eisenhower', icono: '⊞', clase: 'eisen', etiqueta: 'Eisenhower' },
  { view: 'areas', icono: '🎯', clase: 'areas', etiqueta: 'Áreas y Metas' },
  { view: 'calendario', icono: '📅', clase: 'cal', etiqueta: 'Calendario' },
];

const NAV_METODO: NavDef[] = [
  { view: 'rutina', icono: '📋', clase: 'rutina', etiqueta: 'Rutina Semanal & Diaria' },
  { view: 'asistente', icono: '🤖', clase: 'ia', etiqueta: 'Asistente IA Gemini' },
];

export function Sidebar() {
  const { state, dispatch, vista, irA, busqueda, setBusqueda, setAjustesAbiertos, sidebarAbierto } = useApp();
  const { user, logout } = useAuth();
  const hoy = hoyISO();

  const contarPendientes = (view: ViewId): number => {
    const t = state.tareas;
    switch (view) {
      case 'miDia':
        return t.filter((x) => !x.hecha && (x.miDia || x.fecha === hoy)).length;
      case 'importante':
        return t.filter((x) => !x.hecha && x.importante).length;
      case 'planeado':
        return t.filter((x) => !x.hecha && x.fecha).length;
      case 'completadas':
        return t.filter((x) => x.hecha).length;
      case 'asignadas':
        return t.filter((x) => !x.hecha && x.asignada).length;
      case 'tareas':
        return t.filter((x) => !x.hecha).length;
      default:
        return 0;
    }
  };

  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => {
    const check = () => setCanInstall(!!(window as any).__pwaCanInstall?.());
    check();
    window.addEventListener('pwa-install-available', check);
    return () => window.removeEventListener('pwa-install-available', check);
  }, []);

  const handleInstall = async () => {
    const accepted = await (window as any).__pwaInstall?.();
    if (accepted) setCanInstall(false);
  };

  const listasPropias = state.listas.filter((l) => !l.fija);

  const nuevaLista = () => {
    const nombre = window.prompt('Nombre de la nueva lista:');
    if (!nombre?.trim()) return;
    const id = `l${Date.now().toString(36)}`;
    dispatch({ type: 'ADD_LIST', nombre: nombre.trim(), id });
    irA(`lista:${id}`);
  };

  return (
    <aside id="sidebar" className={sidebarAbierto ? 'open' : ''}>
      <div className="user-box">
        <div className="avatar">{user?.displayName?.[0]?.toUpperCase() ?? 'U'}</div>
        <div className="user-meta">
          <div className="user-name">{user?.displayName ?? 'Usuario'}</div>
          <div className="user-mail">{user?.email ?? ''}</div>
        </div>
      </div>

      <div className="search-box">
        <span className="ico">🔍</span>
        <input
          type="text"
          placeholder="Buscar"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            if (vista === 'calendario' || vista === 'pomodoro') irA('tareas');
          }}
        />
      </div>

      <nav className="nav-lists">
        {NAV_PRINCIPAL.map((n) => {
          const num = contarPendientes(n.view);
          return (
            <button
              key={n.view}
              type="button"
              className={`nav-item${vista === n.view ? ' active' : ''}`}
              onClick={() => irA(n.view)}
            >
              <span className={`ico ${n.clase}`}>{n.icono}</span>
              <span className="nav-label">{n.etiqueta}</span>
              <span className="count">{num || ''}</span>
            </button>
          );
        })}
      </nav>

      <div className="nav-divider" />

      <nav className="nav-lists">
        {NAV_HERRAMIENTAS.map((n) => (
          <button
            key={n.view}
            type="button"
            className={`nav-item${vista === n.view ? ' active' : ''}`}
            onClick={() => irA(n.view)}
          >
            <span className={`ico ${n.clase}`}>{n.icono}</span>
            <span className="nav-label">{n.etiqueta}</span>
          </button>
        ))}
      </nav>

      <div className="nav-divider" />

      <nav className="nav-lists">
        {NAV_METODO.map((n) => (
          <button
            key={n.view}
            type="button"
            className={`nav-item${vista === n.view ? ' active' : ''}`}
            onClick={() => irA(n.view)}
          >
            <span className={`ico ${n.clase}`}>{n.icono}</span>
            <span className="nav-label">{n.etiqueta}</span>
            {n.view === 'rutina' && <span className="nav-badge guide">Guía</span>}
            {n.view === 'asistente' && <span className="nav-badge ia">IA</span>}
          </button>
        ))}
      </nav>

      {state.areas.length > 0 && (
        <>
          <div className="nav-divider" />
          <div className="custom-lists-title">Mis áreas</div>
          <nav className="nav-lists">
            {state.areas.map((a) => {
              const num = state.tareas.filter((t) => t.areaId === a.id && !t.hecha).length;
              return (
                <button
                  key={a.id}
                  type="button"
                  className="nav-item"
                  onClick={() => irA('areas')}
                >
                  <span className="ico area-ico" style={{ color: `var(--area-${a.color}, var(--accent))` }}>●</span>
                  <span className="nav-label">{a.name}</span>
                  <span className="count">{num || ''}</span>
                </button>
              );
            })}
          </nav>
        </>
      )}

      <div className="nav-divider" />
      <div className="custom-lists-title">Mis listas</div>

      <nav className="nav-lists" id="customLists">
        {listasPropias.length === 0 ? (
          <div className="hint" style={{ padding: '0 10px 8px' }}>
            Aún no tienes listas propias.
          </div>
        ) : (
          listasPropias.map((l) => {
            const num = state.tareas.filter((t) => t.listaId === l.id && !t.hecha).length;
            const view: ViewId = `lista:${l.id}`;
            return (
              <button
                key={l.id}
                type="button"
                className={`nav-item${vista === view ? ' active' : ''}`}
                onClick={() => irA(view)}
              >
                <span className="ico">📋</span>
                <span className="nav-label">{l.nombre}</span>
                <span className="count">{num || ''}</span>
              </button>
            );
          })
        )}
      </nav>

      {canInstall && (
        <div className="install-app-box">
          <button type="button" className="install-app-btn" onClick={handleInstall}>
            <span className="ico">📲</span> Instalar app
          </button>
        </div>
      )}

      <div className="sidebar-footer">
        <button type="button" className="new-list-btn" onClick={nuevaLista}>
          <span className="ico">＋</span> Nueva lista
        </button>
        <button
          type="button"
          className="settings-btn"
          title="Configuración"
          aria-label="Configuración"
          onClick={() => setAjustesAbiertos(true)}
        >
          ⚙
        </button>
        <button
          type="button"
          className="settings-btn"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          onClick={logout}
        >
          ⏻
        </button>
      </div>
    </aside>
  );
}
