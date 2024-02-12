import {getRouteMatch} from './dog-router.js';

const cacheName = 'pwa-demo-v1';

// We aren't currently caching .css files and certain .js files
// because we want changes to be reflected without clearing the cache.
const fileExtensionsToCache = ['jpg', 'js', 'json', 'png', 'webp'];

/**
 * @typedef {object} RouterMatch
 * @property {string} method;
 * @property {string} path;
 * @property {() => Response} handler;
 */

//-----------------------------------------------------------------------------

/**
 * This attempts to get a resource from the cache.
 * If it is not found in the cache, it is retrieved from the network.
 * If it is a kind of resource we want to cache, it is added to the cache.
 * @param {Request} request
 * @returns {Promise<Response | undefined>} that contains the resource
 */
async function getResource(request) {
  const debug = false; // set to true for debugging
  const url = new URL(request.url);
  const {href, pathname} = url;

  // Attempt to get the resource from the cache.
  /** @type {Response | undefined} */
  let resource = await caches.match(request);

  if (resource) {
    if (debug) console.debug('service worker got', href, 'from cache');
  } else {
    try {
      // Get the resource from the network.
      resource = await fetch(request);
      if (debug) console.debug('service worker got', href, 'from network');

      if (shouldCache(pathname)) {
        // Save in the cache to avoid unnecessary future network requests
        // and supports offline use.
        const cache = await caches.open(cacheName);
        await cache.add(url);
        if (debug) console.debug('service worker cached', href);
      }
    } catch (error) {
      console.error('service-worker.js getResource:', error);
      console.error('service worker failed to fetch', url);
      resource = new Response('', {status: 404});
    }
  }

  return resource;
}

/**
 * This determines whether the file at a given path should be cached
 * based on its file extension.
 * @param {string} pathname
 * @returns {boolean} true to cache; false otherwise
 */
function shouldCache(pathname) {
  if (pathname.endsWith('setup.js')) return false;
  if (pathname.endsWith('service-worker.js')) return false;
  const index = pathname.lastIndexOf('.');
  const extension = index === -1 ? '' : pathname.substring(index + 1);
  return fileExtensionsToCache.includes(extension);
}

//-----------------------------------------------------------------------------

/**
 * This registers a listener for the "install" event of this service worker.
 */
addEventListener('install', event => {
  console.info('service-worker.js: installing');
  // This allows existing browser tabs to use an
  // updated version of this service worker.
  skipWaiting();
});

/**
 * This registers a listener for the "activate" event of this service worker.
 */
addEventListener('activate', async event => {
  console.info('service-worker.js: activating');

  try {
    // Let browser clients know that the service worker is ready.
    const matches = await clients.matchAll({includeUncontrolled: true});
    for (const client of matches) {
      // setup.js listens for this message.
      client.postMessage('ready');
    }
  } catch (error) {
    console.error('service-worker.js:', error);
  }
});

/**
 * This registers a listener for the "fetch" event of this service worker.
 * It responds with a resource for accessing data at a requested URL.
 */
addEventListener('fetch', async event => {
  const {request} = event;
  const url = new URL(request.url);
  const {pathname} = url;

  const match = getRouteMatch(request.method, pathname);
  const promise = match
    ? match.handler(match.params, request)
    : getResource(request);
  event.respondWith(promise);
});
