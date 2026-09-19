import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { app, db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export async function initFCM(uid: string): Promise<string | null> {
  try {
    if (!VAPID_KEY) return null;
    if (!('Notification' in window) || Notification.permission !== 'granted') return null;
    if (!('serviceWorker' in navigator)) return null;

    const messaging = getMessaging(app);
    const reg = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    if (token) {
      await setDoc(doc(db, 'usuarios', uid, 'config', 'fcm'), {
        token,
        updatedAt: Date.now(),
      });
    }

    return token;
  } catch (err) {
    console.warn('[FCM] init failed:', err);
    return null;
  }
}
