// This file defines the API routes that the service worker will handle.
// These are not implemented by a real HTTP server.

import elements from './js2htmlstr.js';
const {button, div, form, input, label, td, tr} = elements;
import IDBEasy from './idb-easy.js';
import {Router} from './tiny-request-router.mjs';

/** @typedef {import('./types.d.ts').Dog} Dog } */
/** @typedef {import('./types.d.ts').MyRouter} MyRouter */
/** @typedef {import('./types.d.ts').RouteMatch} RouteMatch */
/** @typedef {import('./types.d.ts').StringToString} StringToString */

// These are for an IndexedDB store.
const dbName = 'myDB';
const storeName = 'dogs';
const version = 1;

/** @type {IDBEasy} */
let idbEasy; // set in setupDB

let selectedId = 0;

setupDB();

/**
 * Converts a Dog object to an HTML string.
 * @param {Dog} dog
 * @param {boolean} updating
 * @returns
 */
function dogToTableRow(dog, updating = false) {
  const {breed, id, name} = dog;

  /** @type {StringToString} */
  const attrs = {
    class: 'on-hover',
    id: `row-${id}`
  };
  if (updating) attrs['hx-swap-oob'] = 'true';

  return tr(
    attrs,
    td(name),
    td(breed),
    td(
      {class: 'buttons'},
      button(
        {
          class: 'show-on-hover',
          'hx-confirm': 'Are you sure?',
          'hx-delete': `/dog/${id}`,
          'hx-target': 'closest tr',
          'hx-swap': 'outerHTML',
          type: 'button'
        },
        '✕'
      ),
      // This selects the dog which triggers a selection-change event
      // which causes the form to update.
      button(
        {
          class: 'show-on-hover',
          'hx-get': '/select/' + dog.id,
          'hx-swap': 'none',
          type: 'button'
        },
        '✎'
      )
    )
  );
}

/**
 * This creates a Dog object from the FormData in a Request.
 * @param {Request} request
 * @returns {Promise<Dog>}
 */
async function requestToDog(request) {
  const formData = await request.formData();
  // @ts-ignore
  return /** @type {Dog} */ (Object.fromEntries(formData));
}

/**
 * This initializes the dogs store with sample data if it is currently empty.
 * @param {IDBTransaction} [txn]
 * @returns {Promise<void>}
 */
async function initializeDB(txn) {
  try {
    // Determine if the store is empty.
    const count = await idbEasy.getRecordCount(storeName, txn);
    if (count > 0) return;

    await idbEasy.createRecord(
      storeName,
      {name: 'Comet', breed: 'Whippet'},
      txn
    );
    await idbEasy.createRecord(
      storeName,
      {
        name: 'Oscar',
        breed: 'German Shorthaired Pointer'
      },
      txn
    );

    // This code is only here to provide an example of
    // updating an existing record using the upsertRecord method.
    const dogs = /** @type {Dog[]} */ (
      await idbEasy.getAllRecords(storeName, txn)
    );
    const comet = dogs.find(dog => dog.name === 'Comet');
    if (comet) {
      comet.name = 'Fireball';
      await idbEasy.upsertRecord(storeName, comet, txn);
    }

    // This code is only here to provide an example of
    // adding a new record using the upsertRecord method.
    await idbEasy.upsertRecord(
      storeName,
      {
        name: 'Clarice',
        breed: 'Whippet'
      },
      txn
    );
  } catch (error) {
    console.error('dogs.js initialize: error =', error);
  }
}

/**
 * This sets the idbEasy variable that is used to
 * simplify interacting with an IndexedDB database.
 * I tried for a couple of hours to simplify this code
 * and couldn't arrive at an alternative that works.
 */
function setupDB() {
  const promise = IDBEasy.openDB(dbName, version, (db, event) => {
    // const {newVersion, oldVersion} = event;

    idbEasy = new IDBEasy(db);

    // If the "dogs" store already exists, delete it.
    const request = /** @type {IDBOpenDBRequest} */ (event.target);
    const txn = request.transaction;
    if (txn) {
      const names = Array.from(txn.objectStoreNames);
      if (names.includes(storeName)) idbEasy.deleteStore(storeName);
    }

    // Create the "dogs" store and its indexes.
    const store = idbEasy.createStore(storeName, 'id', true);
    idbEasy.createIndex(store, 'breed-index', 'breed');
    idbEasy.createIndex(store, 'name-index', 'name');

    initializeDB(txn ?? undefined);
  });

  // Top-level await is not allowed in service workers.
  promise.then(upgradedDB => {
    idbEasy = new IDBEasy(upgradedDB);
  });
}

//-----------------------------------------------------------------------------

const router = /** @type {MyRouter} */ (new Router());

// This deletes the dog with a given id.
router.delete('/dog/:id', async params => {
  // params will always be present here since the route has a parameter.
  const id = params ? Number(params['id']) : 0;
  await idbEasy.deleteRecordByKey('dogs', id);
  return new Response('');
});

// This deselects the currently selected dog.
router.get('/deselect', async () => {
  selectedId = 0;
  return new Response('', {headers: {'HX-Trigger': 'selection-change'}});
});

// This gets an HTML form that is used to add and update dogs.
router.get('/form', async () => {
  const selectedDog = /** @type {Dog | undefined} */ (
    await idbEasy.getRecordByKey('dogs', selectedId)
  );

  /** @type {StringToString}} */
  const attrs = {
    'hx-on:htmx:after-request': 'this.reset()'
  };

  if (selectedId) {
    // Update an existing row.
    attrs['hx-put'] = '/dog/' + selectedId;
  } else {
    // Add a new row.
    attrs['hx-post'] = '/dog';
    attrs['hx-target'] = 'tbody';
    attrs['hx-swap'] = 'afterbegin';
  }

  const buttons = [button({id: 'submit-btn'}, selectedId ? 'Update' : 'Add')];
  if (selectedId) {
    buttons.push(
      button(
        {'hx-get': '/deselect', 'hx-swap': 'none', type: 'button'},
        'Cancel'
      )
    );
  }

  const html = form(
    {'hx-disabled-elt': '#submit-btn', ...attrs},
    div(
      label({for: 'name'}, 'Name'),
      input({
        id: 'name',
        name: 'name',
        required: true,
        size: 30,
        type: 'text',
        value: selectedDog?.name ?? ''
      })
    ),
    div(
      label({for: 'breed'}, 'Breed'),
      input({
        id: 'breed',
        name: 'breed',
        required: true,
        size: 30,
        type: 'text',
        value: selectedDog?.breed ?? ''
      })
    ),
    div({class: 'buttons'}, ...buttons)
  );

  return new Response(html, {
    headers: {'Content-Type': 'application/html'}
  });
});

// This gets table rows for all the dogs.
router.get('/rows', async () => {
  const dogs = /** @type {Dog[]} */ (await idbEasy.getAllRecords('dogs'));
  const sortedDogs = Array.from(dogs.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const html = sortedDogs.map(dog => dogToTableRow(dog)).join('');
  return new Response(html, {
    headers: {'Content-Type': 'application/html'}
  });
});

// This selects a dog with a given id.

router.get('/select/:id', async params => {
  // params will always be present here since the route has a parameter.
  selectedId = params ? Number(params['id']) : 0;
  return new Response('', {headers: {'HX-Trigger': 'selection-change'}});
});

// This creates a new dog.
router.post('/dog', async (params, request) => {
  const dog = await requestToDog(request);
  const id = await idbEasy.createRecord('dogs', dog);
  dog.id = Number(id);
  const html = dogToTableRow(dog);
  return new Response(html, {
    headers: {'Content-Type': 'application/html'}
  });
});

// This updates an existing dog.
router.put('/dog/:id', async (params, request) => {
  const dog = await requestToDog(request);
  dog.id = Number(params['id']);

  selectedId = 0;

  await idbEasy.upsertRecord('dogs', dog);
  const html = dogToTableRow(dog, true);
  return new Response(html, {
    headers: {
      'Content-Type': 'application/html',
      'HX-Trigger': 'selection-change'
    }
  });
});

/**
 * This function is used by the "fetch" handler in service-worker.js.
 * @param {string} method
 * @param {string} pathname
 * @returns {RouteMatch | undefined}
 */
export function getRouteMatch(method, pathname) {
  return router.match(method, pathname);
}
