/* イマログ service worker（実ファイル版）
   システム通知の表示・タップ処理を担当する。
   Pushサーバーは使わないローカル通知方式のため `push` ハンドラは持たない。
   ブラウザがバックグラウンドで動いている間のみ通知可能。 */

const CACHE = 'imalog-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  // 「継続する」は閉じるだけ（次の確認はページ側タイマーが再スケジュールする）
  if (e.action === 'continue') return;
  const url = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil(
    (async () => {
      const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of list) {
        if ('focus' in c) {
          try { await c.focus(); } catch (_) {}
          return;
        }
      }
      if (clients.openWindow) await clients.openWindow(url);
    })()
  );
});

self.addEventListener('notificationclose', () => {});
