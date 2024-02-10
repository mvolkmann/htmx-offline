/// <reference lib="webworker" />

import DogController from './dog-controller.js';
import {getRouter} from './dog-router.js';
import IDBEasy from './idb-easy.js';

const cacheName = 'pwa-demo-v1';
const dbName = 'myDB';
const version = 1;

// We aren't currently caching .css files and certain .js files
// because we want changes to be reflected without clearing the cache.
const fileExtensionsToCache = ['jpg', 'js', 'json', 'png', 'webp'];

/**
 * @typedef {object} RouterMatch
 * @property {string} method;
 * @property {string} path;
 * @property {() => Response} handler;
 */

/**
 * This is a Router for dog API endpoints.
 * @type {{match: (method: string, pathname: string) => RouterMatch }}
 */
let dogRouter;

setDogRouter();

//-----------------------------------------------------------------------------

/**
 * This attempts to get a resource from the cache.
 * If it is not found in the cache, it is retrieved from the network.
 * If it is a kind of resource we want to cache, it is added to the cache.
 * @param {Request} request
 * @returns {Promise<Response | undefined>} that contains the resource
 */
async function getResource(request) {
  const log = false; // set to true for debugging
  const url = new URL(request.url);
  const {href, pathname} = url;

  // Attempt to get the resource from the cache.
  /** @type {Response | undefined} */
  let resource = await caches.match(request);

  if (resource) {
    if (log) console.log('service worker got', href, 'from cache');
  } else {
    try {
      // Get the resource from the network.
      resource = await fetch(request);
      if (log) console.log('service worker got', href, 'from network');

      if (shouldCache(pathname)) {
        // Save in the cache to avoid unnecessary future network requests
        // and supports offline use.
        const cache = await caches.open(cacheName);
        await cache.add(url);
        if (log) console.log('service worker cached', href);
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
 * This sets the dogRouter variable to a Router
 * that is used to handle API requests for dogs.
 * I tried for a couple of hours to simplify this code
 * and couldn't arrive at an alternative that works.
 */
function setDogRouter() {
  const promise = IDBEasy.openDB(dbName, version, (db, event) => {
    const dogController = new DogController(new IDBEasy(db));
    dogController.upgrade(event);
  });

  // Top-level await is not allowed in service workers.
  promise.then(upgradedDB => {
    const dogController = new DogController(new IDBEasy(upgradedDB));
    dogRouter = getRouter(dogController);
  });
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
  console.log('service-worker.js: installing');
  // This allows existing browser tabs to use an
  // updated version of this service worker.
  skipWaiting();
});

/**
 * This registers a listener for the "activate" event of this service worker.
 */
addEventListener('activate', async event => {
  console.log('service-worker.js: activating');

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

  const match = dogRouter.match(request.method, pathname);
  const promise = match
    ? match.handler(match.params, request)
    : getResource(request);
  event.respondWith(promise);
});
