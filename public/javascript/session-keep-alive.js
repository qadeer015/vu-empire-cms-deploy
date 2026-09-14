/* ============================================================
 * VU Empire — Session Keep-Alive client (public/javascript/session-keep-alive.js)
 * ------------------------------------------------------------
 * Registers the service worker (/sw.js) and, whenever the worker
 * asks (every 15 minutes), calls PATCH /api/auth/refresh-token from
 * the page context so the refreshed httpOnly `token` cookie is
 * correctly persisted by the browser.
 * ============================================================ */

(function () {
  'use strict';

  var REFRESH_ENDPOINT = '/api/auth/refresh-token';
  var REFRESH_MESSAGE = 'REFRESH_SESSION';
  var FALLBACK_INTERVAL_MS = 15 * 60 * 1000; // used if SW is unavailable

  var refreshing = false;

  function refreshToken() {
    if (refreshing) return;
    refreshing = true;
    fetch(REFRESH_ENDPOINT, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    })
      .then(function (res) {
        if (res.status === 401) {
          // Not logged in (or token can no longer be refreshed) — stop trying.
          stopFallbackTimer();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (data && data.message) {
          console.log('[keep-alive] Session refreshed:', data.message);
        }
      })
      .catch(function () { /* offline — retry on next tick */ })
      .finally(function () { refreshing = false; });
  }

  /* -------------------- Fallback timer (no SW support) -------------------- */

  var fallbackTimerId = null;

  function startFallbackTimer() {
    if (fallbackTimerId) return;
    fallbackTimerId = setInterval(refreshToken, FALLBACK_INTERVAL_MS);
  }

  function stopFallbackTimer() {
    if (fallbackTimerId) {
      clearInterval(fallbackTimerId);
      fallbackTimerId = null;
    }
  }

  /* -------------------- Service worker registration -------------------- */

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then(function (reg) {
        // Listen for the worker's 15-minute tick.
        navigator.serviceWorker.addEventListener('message', function (event) {
          if (event.data && event.data.type === REFRESH_MESSAGE) {
            refreshToken();
          }
        });
        console.log('[keep-alive] Service worker registered.');
      })
      .catch(function (err) {
        console.warn('[keep-alive] SW registration failed, using page timer.', err);
        startFallbackTimer();
      });
  } else {
    // No SW support — keep the session alive from the page itself.
    startFallbackTimer();
  }

  // Expose for manual triggers (e.g. right after login):
  //   window.SessionKeepAlive.refresh()
  window.SessionKeepAlive = { refresh: refreshToken };
})();
