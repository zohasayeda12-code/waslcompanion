// Wasl reminders service worker
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || "Wasl reminder";
  const body = data.body || "Time for your niyyah.";
  const url = data.url || "/home";
  const tag = data.tag || "wasl-reminder";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag,
      data: { url },
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const target = new URL(url, self.location.origin);
      // Prefer an already-open app window: focus it first, then navigate if needed.
      for (const c of all) {
        try {
          const cu = new URL(c.url);
          if (cu.origin !== target.origin) continue;
          try { await c.focus(); } catch (_) {}
          if (cu.pathname + cu.search !== target.pathname + target.search) {
            try { await c.navigate(target.href); } catch (_) {}
          }
          return;
        } catch (_) {}
      }
      return self.clients.openWindow(target.href);
    })()
  );
});
