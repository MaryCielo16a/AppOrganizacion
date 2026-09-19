const CACHE_NAME = 'organizador-v3';

// --- IndexedDB helpers for persistent notifications ---
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('notif-store', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('scheduled')) {
        db.createObjectStore('scheduled', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveAllToDB(notifications) {
  try {
    const db = await openDB();
    const tx = db.transaction('scheduled', 'readwrite');
    const store = tx.objectStore('scheduled');
    store.clear();
    for (const n of notifications) {
      store.put(n);
    }
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch { /* IDB may not be available */ }
}

async function removeFromDB(id) {
  try {
    const db = await openDB();
    const tx = db.transaction('scheduled', 'readwrite');
    tx.objectStore('scheduled').delete(id);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch { /* ok */ }
}

async function loadAllFromDB() {
  try {
    const db = await openDB();
    const tx = db.transaction('scheduled', 'readonly');
    const store = tx.objectStore('scheduled');
    const req = store.getAll();
    const result = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    return result;
  } catch {
    return [];
  }
}

// --- Scheduled notifications ---
const pending = new Map(); // id → timeoutId

function scheduleNotification(id, title, body, triggerAt) {
  cancelNotification(id);
  const delay = triggerAt - Date.now();
  if (delay <= 0) {
    removeFromDB(id);
    showNotif(title, body);
    return;
  }
  const tid = setTimeout(() => {
    pending.delete(id);
    removeFromDB(id);
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

async function restoreFromDB() {
  const items = await loadAllFromDB();
  const now = Date.now();
  for (const n of items) {
    if (n.triggerAt <= now) {
      removeFromDB(n.id);
      showNotif(n.title, n.body);
    } else {
      scheduleNotification(n.id, n.title, n.body, n.triggerAt);
    }
  }
}

self.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg || !msg.type) return;

  if (msg.type === 'SCHEDULE') {
    scheduleNotification(msg.id, msg.title, msg.body, msg.triggerAt);
  } else if (msg.type === 'CANCEL') {
    cancelNotification(msg.id);
    removeFromDB(msg.id);
  } else if (msg.type === 'CANCEL_ALL') {
    for (const [, tid] of pending) {
      clearTimeout(tid);
    }
    pending.clear();
    saveAllToDB([]);
  } else if (msg.type === 'SCHEDULE_BATCH') {
    for (const [, tid] of pending) {
      clearTimeout(tid);
    }
    pending.clear();
    const notifications = msg.notifications || [];
    saveAllToDB(notifications);
    for (const n of notifications) {
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
    ).then(() => restoreFromDB())
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
