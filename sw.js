/**

- sw.js - Service Worker
- HTMLファイルとmanifestをキャッシュし、オフラインでもアプリを起動可能にする。
- 論文データ自体はIndexedDB（アプリ側）で管理する。
  */

const CACHE_NAME = ‘paper-reader-v36’;
const ASSETS_TO_CACHE = [
‘./’,
‘./index.html’,
‘./manifest.json’,
];

// インストール: アセットをキャッシュ
self.addEventListener(‘install’, event => {
event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => cache.addAll(ASSETS_TO_CACHE))
.catch(err => console.log(‘Cache addAll failed:’, err))
);
self.skipWaiting();
});

// アクティベーション: 古いキャッシュを削除
self.addEventListener(‘activate’, event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(
keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
)
)
);
self.clients.claim();
});

// フェッチ: GAS APIはスルー、それ以外はキャッシュファースト
self.addEventListener(‘fetch’, event => {
const url = new URL(event.request.url);

// GAS APIへのリクエストはService Workerを介さない
if (url.hostname.includes(‘script.google.com’) ||
url.hostname.includes(‘googleapis.com’) ||
url.hostname.includes(‘googleusercontent.com’)) {
return;
}

// GET以外はスルー
if (event.request.method !== ‘GET’) {
return;
}

// chrome-extension等の特殊スキームはスルー
if (!url.protocol.startsWith(‘http’)) {
return;
}

event.respondWith(
caches.match(event.request)
.then(cached => {
if (cached) {
// キャッシュヒット: キャッシュを返しつつ、バックグラウンドで更新
caches.open(CACHE_NAME).then(cache => {
fetch(event.request)
.then(response => {
if (response && response.ok) {
cache.put(event.request, response);
}
})
.catch(() => {});
});
return cached;
}

```
    // キャッシュミス: ネットワークから取得
    return fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // オフラインかつキャッシュなし
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', {
          status: 503,
          statusText: 'Offline',
        });
      });
  })
  .catch(() => {
    // caches.match自体が失敗した場合のフォールバック
    return fetch(event.request).catch(() => {
      return new Response('', {
        status: 503,
        statusText: 'Offline',
      });
    });
  })
```

);
});
