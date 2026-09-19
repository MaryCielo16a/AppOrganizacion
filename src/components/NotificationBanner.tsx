import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'notif-banner-dismissed';

export function NotificationBanner() {
  const [visible, setVisible] = useState(false);
  const [permState, setPermState] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermState('unsupported');
      return;
    }
    setPermState(Notification.permission);
    if (Notification.permission === 'default') {
      try {
        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (!dismissed) setVisible(true);
      } catch {
        setVisible(true);
      }
    }
  }, []);

  const activar = useCallback(() => {
    void Notification.requestPermission().then((p) => {
      setPermState(p);
      setVisible(false);
      if (p === 'granted') {
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ok */ }
      }
    });
  }, []);

  const cerrar = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ok */ }
  }, []);

  if (!visible || permState !== 'default') return null;

  return (
    <div className="notif-banner">
      <span className="notif-banner-icon">🔔</span>
      <span className="notif-banner-text">
        Activa las notificaciones para recibir alertas de tus tareas
      </span>
      <button type="button" className="notif-banner-btn" onClick={activar}>
        Activar
      </button>
      <button
        type="button"
        className="notif-banner-close"
        onClick={cerrar}
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}
