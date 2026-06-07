const CACHE_NAME = 'media-cache';

// Deduplication: mencegah dua full download untuk file yang sama secara bersamaan.
// Key: cleanUrl (tanpa query params), Value: Promise<Response>
// Ini menghilangkan "double 200 OK" yang muncul di server log.
const activeTeeRequests = new Set();

// In-memory cache for deserialized Blobs to prevent high CPU / disk I/O on loop range requests.
const maxMemoryBlobs = 3;
const blobMemoryCache = new Map(); // cleanUrl -> Blob
const blobMemoryKeys = [];

function keepBlobInCache(url, blob) {
  if (blobMemoryCache.has(url)) {
    // move to MRU
    const idx = blobMemoryKeys.indexOf(url);
    if (idx > -1) blobMemoryKeys.splice(idx, 1);
    blobMemoryKeys.push(url);
    return;
  }
  if (blobMemoryKeys.length >= maxMemoryBlobs) {
    const oldest = blobMemoryKeys.shift();
    blobMemoryCache.delete(oldest);
  }
  blobMemoryCache.set(url, blob);
  blobMemoryKeys.push(url);
}

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
      return handleRangeRequest(request, cachedResponse, cleanUrl);
    }
    // Belum di-cache — pass range request ke network (server punya RAM cache)
    return fetch(request);
  }

  // --- FULL (NON-RANGE) REQUESTS ---
  // Ini bisa dari: SW preload fetch, atau permintaan langsung (tanpa Range).

  // 1. Cek SW cache dulu (paling cepat)
  const cachedResponse = await cache.match(cleanUrl);
  if (cachedResponse) {
    return cachedResponse.clone();
  }

  // 2. Jika sudah ada tee() yang sedang berjalan untuk URL ini,
  //    jangan mulai download kedua — cukup fetch langsung dari network.
  //    (Tidak bisa clone tee'd stream yang sedang dikonsumsi)
  if (activeTeeRequests.has(cleanUrl)) {
    // Fetch langsung dari network — server akan serve dari RAM cache
    return fetch(cleanUrl);
  }

  // 3. Mulai download baru dengan tee() untuk stream ke client + tulis ke cache sekaligus
  const mediaId = url.pathname.split('/').pop();

  activeTeeRequests.add(cleanUrl);

  try {
    broadcastMessage({ type: 'cache_status', mediaId, status: 'downloading' });

    const networkResponse = await fetch(cleanUrl);

    if (networkResponse.ok && networkResponse.status === 200 && networkResponse.body) {
      // tee() split stream menjadi dua cabang:
      // - streamForClient: dikembalikan langsung ke peminta (video bisa mulai play segera)
      // - streamForCache: dibaca oleh Cache Storage API untuk disimpan (background)
      const [streamForClient, streamForCache] = networkResponse.body.tee();

      const responseHeaders = new Headers(networkResponse.headers);

      // Tulis ke cache di background — TIDAK block response ke client
      cache.put(cleanUrl, new Response(streamForCache, {
        status: 200,
        statusText: networkResponse.statusText,
        headers: responseHeaders,
      })).then(async () => {
        // Verifikasi hasil cache untuk menghindari korupsi data / potongan file
        const cached = await cache.match(cleanUrl);
        if (cached) {
          try {
            const blob = await cached.blob();
            const expectedLength = parseInt(responseHeaders.get('Content-Length'), 10);
            if (expectedLength && blob.size !== expectedLength) {
              console.warn(`[SW] Cache size mismatch for ${mediaId}: expected ${expectedLength}, got ${blob.size}. Deleting cache.`);
              await cache.delete(cleanUrl);
              blobMemoryCache.delete(cleanUrl);
              const idx = blobMemoryKeys.indexOf(cleanUrl);
              if (idx > -1) blobMemoryKeys.splice(idx, 1);
              broadcastMessage({ type: 'cache_status', mediaId, status: 'error' });
            } else {
              // Simpan Blob reference di memori agar cepat
              keepBlobInCache(cleanUrl, blob);
              broadcastMessage({ type: 'cache_status', mediaId, status: 'ready' });
            }
          } catch (verifErr) {
            console.error('[SW] Cache verification failed, cleaning up:', verifErr);
            await cache.delete(cleanUrl);
            broadcastMessage({ type: 'cache_status', mediaId, status: 'error' });
          }
        } else {
          broadcastMessage({ type: 'cache_status', mediaId, status: 'error' });
        }
        activeTeeRequests.delete(cleanUrl);
      }).catch(async err => {
        console.warn('[SW] Cache put error:', err);
        try {
          await cache.delete(cleanUrl);
          blobMemoryCache.delete(cleanUrl);
          const idx = blobMemoryKeys.indexOf(cleanUrl);
          if (idx > -1) blobMemoryKeys.splice(idx, 1);
        } catch (_) {}
        activeTeeRequests.delete(cleanUrl);
        broadcastMessage({ type: 'cache_status', mediaId, status: 'error' });
      });

      // Kembalikan stream ke client SEGERA (tidak perlu tunggu cache write selesai)
      return new Response(streamForClient, {
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

async function handleRangeRequest(request, cachedResponse, cleanUrl) {
  let blob = blobMemoryCache.get(cleanUrl);
  if (!blob) {
    try {
      blob = await cachedResponse.blob();
      keepBlobInCache(cleanUrl, blob);
    } catch (err) {
      console.error('[SW] Failed to read blob from cache response:', err);
      // Fallback: request from network
      return fetch(request);
    }
  }
  const rangeHeader = request.headers.get('Range');
  const match = rangeHeader.match(/^bytes=(\d+)-(\d+)?$/);

  if (!match) {
    // Fallback: serve full file
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': cachedResponse.headers.get('Content-Type') || 'video/mp4',
        'Content-Length': blob.size,
        'Accept-Ranges': 'bytes',
      }
    });
  }

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : blob.size - 1;
  const clampedEnd = Math.min(end, blob.size - 1);

  if (start >= blob.size || start > clampedEnd) {
    return new Response('', {
      status: 416, // Range Not Satisfiable
      headers: {
        'Content-Range': `bytes */${blob.size}`,
        'Content-Length': '0',
      }
    });
  }

  const slicedBlob = blob.slice(start, clampedEnd + 1);
  return new Response(slicedBlob, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Range': `bytes ${start}-${clampedEnd}/${blob.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': slicedBlob.size,
      'Content-Type': cachedResponse.headers.get('Content-Type') || 'video/mp4',
      'Cache-Control': 'public, max-age=31536000',
    }
  });
}
