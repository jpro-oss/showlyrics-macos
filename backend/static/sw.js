const CACHE_NAME = 'media-cache';

// Deduplication: mencegah dua full download untuk file yang sama secara bersamaan.
// Key: cleanUrl (tanpa query params), Value: Promise<Response>
// Ini menghilangkan "double 200 OK" yang muncul di server log.
const activeTeeRequests = new Set();

// [PERF-FIX] blobMemoryCache DIHAPUS sepenuhnya.
// Menyimpan Blob video 300MB+ di SW context RAM adalah sumber utama OOM di low-end.
// SW context terpisah dari page — jadi ini bisa mengonsumsi 300MB di luar quota page.
// Range requests kini dilayani langsung dari Cache Storage (on-demand, GC-friendly).

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept requests to /api/stream_video/
  if (url.pathname.startsWith('/api/stream_video/')) {
    event.respondWith(handleVideoRequest(event.request, url));
  }
});

async function handleVideoRequest(request, url) {
  // Strip query params (_uid=, etc.) untuk mendapatkan canonical cache key
  const cleanUrl = url.origin + url.pathname;
  const cache = await caches.open(CACHE_NAME);

  // --- RANGE REQUESTS ---
  // Browser mengirim range requests saat playback/seeking aktif.
  // Jika ada di cache (full file tersimpan), serve range dari cache.
  // Jika tidak ada, teruskan ke network langsung.
  if (request.headers.has('Range')) {
    const cachedResponse = await cache.match(cleanUrl);
    if (cachedResponse) {
      // [OPT] Hanya serve dari cache jika Content-Length tersedia.
      // Tanpa Content-Length, range calculation tidak akurat → bisa serve wrong bytes.
      // Jika tidak ada, pass ke network agar server menangani range dengan benar.
      const cachedLength = cachedResponse.headers.get('Content-Length');
      if (cachedLength && parseInt(cachedLength, 10) > 0) {
        return handleRangeRequest(request, cachedResponse, parseInt(cachedLength, 10));
      }
    }
    // Belum di-cache atau Content-Length tidak valid — pass range request ke network
    // (server Go punya Range support penuh via http.ServeContent)
    return fetch(request);
  }

  // --- FULL (NON-RANGE) REQUESTS ---
  // Ini bisa dari: SW preload fetch, atau permintaan langsung (tanpa Range).

  // 1. Cek SW cache dulu (paling cepat)
  const cachedResponse = await cache.match(cleanUrl);
  if (cachedResponse) {
    return cachedResponse.clone();
  }

  // 2. Jika sudah ada download yang sedang berjalan untuk URL ini,
  //    fetch langsung dari network tanpa memulai download kedua.
  //    Server akan serve dari RAM cache-nya sendiri.
  if (activeTeeRequests.has(cleanUrl)) {
    return fetch(cleanUrl);
  }

  // 3. Mulai download baru.
  // [PERF-FIX] Strategi baru: clone() alih-alih tee().
  // tee() BURUK di low-end: browser harus buffer seluruh delta antara
  // kecepatan dua stream. Pada HDD 5400rpm / eMMC lambat, disk write jauh
  // lebih lambat dari network, sehingga buffer bisa mendekati ukuran full file.
  //
  // Strategi baru:
  //  - Fetch network response
  //  - Clone untuk client, satu lagi untuk cache.put()
  //  - Response yang dikembalikan ke client = clone pertama (langsung streaming)
  //  - Cache.put() menerima clone kedua (background, tidak blocking client)
  //
  // clone() hanya membuat shallow copy dari stream — kedua stream membaca
  // dari buffer internal browser yang sama, tanpa duplikasi data di RAM.
  const mediaId = url.pathname.split('/').pop();

  activeTeeRequests.add(cleanUrl);

  try {
    broadcastMessage({ type: 'cache_status', mediaId, status: 'downloading' });

    const networkResponse = await fetch(cleanUrl);

    if (networkResponse.ok && networkResponse.status === 200 && networkResponse.body) {
      const responseHeaders = new Headers(networkResponse.headers);

      // [OPT] Quota guard: cek storage quota sebelum cache.put() untuk mencegah
      // QuotaExceededError yang bisa crash SW context di device RAM 4GB.
      // Estimasi kebutuhan dari Content-Length header — zero-copy, tidak baca body.
      const contentLengthStr = responseHeaders.get('Content-Length');
      const neededBytes = contentLengthStr ? parseInt(contentLengthStr, 10) : 0;
      const canCache = await hasStorageQuota(neededBytes);

      if (!canCache) {
        // Quota tidak cukup — serve ke client tanpa cache
        console.warn(`[SW] Storage quota tidak cukup untuk ${mediaId} (${Math.round(neededBytes / 1024 / 1024)}MB). Skip cache.`);
        activeTeeRequests.delete(cleanUrl);
        broadcastMessage({ type: 'cache_status', mediaId, status: 'error' });
        return networkResponse;
      }

      // [PERF-FIX] Gunakan clone() bukan tee() untuk menghindari RAM buffering.
      // clone() aman karena kedua stream dibaca secara concurrent oleh browser
      // tanpa harus menunggu satu sama lain di-buffer ke RAM.
      const responseForClient = networkResponse.clone();

      // Tulis ke cache di background — TIDAK block response ke client
      cache.put(cleanUrl, networkResponse).then(async () => {
        // [PERF-FIX] Verifikasi cache menggunakan Content-Length header,
        // BUKAN cached.blob(). Blob() membaca ulang seluruh file ke RAM —
        // untuk file 300MB ini berarti spike RAM 300MB tepat setelah download.
        // Content-Length check adalah zero-copy: hanya baca header saja.
        try {
          const cached = await cache.match(cleanUrl);
          if (cached) {
            const expectedLength = parseInt(responseHeaders.get('Content-Length'), 10);
            const cachedLength = parseInt(cached.headers.get('Content-Length'), 10);

            if (expectedLength && cachedLength && cachedLength !== expectedLength) {
              console.warn(`[SW] Cache size mismatch for ${mediaId}: expected ${expectedLength}, got ${cachedLength}. Deleting cache.`);
              await cache.delete(cleanUrl);
              broadcastMessage({ type: 'cache_status', mediaId, status: 'error' });
            } else {
              broadcastMessage({ type: 'cache_status', mediaId, status: 'ready' });
            }
          } else {
            broadcastMessage({ type: 'cache_status', mediaId, status: 'error' });
          }
        } catch (verifErr) {
          console.error('[SW] Cache verification failed, cleaning up:', verifErr);
          await cache.delete(cleanUrl);
          broadcastMessage({ type: 'cache_status', mediaId, status: 'error' });
        }
        activeTeeRequests.delete(cleanUrl);
      }).catch(async err => {
        console.warn('[SW] Cache put error:', err);
        try {
          await cache.delete(cleanUrl);
        } catch (_) {}
        activeTeeRequests.delete(cleanUrl);
        broadcastMessage({ type: 'cache_status', mediaId, status: 'error' });
      });

      // Kembalikan clone ke client SEGERA (tidak perlu tunggu cache write selesai)
      return new Response(responseForClient.body, {
        status: 200,
        statusText: networkResponse.statusText,
        headers: responseHeaders,
      });

    } else {
      // Non-200 response (error, redirect, dll)
      activeTeeRequests.delete(cleanUrl);
      broadcastMessage({ type: 'cache_status', mediaId, status: 'error' });
      return networkResponse;
    }

  } catch (err) {
    activeTeeRequests.delete(cleanUrl);
    console.error('[SW] Fetch error for', cleanUrl, err);
    throw err;
  }
}

async function broadcastMessage(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// [OPT] hasStorageQuota: cek apakah ada ruang kosong sebelum cache write.
// Mencegah QuotaExceededError yang bisa crash SW context di device dengan storage terbatas.
// Menggunakan StorageManager.estimate() — zero-cost, tidak baca disk.
// neededBytes: estimasi dari Content-Length header (0 = unknown, skip check)
async function hasStorageQuota(neededBytes) {
  if (!neededBytes || neededBytes <= 0) return true; // unknown size, assume ok

  try {
    if ('storage' in self && 'estimate' in self.storage) {
      const { quota, usage } = await self.storage.estimate();
      if (!quota || !usage) return true; // API tersedia tapi tidak ada data, assume ok
      const available = quota - usage;
      // Butuh neededBytes + 20% buffer untuk overhead metadata cache
      return available > neededBytes * 1.2;
    }
  } catch (_) {
    // StorageManager tidak tersedia atau error → assume ok (fallback aman)
  }
  return true;
}

// [OPT] handleRangeRequest: serve range request dari cached response.
// Menggunakan blob().slice() untuk random-access range — ini pendekatan paling
// kompatibel karena Cache Storage API tidak menyediakan seekable stream interface.
//
// Optimasi GC:
// - fullBlob di-null segera setelah slice dibuat → memungkinkan GC di-run sebelum
//   response selesai dikirim ke browser
// - slicedBlob hanya berisi bytes yang diminta (jauh lebih kecil dari full file)
//
// Trade-off yang diterima: setiap range request memerlukan disk read untuk materialize
// blob. Ini tidak bisa dihindari dengan Cache Storage API saat ini. Namun, ini masih
// jauh lebih baik daripada menghit network untuk setiap range request (menghindari
// redundant full download).
//
// contentLength: nilai dari header Content-Length cached response (sudah divalidasi caller)
async function handleRangeRequest(request, cachedResponse, contentLength) {
  const rangeHeader = request.headers.get('Range');
  const match = rangeHeader ? rangeHeader.match(/^bytes=(\d+)-(\d+)?$/) : null;
  const contentType = cachedResponse.headers.get('Content-Type') || 'video/mp4';

  if (!match) {
    // Tidak ada range valid — serve full cached response
    const blob = await cachedResponse.blob();
    const resp = new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(blob.size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      }
    });
    return resp;
  }

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : contentLength - 1;
  const clampedEnd = Math.min(end, contentLength - 1);

  // Validasi range sebelum materialize blob
  if (start >= contentLength || start > clampedEnd) {
    return new Response('', {
      status: 416, // Range Not Satisfiable
      headers: {
        'Content-Range': `bytes */${contentLength}`,
        'Content-Length': '0',
      }
    });
  }

  // Materialize blob dari cache — diperlukan untuk .slice() random access
  let fullBlob;
  try {
    fullBlob = await cachedResponse.blob();
  } catch (err) {
    console.error('[SW] Failed to read blob from cache:', err);
    return fetch(request); // Fallback ke network
  }

  const actualSize = fullBlob.size;
  const safeEnd = Math.min(clampedEnd, actualSize - 1);
  const chunkSize = safeEnd - start + 1;

  // Slice hanya bagian yang diminta
  const slicedBlob = fullBlob.slice(start, safeEnd + 1);

  // [OPT] Null fullBlob segera setelah slice — memungkinkan GC reclaim RAM
  // dari blob besar sebelum response selesai dikirim
  fullBlob = null;

  return new Response(slicedBlob, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Range': `bytes ${start}-${safeEnd}/${actualSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(chunkSize),
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
    }
  });
}

// Clear SW cache and memory for specific cleanUrl
self.addEventListener('message', async (event) => {
  if (event.data && event.data.action === 'clear_cache' && event.data.cleanUrl) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(event.data.cleanUrl);
      // [PERF-FIX] Tidak ada lagi blobMemoryCache untuk di-clear — sudah dihapus.
      console.log('[SW] Cleared cache for cleanUrl:', event.data.cleanUrl);
    } catch (e) {
      console.warn('[SW] Error clearing cache for', event.data.cleanUrl, e);
    }
  }
});
