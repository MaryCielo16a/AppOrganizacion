import { useRef, useState, type FormEvent } from 'react';
import { useApp } from '../store/AppContext';
import { DEFAULT_SETTINGS } from '../store/defaults';
import { normalizarAjustes } from '../store/reducer';
import { sonarAlarma } from '../utils/sound';
import type {
  AlarmSound,
  FocusSound,
  HourFormat,
  ReminderType,
  Settings,
  ThemeName,
} from '../types';

const TEMAS: { nombre: ThemeName; color: string }[] = [
  { nombre: 'magenta', color: '#ba4e78' },
  { nombre: 'morado', color: '#5b4b9c' },
  { nombre: 'azul', color: '#2b7cb8' },
  { nombre: 'verde', color: '#3a8a6b' },
  { nombre: 'rojo', color: '#b8443c' },
];

export function SettingsPanel() {
  const { state, dispatch, setAjustesAbiertos, showToast } = useApp();

  // Borrador local: se confirma con "Aceptar".
  // El panel se monta al abrirse (App lo renderiza condicionalmente), así que
  // el valor inicial ya son los ajustes vigentes. No hay que resincronizarlo
  // después: hacerlo borraría los cambios sin guardar cuando algún control
  // (p. ej. el tema) se aplica al momento.
  const [draft, setDraft] = useState<Settings>(state.ajustes);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const num = (v: string) => (v === '' ? 0 : Number(v));

  const guardar = () => {
    dispatch({ type: 'UPDATE_SETTINGS', patch: normalizarAjustes(draft) });
    setAjustesAbiertos(false);
    showToast('Configuración guardada');
  };

  const restablecer = () => {
    if (!window.confirm('¿Restablecer la configuración por defecto?')) return;
    setDraft(DEFAULT_SETTINGS);
    dispatch({ type: 'RESET_SETTINGS' });
  };

  const pedirNotificaciones = () => {
    if (!('Notification' in window)) {
      showToast('Tu navegador no soporta notificaciones.');
      return;
    }
    void Notification.requestPermission().then((p) =>
      showToast(p === 'granted' ? 'Notificaciones activadas' : 'Notificaciones no permitidas'),
    );
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setAjustesAbiertos(false);
      }}
    >
      <div className="modal" role="dialog" aria-label="Configuración">
        <div className="modal-head">
          <span>CONFIGURACIÓN</span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setAjustesAbiertos(false)}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* ---- TEMPORIZADOR ---- */}
          <div className="set-group">
            <div className="set-group-title">⏱ TEMPORIZADOR</div>
            <div className="set-sub">Tiempo (minutos)</div>
            <div className="time-grid">
              <label>
                Pomodoro
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={draft.pomodoro}
                  onChange={(e) => set('pomodoro', num(e.target.value))}
                />
              </label>
              <label>
                Descanso corto
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={draft.corto}
                  onChange={(e) => set('corto', num(e.target.value))}
                />
              </label>
              <label>
                Descanso largo
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={draft.largo}
                  onChange={(e) => set('largo', num(e.target.value))}
                />
              </label>
            </div>

            <div className="set-row">
              <span>Inicio automático de descansos</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={draft.autoBreaks}
                  onChange={(e) => set('autoBreaks', e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="set-row">
              <span>Inicio automático de pomodoros</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={draft.autoPomos}
                  onChange={(e) => set('autoPomos', e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="set-row">
              <span>Intervalo de descanso largo</span>
              <input
                className="mini"
                type="number"
                min={1}
                max={12}
                value={draft.longInterval}
                onChange={(e) => set('longInterval', num(e.target.value))}
              />
            </div>
          </div>

          {/* ---- TAREAS ---- */}
          <div className="set-group">
            <div className="set-group-title">✓ TAREAS</div>
            <div className="set-row">
              <span>
                Marcar tareas automáticamente{' '}
                <i className="help" title="Completa la tarea al alcanzar sus pomodoros estimados">
                  ?
                </i>
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={draft.autoCheck}
                  onChange={(e) => set('autoCheck', e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>
            <div className="set-row">
              <span>
                Mover al final al completar{' '}
                <i className="help" title="Las tareas completadas se mueven al final de la lista">
                  ?
                </i>
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={draft.checkBottom}
                  onChange={(e) => set('checkBottom', e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>
          </div>

          {/* ---- SONIDO ---- */}
          <div className="set-group">
            <div className="set-group-title">🔊 SONIDO</div>
            <div className="set-row">
              <span>Sonido de alarma</span>
              <select
                value={draft.alarmSound}
                onChange={(e) => {
                  const v = e.target.value as AlarmSound;
                  set('alarmSound', v);
                  sonarAlarma({ ...draft, alarmSound: v });
                }}
              >
                <option value="campana">Campana</option>
                <option value="pitido">Pitido</option>
                <option value="timbre">Timbre</option>
                <option value="ninguno">Ninguno</option>
              </select>
            </div>
            <div className="set-row slim">
              <input
                type="range"
                min={0}
                max={100}
                value={draft.alarmVolume}
                onChange={(e) => set('alarmVolume', num(e.target.value))}
                onMouseUp={() => sonarAlarma(draft)}
                aria-label="Volumen de la alarma"
              />
              <span className="range-val">{draft.alarmVolume}</span>
            </div>
            <div className="set-row slim right">
              <span>repetir</span>
              <input
                className="mini"
                type="number"
                min={1}
                max={10}
                value={draft.alarmRepeat}
                onChange={(e) => set('alarmRepeat', num(e.target.value))}
              />
            </div>

            <div className="set-row">
              <span>Sonido de enfoque</span>
              <select
                value={draft.focusSound}
                onChange={(e) => set('focusSound', e.target.value as FocusSound)}
              >
                <option value="ninguno">Ninguno</option>
                <option value="reloj">Reloj (tic-tac)</option>
                <option value="ruido">Ruido blanco</option>
              </select>
            </div>
            <div className="set-row slim">
              <input
                type="range"
                min={0}
                max={100}
                value={draft.focusVolume}
                onChange={(e) => set('focusVolume', num(e.target.value))}
                aria-label="Volumen del sonido de enfoque"
              />
              <span className="range-val">{draft.focusVolume}</span>
            </div>
          </div>

          {/* ---- TEMA ---- */}
          <div className="set-group">
            <div className="set-group-title">🎨 TEMA</div>
            <div className="set-row">
              <span>Temas de color</span>
              <div className="theme-dots">
                {TEMAS.map((t) => (
                  <button
                    key={t.nombre}
                    type="button"
                    className={`dot${draft.theme === t.nombre ? ' active' : ''}`}
                    style={{ background: t.color }}
                    aria-label={`Tema ${t.nombre}`}
                    onClick={() => {
                      set('theme', t.nombre);
                      // El tema se aplica al momento para poder verlo.
                      dispatch({ type: 'UPDATE_SETTINGS', patch: { theme: t.nombre } });
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="set-row">
              <span>Formato de hora</span>
              <select
                value={draft.hourFormat}
                onChange={(e) => set('hourFormat', e.target.value as HourFormat)}
              >
                <option value="24">24 horas</option>
                <option value="12">12 horas</option>
              </select>
            </div>
            <div className="set-row">
              <span>Modo oscuro al ejecutar</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={draft.darkRunning}
                  onChange={(e) => set('darkRunning', e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>
          </div>

          {/* ---- NOTIFICACIÓN ---- */}
          <div className="set-group">
            <div className="set-group-title">🔔 NOTIFICACIÓN</div>
            <div className="set-row">
              <span>Recordatorio</span>
              <div className="inline">
                <select
                  value={draft.reminderType}
                  onChange={(e) => set('reminderType', e.target.value as ReminderType)}
                >
                  <option value="ultimo">Último</option>
                  <option value="cada">Cada</option>
                </select>
                <input
                  className="mini"
                  type="number"
                  min={0}
                  max={60}
                  value={draft.reminderMin}
                  onChange={(e) => set('reminderMin', num(e.target.value))}
                />
                <span className="unit">min</span>
              </div>
            </div>
            <div className="set-row">
              <span>Notificaciones del navegador</span>
              <button type="button" className="ghost-btn" onClick={pedirNotificaciones}>
                Activar
              </button>
            </div>
          </div>

          {/* ---- BLOQUEO ---- */}
          <LockSettings draft={draft} setDraft={setDraft} set={set} num={num} showToast={showToast} />

          {/* ---- APPS BLOQUEADAS ---- */}
          <BlockedAppsSettings draft={draft} setDraft={setDraft} />

          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={restablecer}>
              Restablecer
            </button>
            <button type="button" className="primary" onClick={guardar}>
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LockSettings({
  draft,
  setDraft,
  set,
  num,
  showToast,
}: {
  draft: Settings;
  setDraft: React.Dispatch<React.SetStateAction<Settings>>;
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  num: (v: string) => number;
  showToast: (msg: string) => void;
}) {
  const [pinInput, setPinInput] = useState('');
  const [showPinField, setShowPinField] = useState<'new' | 'change' | null>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  const handlePinSubmit = () => {
    if (!/^\d{4}$/.test(pinInput)) {
      showToast('El PIN debe ser de 4 dígitos');
      return;
    }
    if (showPinField === 'new') {
      setDraft((d) => ({ ...d, lockEnabled: true, lockPin: pinInput }));
      showToast('Bloqueo activado');
    } else {
      set('lockPin', pinInput);
      showToast('PIN actualizado');
    }
    setPinInput('');
    setShowPinField(null);
  };

  return (
    <div className="set-group">
      <div className="set-group-title">🔒 BLOQUEO</div>
      <div className="set-row">
        <span>
          Bloqueo de app{' '}
          <i className="help" title="Bloquea la app con un PIN de 4 dígitos al cambiar de pestaña o tras inactividad">
            ?
          </i>
        </span>
        <label className="switch">
          <input
            type="checkbox"
            checked={draft.lockEnabled}
            onChange={(e) => {
              if (e.target.checked && !draft.lockPin) {
                setShowPinField('new');
                setPinInput('');
                setTimeout(() => pinRef.current?.focus(), 50);
              } else {
                set('lockEnabled', e.target.checked);
                if (!e.target.checked) setShowPinField(null);
              }
            }}
          />
          <span className="slider" />
        </label>
      </div>

      {showPinField && (
        <div className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {showPinField === 'new' ? 'Establece un PIN de 4 dígitos:' : 'Nuevo PIN de 4 dígitos:'}
          </span>
          <div className="inline">
            <input
              ref={pinRef}
              type="tel"
              inputMode="numeric"
              className="mini"
              maxLength={4}
              placeholder="····"
              value={pinInput}
              style={{ width: 70, textAlign: 'center', fontSize: 18, letterSpacing: 6 }}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePinSubmit(); }}
            />
            <button type="button" className="ghost-btn" onClick={handlePinSubmit}>
              Confirmar
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => { setShowPinField(null); setPinInput(''); }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {draft.lockEnabled && !showPinField && (
        <>
          <div className="set-row">
            <span>Cambiar PIN</span>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setShowPinField('change');
                setPinInput('');
                setTimeout(() => pinRef.current?.focus(), 50);
              }}
            >
              Cambiar
            </button>
          </div>
          <div className="set-row">
            <span>Bloquear tras inactividad</span>
            <div className="inline">
              <input
                className="mini"
                type="number"
                min={1}
                max={60}
                value={draft.lockTimeout}
                onChange={(e) => set('lockTimeout', Math.max(1, Math.min(60, num(e.target.value) || 1)))}
              />
              <span className="unit">min</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const SUGGESTED_APPS = ['TikTok', 'Instagram', 'Facebook', 'Twitter / X', 'YouTube', 'Snapchat', 'Reddit', 'WhatsApp'];

function BlockedAppsSettings({
  draft,
  setDraft,
}: {
  draft: Settings;
  setDraft: React.Dispatch<React.SetStateAction<Settings>>;
}) {
  const [newApp, setNewApp] = useState('');

  const addApp = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (draft.blockedApps.some((a) => a.toLowerCase() === trimmed.toLowerCase())) return;
    setDraft((d) => ({ ...d, blockedApps: [...d.blockedApps, trimmed] }));
    setNewApp('');
  };

  const removeApp = (app: string) => {
    setDraft((d) => ({ ...d, blockedApps: d.blockedApps.filter((a) => a !== app) }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    addApp(newApp);
  };

  const suggestions = SUGGESTED_APPS.filter(
    (s) => !draft.blockedApps.some((a) => a.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="set-group">
      <div className="set-group-title">📵 MODO ENFOQUE</div>
      <p className="set-hint">
        Estas apps se mostrarán como recordatorio durante tus sesiones Pomodoro para que las evites.
      </p>

      {draft.blockedApps.length > 0 && (
        <div className="blocked-apps-list">
          {draft.blockedApps.map((app) => (
            <div key={app} className="blocked-app-chip">
              <span>{app}</span>
              <button type="button" className="blocked-app-remove" onClick={() => removeApp(app)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="blocked-app-add" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nombre de la app..."
          value={newApp}
          onChange={(e) => setNewApp(e.target.value)}
          className="blocked-app-input"
        />
        <button type="submit" className="ghost-btn">
          Agregar
        </button>
      </form>

      {suggestions.length > 0 && (
        <div className="blocked-app-suggestions">
          <span className="set-hint">Sugerencias:</span>
          <div className="blocked-app-suggestion-list">
            {suggestions.map((s) => (
              <button key={s} type="button" className="blocked-app-suggestion" onClick={() => addApp(s)}>
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
