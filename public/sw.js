const CACHE_NAME = 'organizador-v3';

// --- Scheduled notifications ---
const pending = new Map(); // id → timeoutId

function scheduleNotification(id, title, body, triggerAt) {
  cancelNotification(id);
  const delay = triggerAt - Date.now();
  if (delay <= 0) {
    showNotif(title, body);
    return;
  }
  const tid = setTimeout(() => {
    pending.delete(id);
    showNotif(title, body);
  }, delay);
  pending.set(id, tid);
}

function cancelNotification(id) {
  if (pending.has(id)) {
    clearTimeout(pending.get(id));
    pending.delete(id);
  }
}

function showNotif(title, body) {
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: title,
    renotify: true,
  });
}

self.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg || !msg.type) return;

  if (msg.type === 'SCHEDULE') {
    scheduleNotification(msg.id, msg.title, msg.body, msg.triggerAt);
  } else if (msg.type === 'CANCEL') {
    cancelNotification(msg.id);
  } else if (msg.type === 'CANCEL_ALL') {
    for (const [id, tid] of pending) {
      clearTimeout(tid);
    }
    pending.clear();
  } else if (msg.type === 'SCHEDULE_BATCH') {
    // Cancel all existing, then schedule new batch
    for (const [id, tid] of pending) {
      clearTimeout(tid);
    }
    pending.clear();
    for (const n of msg.notifications) {
      scheduleNotification(n.id, n.title, n.body, n.triggerAt);
    }
  }
});

// Click on notification opens the app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

// --- Cache ---
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isNavigate = e.request.mode === 'navigate';
  const isAsset = url.pathname.startsWith('/assets/');

  if (isNavigate) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  if (isAsset) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
