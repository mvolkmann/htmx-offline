import {button, td, tr} from './js2html.js';

// This is the name of an IndexedDB store.
const storeName = 'dogs';

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
 * This implements methods to create, populate, and interact
 * with an IndexedDB database.
 */
export default class DogController {
  /**
   * @constructor
   * @param {any} idbEasy
   */
  constructor(idbEasy) {
    this.idbEasy = idbEasy;
  }

  /**
   * This initializes the dogs store with sample data if it is currently empty.
   * @param {IDBTransaction} txn
   * @returns {Promise<void>}
   */
  async initialize(txn) {
    const ie = this.idbEasy;
    try {
      // Determine if the store is empty.
      const count = await ie.getRecordCount(storeName, txn);
      if (count > 0) return;

      await ie.createRecord(storeName, {name: 'Comet', breed: 'Whippet'}, txn);
      await ie.createRecord(
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
      const dogs = await ie.getAllRecords(storeName, txn);
      const comet = dogs.find(dog => dog.name === 'Comet');
      if (comet) {
        comet.name = 'Fireball';
        await ie.upsertRecord(storeName, comet, txn);
      }

      // This code is only here to provide an example of
      // adding a new record using the upsertRecord method.
      await ie.upsertRecord(
        storeName,
        {
          name: 'Clarice',
          breed: 'Whippet'
        },
        txn
      );

      /*
      // This code is only here to demonstrate
      // getting an existing record by its key.
      const oscar = await ie.getRecordByKey(storeName, 2, txn);
      console.log('oscar =', oscar);

      // This code is only here to demonstrate using an index
      // to get all the records with a given index value.
      const whippets = await ie.getRecordsByIndex(
        storeName,
        'breed-index',
        'Whippet',
        txn
      );
      console.log('whippets =', whippets);

      // This code is only here to demonstrate
      // deleting an existing record by its key.
      await ie.deleteRecordByKey(storeName, 2, txn);
      const remainingDogs = await ie.getAllRecords('dogs', txn);
      console.log('remainingDogs =', remainingDogs);
      */
    } catch (error) {
      console.error('dogs.js initialize: error =', error);
    }
  }

  /**
   * This creates the initial stores and indexes in the database
   * or upgrades existing ones.
   * Then it calls the initialize method to add sample data.
   * @param {IDBVersionChangeEvent} event
   */
  upgrade(event) {
    const {newVersion, oldVersion} = event;
    if (oldVersion === 0) {
      console.log('creating first version of IndexedDB database');
    } else {
      console.log(
        'upgrading IndexedDB database from version',
        oldVersion,
        'to',
        newVersion
      );
    }

    const ie = this.idbEasy;

    // If the "dogs" store already exists, delete it.
    const txn = event.target?.transaction;
    if (txn) {
      const names = Array.from(txn.objectStoreNames);
      if (names.includes(storeName)) ie.deleteStore(storeName);
    }

    // Recreate the "dogs" store and its indexes.
    const store = ie.createStore(storeName, 'id', true);
    ie.createIndex(store, 'breed-index', 'breed');
    ie.createIndex(store, 'name-index', 'name');

    this.initialize(txn);
  }

  /**
   * Adds a Dog to the database.
   * @param {Dog} dog
   * @returns {Promise<Response>} HTML for a new table row.
   */
  async addDog(dog) {
    const ie = this.idbEasy;
    dog.id = await ie.createRecord('dogs', dog);
    const html = dogToTableRow(dog);
    return new Response(html, {
      headers: {'Content-Type': 'application/html'}
    });
  }

  /**
   * Deletes a Dog from the database.
   * @param {number} id
   * @return {Promise<void>}
   */
  async deleteDog(id) {
    const ie = this.idbEasy;
    return ie.deleteRecordByKey('dogs', id);
  }

  /**
   * This gets the Dog with a given id.
   * @param {number} id
   * @returns {Promise<Response>}
   */
  async getDog(id) {
    const ie = this.idbEasy;
    const dog = await ie.getRecordByKey('dogs', id);
    if (dog) {
      const html = dogToTableRow(dog);
      return new Response(html, {
        headers: {'Content-Type': 'application/html'}
      });
    } else {
      return new Response('', {
        headers: {'Content-Type': 'application/html'},
        status: 404
      });
    }
  }

  /**
   * This gets all the Dogs.
   * @returns {Promise<Response>}
   */
  async getDogs() {
    const ie = this.idbEasy;
    const dogs = await ie.getAllRecords('dogs');
    const html = dogs.map(dogToTableRow).join('');
    return new Response(html, {
      headers: {'Content-Type': 'application/html'}
    });
  }

  /**
   * Updates an existing Dog in the database.
   * @param {Dog} dog
   * @returns {Promise<Dog>}
   */
  async updateDog(dog) {
    const ie = this.idbEasy;
    await ie.updateRecordsByIndex('dogs', 'name-index', 'Snoopy', 'Woodstock');
    return dog;
  }
}
