import type { Settings } from '../types';

/* Sonidos sintetizados con Web Audio: sin archivos externos que descargar. */

type WindowConAudio = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const w = window as WindowConAudio;
    const AC = window.AudioContext ?? w.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tono(freq: number, dur: number, vol: number, tipo: OscillatorType = 'sine'): void {
  const ac = getAudioContext();
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = tipo;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), ac.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.connect(g);
  g.connect(ac.destination);
  o.start();
  o.stop(ac.currentTime + dur + 0.05);
}

export function sonarAlarma(ajustes: Settings): void {
  if (ajustes.alarmSound === 'ninguno') return;
  const vol = (ajustes.alarmVolume / 100) * 0.35;
  const reps = Math.max(1, ajustes.alarmRepeat);
  for (let r = 0; r < reps; r++) {
    window.setTimeout(() => {
      if (ajustes.alarmSound === 'campana') {
        tono(880, 1.2, vol, 'sine');
        tono(1320, 1.0, vol * 0.6, 'sine');
      } else if (ajustes.alarmSound === 'pitido') {
        tono(1000, 0.18, vol, 'square');
        window.setTimeout(() => tono(1000, 0.18, vol, 'square'), 250);
      } else {
        tono(660, 0.4, vol, 'triangle');
        window.setTimeout(() => tono(520, 0.5, vol, 'triangle'), 380);
      }
    }, r * 1500);
  }
}

/** Handle del sonido de enfoque, para poder pararlo al pausar. */
export interface FocusHandle {
  stop: () => void;
}

export function iniciarSonidoFoco(ajustes: Settings): FocusHandle | null {
  if (ajustes.focusSound === 'ninguno') return null;
  const ac = getAudioContext();
  if (!ac) return null;
  const vol = (ajustes.focusVolume / 100) * 0.15;

  if (ajustes.focusSound === 'reloj') {
    const id = window.setInterval(() => tono(1400, 0.03, vol, 'square'), 1000);
    return { stop: () => window.clearInterval(id) };
  }

  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const datos = buf.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = (Math.random() * 2 - 1) * 0.3;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(g);
  g.connect(ac.destination);
  src.start();
  return {
    stop: () => {
      try {
        src.stop();
      } catch {
        /* ya estaba parado */
      }
    },
  };
}

export function notificar(titulo: string, cuerpo: string): void {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      void navigator.serviceWorker.ready.then((reg) =>
        reg.showNotification(titulo, {
          body: cuerpo,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: titulo,
          renotify: true,
        } as NotificationOptions),
      );
    } else {
      new Notification(titulo, { body: cuerpo });
    }
  } catch {
    /* algunos contextos (file://) bloquean las notificaciones */
  }
}
