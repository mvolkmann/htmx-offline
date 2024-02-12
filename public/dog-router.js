// This file defines the API routes that the service worker will handle.
// These are not implemented by a real HTTP server.

// Remove disabling of TypeScript type checking after the code is working.
// @ts-nocheck

import IDBEasy from './idb-easy.js';
import {button, div, form, input, label, td, tr} from './js2html.js';
// import {Params, Router} from './tiny-request-router.mjs';
import {Router} from './tiny-request-router.mjs';

// These are for an IndexedDB store.
const dbName = 'myDB';
const storeName = 'dogs';
const version = 1;

let idbEasy;
let selectedId = 0;

/**
 * This sets the idbEasy variable that is used to
 * simplify interacting with an IndexedDB database.
 * I tried for a couple of hours to simplify this code
 * and couldn't arrive at an alternative that works.
 */
function setup() {
  const promise = IDBEasy.openDB(dbName, version, (db, event) => {
    idbEasy = new IDBEasy(db);
    upgradeDB(event);
  });

  // Top-level await is not allowed in service workers.
  promise.then(upgradedDB => {
    idbEasy = new IDBEasy(upgradedDB);
  });
}
setup();

/**
 * @typedef {object} Dog
 * @property {number} id
 * @property {string} name
 * @property {string} breed
 */

/**
 * Converts a Dog object to an HTML string.
 * @param {Dog} dog
 * @param {boolean} updating
 * @returns
 */
function dogToTableRow(dog, updating = false) {
  const {breed, id, name} = dog;

  /** @type {{[key: string]: string}} */
  const attrs = {
    class: 'on-hover',
    id: `row-${id}`
  };
  if (updating) attrs['hx-swap-oob'] = 'true';

  return tr(attrs, [
    td(name),
    td(breed),
    td({class: 'buttons'}, [
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
    ])
  ]);
}

/**
 * This initializes the dogs store with sample data if it is currently empty.
 * @param {IDBTransaction} txn
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
    /** @type {Dog[]} */
    const dogs = await idbEasy.getAllRecords(storeName, txn);
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
 * This creates the initial store and indexes in the IndexedDB database
 * or upgrades existing ones.
 * Then it calls initializeDB to add sample data.
 * @param {IDBVersionChangeEvent} event
 */
function upgradeDB(event) {
  // const {newVersion, oldVersion} = event;

  // If the "dogs" store already exists, delete it.
  const txn = event.target?.transaction;
  if (txn) {
    const names = Array.from(txn.objectStoreNames);
    if (names.includes(storeName)) idbEasy.deleteStore(storeName);
  }

  // Create the "dogs" store and its indexes.
  const store = idbEasy.createStore(storeName, 'id', true);
  idbEasy.createIndex(store, 'breed-index', 'breed');
  idbEasy.createIndex(store, 'name-index', 'name');

  initializeDB(txn);
}

/**
 * @typedef {import('./dog-controller.js').Dog} Dog
 */

const router = new Router();

/**
 * This deletes the dog with a given id.
 * It is defined as a named function
 * so types can be defined with JSDoc.
 * @param {Params} params
 * @returns {Promise<Response>}
 */
router.delete('/dog/:id', async params => {
  const id = Number(params['id']);
  await idbEasy.deleteRecordByKey('dogs', id);
  return new Response('');
});

/**
 * Deselects the currently selected dog.
 */
router.get('/deselect', () => {
  selectedId = 0;
  return new Response('', {headers: {'HX-Trigger': 'selection-change'}});
});

router.get('/form', async () => {
  const selectedDog = await idbEasy.getRecordByKey('dogs', selectedId);

  /** @type {[key: string]: string} */
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

  const html = form({'hx-disabled-elt': '#submit-btn', ...attrs}, [
    div([
      label({for: 'name'}, 'Name'),
      input({
        id: 'name',
        name: 'name',
        required: true,
        size: 30,
        type: 'text',
        value: selectedDog?.name ?? ''
      })
    ]),
    div([
      label({for: 'breed'}, 'Breed'),
      input({
        id: 'breed',
        name: 'breed',
        required: true,
        size: 30,
        type: 'text',
        value: selectedDog?.breed ?? ''
      })
    ]),
    div({class: 'buttons'}, buttons)
  ]);

  return new Response(html, {
    headers: {'Content-Type': 'application/html'}
  });
});

// This gets table rows for all the dogs.
router.get('/rows', async () => {
  const dogs = await idbEasy.getAllRecords('dogs');
  const sortedDogs = Array.from(dogs.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const html = sortedDogs.map(dog => dogToTableRow(dog)).join('');
  return new Response(html, {
    headers: {'Content-Type': 'application/html'}
  });
});

/**
 * This selects a dog.
 * @param {Params} params
 */
router.get('/select/:id', params => {
  selectedId = Number(params['id']);
  return new Response('', {headers: {'HX-Trigger': 'selection-change'}});
});

/**
 * This handles creating a new dog.
 * It is defined as a named function
 * so types can be defined with JSDoc.
 * @param {Params} params
 * @param {Request} request
 * @returns {Promise<Response>}
 */
router.post('/dog', async (params, request) => {
  const formData = await request.formData();
  /** @type Dog */
  const dog = Object.fromEntries(formData);
  dog.id = await idbEasy.createRecord('dogs', dog);
  const html = dogToTableRow(dog);
  return new Response(html, {
    headers: {'Content-Type': 'application/html'}
  });
});

/**
 * This handles updating an existing dog.
 * It is defined as a named function
 * so types can be defined with JSDoc.
 * @param {Params} params
 * @param {Request} request
 * @returns {Promise<Response>}
 */
// This handles renaming all dogs with the name "Snoopy" to "Woodstock".
router.put('/dog/:id', async (params, request) => {
  const formData = await request.formData();
  /** @type Dog */
  const dog = Object.fromEntries(formData);
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

export function getRouteMatch(method, pathname) {
  return router.match(method, pathname);
}
