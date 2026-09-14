/* ============================================================
 * VU Empire — Session Keep-Alive Service Worker (public/sw.js)
 * ------------------------------------------------------------
 * Every 15 minutes this worker triggers a session refresh by:
 *   1. Messaging any open page(s) to call PATCH /api/auth/refresh-token
 *      from the page context (preferred: browsers correctly persist
 *      the new httpOnly token cookie for page-initiated requests —
 *      Set-Cookie on SW-initiated fetch() is ignored in some browsers).
 *   2. Falling back to fetching the endpoint directly from the SW.
 * ============================================================ */

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_ENDPOINT = '/api/auth/refresh-token';
const REFRESH_MESSAGE = 'REFRESH_SESSION';

let refreshTimerId = null;

/* -------------------- Timer -------------------- */

function startRefreshTimer() {
  stopRefreshTimer();
  refreshTimerId = setInterval(() => refreshAllClients(), REFRESH_INTERVAL_MS);
  // Also use the Background Periodic Sync API when available (works even
  // when the worker was stopped between events). Requires an installed PWA
  // and granted permission in most browsers; harmless where unsupported.
  if ('periodicSync' in self.registration) {
    self.registration.periodicSync
      .register('session-refresh', {
        minInterval: REFRESH_INTERVAL_MS
      })
      .catch(() => { /* not granted / not installed — interval above still runs */ });
  }
  console.log('[SW] Session refresh timer started (every 15 min)');
}

function stopRefreshTimer() {
  if (refreshTimerId) {
    clearInterval(refreshTimerId);
    refreshTimerId = null;
  }
}

/* -------------------- Refresh logic -------------------- */

// Direct fetch from the SW. NOTE: some browsers ignore Set-Cookie on
// SW-initiated responses, so the client-message path is preferred.
async function refreshFromWorker() {
  try {
    const res = await fetch(REFRESH_ENDPOINT, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (res.status === 401) {
      // No valid/expired-refreshable token — user is logged out. Stop the timer.
      stopRefreshTimer();
      console.log('[SW] Refresh returned 401 — user not logged in, timer stopped.');
      return false;
    }
    console.log('[SW] Refresh from worker status:', res.status);
    return res.ok;
  } catch (err) {
    console.warn('[SW] Refresh fetch failed (offline?):', err.message);
    return false;
  }
}

async function refreshAllClients() {
  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  if (clientList.length === 0) {
    // No open tabs — nothing to keep alive.
    console.log('[SW] No open clients; skipping refresh.');
    return;
  }

  // Preferred: let an open page perform the fetch so the new cookie persists.
  clientList.forEach((client) => client.postMessage({ type: REFRESH_MESSAGE }));
  console.log(`[SW] Sent ${REFRESH_MESSAGE} to ${clientList.length} client(s).`);

  // Fallback: also try from the worker itself.
  await refreshFromWorker();
}

/* -------------------- Lifecycle -------------------- */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    startRefreshTimer();
  })());
});

// Handle browsers restarting the worker without re-firing activate.
if (self.registration.active) {
  startRefreshTimer();
}

// Periodic sync trigger (when supported & granted).
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'session-refresh') {
    event.waitUntil(refreshAllClients());
  }
});

/* -------------------- Client communication -------------------- */

// Pages can request an immediate refresh, e.g. after login:
//   navigator.serviceWorker.controller.postMessage({ type: 'REFRESH_NOW' })
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REFRESH_NOW') {
    refreshAllClients();
  }
});
