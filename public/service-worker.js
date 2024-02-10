/// <reference lib="webworker" />

import DogController from './dog-controller.js';
import {getRouter} from './dog-router.js';
import IDBEasy from './idb-easy.js';

const cacheName = 'pwa-demo-v1';
const dbName = 'myDB';
const version = 1;

// This value was copied from the .env file.
const publicKey =
  'BLqlJ1001ZxraUEtFPKGDJTBm8Cmk6i44-mtv8i2p8ReAU8orbyC90zdjeJL-hCRooyPRcQoKBquc4sQ1uIlh0E';

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
 * This converts a base64 string to a Uint8Array.
 * @param {string} base64String
 * @returns a Uint8Array
 */
function base64StringToUint8Array(base64String) {
  // Add equal signs to the end so the length is a multiple of 4.
  // See https://base64.guru/learn/base64-characters.
  //
  // The following site says "The base64 Decode converter does not support
  // dash("-") and underscore("_") characters, therefore it is necessary to
  // replace those characters before doing the Base64 decoding.
  // Use "+" instead of "-" and "/" instead of "_"."
  // https://docshield.kofax.com/RPA/en_US/10.6.0_p2wddr4n2j/help/kap_help/reference/c_basedecode.html
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const binary = atob(base64);
  const outputArray = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; ++i) {
    outputArray[i] = binary.charCodeAt(i);
  }
  return outputArray;
}

/**
 * This deletes all the keys from a given cache.
 * It is not currently used.
 * @param {string} cacheName
 * @returns {Promise<void>}
 */
async function deleteCache(cacheName) {
  // @type {string[]}
  const keys = await caches.keys();
  await Promise.all(
    keys.map(key => (key === cacheName ? null : caches.delete(key)))
  );
}

/**
 * This gets the body of a request as text.
 * It is not currently used.
 * @param {Request} request
 * @returns {Promise<string>} the body text
 */
async function getBodyText(request) {
  const {body} = request;
  if (!body) return '';
  const reader = body.getReader();
  let result = '';
  while (true) {
    const {done, value} = await reader.read();
    const text = new TextDecoder().decode(value);
    result += text;
    if (done) break;
  }
  return result;
}

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
 * This determines if the current browser is Safari.
 * @returns {boolean} true if Safari; false otherwise
 */
function inSafari() {
  const {userAgent} = navigator;
  if (!userAgent.includes('Safari')) return false;
  return !userAgent.includes('Chrome');
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

async function subscribeToPushNotifications() {
  if (inSafari()) {
    console.log(
      'service-worker.js: Safari uses a non-standard push notification API that this app does not support.'
    );
    return;
  }

  try {
    // This fails if the user has not already granted
    // permission to receive push notifications, so only
    // call this function after they grant permission.
    // WARNING: If the "Update on reload" checkbox in the Chrome DevTools
    // Application tab is checked, the following line will not work.
    const subscription = await registration.pushManager.subscribe({
      applicationServerKey: base64StringToUint8Array(publicKey),
      userVisibleOnly: true // false allows silent push notifications
    });

    // Save the subscription on the server so it can
    // send push notifications to this service worker.
    await fetch('/save-subscription', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(subscription)
    });
  } catch (error) {
    console.error('service-worker.js subscribeToPushNotifications:', error);
  }
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

  // We could choose to delete the current cache every time
  // a new version of the service worker is activated.
  // event.waitUntil(deleteCache(cacheName));

  // This gets an estimate for the amount of storage available
  // to this service worker.
  // Safari says "The operation is not supported." for the "estimate" method.
  // const estimate = await navigator.storage.estimate();
  // console.log('service-worker.js: storage estimate =', estimate);

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

/**
 * This registers a listener for the "message" event of this service worker.
 */
addEventListener('message', event => {
  const message = event.data;
  if (message === 'subscribe') {
    subscribeToPushNotifications();
  } else {
    console.error('service-worker.js: unexpected message =', message);
  }
});

/**
 * This registers a listener for the "push" event of this service worker.
 * One way to test this is to trigger a push from Chrome DevTools.
 * Click the "Application" tab, click "Service workers" in the left nav,
 * enter a message in the Push input, and click the "Push" button.
 * A push notification should appear.
 * Push notifications automatically disappear after about five seconds.
 */
addEventListener('push', async event => {
  if (Notification.permission === 'granted') {
    let title, body, icon;
    try {
      // If the event data is JSON, expect it
      // to have title, body, and icon properties.
      const {title, body, icon} = event.data.json();
      registration.showNotification(title, {body, icon});
    } catch (error) {
      // Otherwise assume the event data is text
      // that can be used as the notification title.
      const title = event.data.text();
      registration.showNotification(title);
    }
  } else {
    console.error('service-worker.js: push permission not granted');
  }
});
