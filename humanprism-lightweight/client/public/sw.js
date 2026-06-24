/* 휴먼프리즘 서비스워커 — 설치 가능 조건 충족 + 안전한 오프라인 폴백.
   주의: 동적 앱 셸/번들은 캐싱하지 않는다(Vite 해시 파일과 충돌·구버전 고착 방지).
   네트워크 우선 전략으로, 네비게이션 실패 시에만 최소 오프라인 안내를 제공한다. */
const CACHE = 'human-prism-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icon-192.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 페이지 네비게이션: 네트워크 우선, 실패 시 오프라인 안내
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 정적 아이콘/매니페스트: 캐시 우선(빠른 표시)
  const url = new URL(req.url);
  if (PRECACHE.some((p) => url.pathname === p)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});
