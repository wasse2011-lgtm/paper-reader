/**
 * sw.js - Service Worker
 * HTMLファイルとmanifestをキャッシュし、オフラインでもアプリを起動可能にする。
 * 論文データ自体はIndexedDB（アプリ側）で管理する。
 */

const CACHE_NAME = 'paper-reader-v1';
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
];

// インストール: アセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// アクティベーション: 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// フェッチ: キャッシュファースト（アセットのみ）、API呼び出しはネットワーク
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // GAS APIへのリクエストはネットワークを使う
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // バックグラウンドで最新版を取得してキャッシュ更新
        fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request);
    })
  );
});
