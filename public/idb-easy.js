/**
 * This returns a Promise that resolves to the result of a given request.
 * @param {IDBRequest} request
 * @param {string} action - for debugging
 * @param {boolean} [suppliedTxn] - indicates whether a transaction was supplied
 * @returns {Promise<any>}
 */
function requestToPromise(request, action, suppliedTxn = false) {
  return new Promise((resolve, reject) => {
    request.onsuccess = event => {
      // console.log('succeeded to', action);
      if (!suppliedTxn) request.transaction?.commit();
      resolve(request.result);
    };
    request.onerror = event => {
      console.error('failed to', action);
      request.transaction?.abort();
      reject(event);
    };
  });
}

/**
 * Instances of this class make it easier to work with IndexedDB.
 */
export default class IDBEasy {
  /**
   * This creates an instance of IDBEasy.
   * @param {IDBDatabase} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * This deletes all the records in a given store.
   * @param {string} storeName
   * @param {IDBTransaction} txn
   * @returns {Promise<void>}
   */
  clearStore(storeName, txn) {
    const suppliedTxn = Boolean(txn);
    if (!suppliedTxn) txn = this.db.transaction(storeName, 'readwrite');
    const store = txn.objectStore(storeName);
    const request = store.clear();
    return requestToPromise(request, 'clear store', suppliedTxn);
  }

  /**
   * This creates an index on a given store.
   * @param {IDBObjectStore} store
   * @param {string} indexName
   * @param {string} keyPath
   * @param {boolean} [unique]
   * @returns {void}
   */
  createIndex(store, indexName, keyPath, unique = false) {
    store.createIndex(indexName, keyPath, {unique});
  }

  /**
   * This creates a record in a given store.
   * @param {string} storeName
   * @param {object} object
   * @param {IDBTransaction} txn
   * @returns {Promise<number|string>} key of new record
   */
  createRecord(storeName, object, txn) {
    const suppliedTxn = Boolean(txn);
    if (!suppliedTxn) txn = this.db.transaction(storeName, 'readwrite');
    const store = txn.objectStore(storeName);
    const request = store.add(object);
    return requestToPromise(request, 'create record', suppliedTxn);
  }

  /**
   * This creates a store in the current database.
   * It must be called within a "versionchange" transaction.
   * @param {string} storeName
   * @param {string} keyPath
   * @param {boolean} [autoIncrement]
   * @returns {IDBObjectStore}
   */
  createStore(storeName, keyPath, autoIncrement = false) {
    return this.db.createObjectStore(storeName, {autoIncrement, keyPath});
  }

  /**
   * This deletes a given database
   * @param {string} dbName
   * @returns {Promise<void>}
   */
  static deleteDB(dbName) {
    const request = indexedDB.deleteDatabase(dbName);
    return requestToPromise(request, 'delete database');
  }

  /**
   * This deletes all the records in a given store
   * that have a given value in a given index.
   * @param {string} storeName
   * @param {string} indexName
   * @param {any} indexValue
   * @param {IDBTransaction} txn
   * @returns {Promise<void>}
   */
  deleteRecordsByIndex(storeName, indexName, indexValue, txn) {
    const suppliedTxn = Boolean(txn);
    if (!suppliedTxn) txn = this.db.transaction(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const store = txn.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(indexValue);
      request.onsuccess = event => {
        const records = event.target.result;
        for (const record of records) {
          store.delete(record[store.keyPath]);
        }
        if (!suppliedTxn) txn.commit();
        resolve();
      };
      request.onerror = event => {
        console.error('failed to delete records by index');
        txn.abort();
        reject(event);
      };
    });
  }

  /**
   * This delete the record in a given store
   * that has a given key value.
   * @param {string} storeName
   * @param {any} key
   * @param {IDBTransaction} txn
   * @returns {Promise<void>}
   */
  deleteRecordByKey(storeName, key, txn) {
    const suppliedTxn = Boolean(txn);
    if (!suppliedTxn) txn = this.db.transaction(storeName, 'readwrite');
    const store = txn.objectStore(storeName);
    const request = store.delete(key);
    return requestToPromise(request, 'delete dog', suppliedTxn);
  }

  /**
   * This deletes a given store.
   * @param {string} storeName
   * @returns {void}
   */
  deleteStore(storeName) {
    this.db.deleteObjectStore(storeName);
  }

  /**
   * This gets all the record in a given store.
   * @param {string} storeName
   * @param {IDBTransaction} txn
   * @returns {Promise<object[]>}
   */
  getAllRecords(storeName, txn) {
    const suppliedTxn = Boolean(txn);
    if (!suppliedTxn) txn = this.db.transaction(storeName, 'readonly');
    const store = txn.objectStore(storeName);
    const request = store.getAll();
    return requestToPromise(request, 'get all records', suppliedTxn);
  }

  /**
   * This gets the record in a given store with a given key value.
   * @param {string} storeName
   * @param {any} key
   * @param {IDBTransaction} txn
   * @returns {Promise<object>}
   */
  getRecordByKey(storeName, key, txn) {
    const suppliedTxn = Boolean(txn);
    if (!suppliedTxn) txn = this.db.transaction(storeName, 'readonly');
    const store = txn.objectStore(storeName);
    const request = store.get(key);
    return requestToPromise(request, 'get record by key', suppliedTxn);
  }

  /**
   * This gets the number of records in a given store.
   * @param {string} storeName
   * @param {IDBTransaction} txn
   * @returns {Promise<number>}
   */
  getRecordCount(storeName, txn) {
    const suppliedTxn = Boolean(txn);
    if (!suppliedTxn) txn = this.db.transaction(storeName, 'readonly');
    const store = txn.objectStore(storeName);
    const request = store.count();
    return requestToPromise(request, 'get record count', suppliedTxn);
  }

  /**
   * This gets all the records in a given store
   * that have a given value in a given index.
   * @param {string} storeName
   * @param {string} indexName
   * @param {any} indexValue
   * @param {IDBTransaction} txn
   * @returns {Promise<object[]>}
   */
  getRecordsByIndex(storeName, indexName, indexValue, txn) {
    const suppliedTxn = Boolean(txn);
    if (!suppliedTxn) txn = this.db.transaction(storeName, 'readonly');
    const store = txn.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(indexValue);
    return requestToPromise(request, 'get records by index', suppliedTxn);
  }

  /**
   * @callback UpgradeCallback
   * @param {IDBDatabase} db
   * @param {IDBVersionChangeEvent} event
   */

  /**
   * This opens a given database.
   * @param {string} dbName
   * @param {number} version
   * @param {UpgradeCallback} upgrade
   * @returns {Promise<IDBDatabase>}
   */
  static openDB(dbName, version, upgrade) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);

      // This is getting called twice, which seems to be a bug.
      request.onsuccess = event => {
        const db = request.result;
        resolve(db);
      };

      request.onerror = event => {
        console.error(`failed to open database ${dbName}`);
        reject(event);
      };

      request.onupgradeneeded = event => {
        const db = request.result;
        upgrade(db, event);
      };
    });
  }

  /**
   * This updates all records in a given store
   * that have a given value for a given index
   * to a new value.
   * @param {string} storeName
   * @param {string} indexName
   * @param {any} oldValue
   * @param {any} newValue
   * @param {IDBTransaction} txn
   * @returns {Promise<void>}
   */
  updateRecordsByIndex(storeName, indexName, oldValue, newValue, txn) {
    const suppliedTxn = Boolean(txn);
    if (!suppliedTxn) txn = this.db.transaction(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const store = txn.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(oldValue);
      request.onsuccess = event => {
        /** @type {object[]} */
        const records = event.target?.result ?? [];
        for (const record of records) {
          let {keyPath} = index;
          if (Array.isArray(keyPath)) keyPath = keyPath[0];
          record[keyPath] = newValue;
          store.put(record);
        }
        if (!suppliedTxn) txn.commit();
        resolve();
      };
      request.onerror = event => {
        console.error('failed to update records by index');
        txn.abort();
        reject(event);
      };
    });
  }

  /**
   * This inserts or updates a record in a given store.
   * @param {string} storeName
   * @param {object} object
   * @param {IDBTransaction} txn
   * @returns {Promise<object>}
   */
  upsertRecord(storeName, object, txn) {
    const suppliedTxn = Boolean(txn);
    if (!suppliedTxn) txn = this.db.transaction(storeName, 'readwrite');
    const store = txn.objectStore(storeName);
    const request = store.put(object);
    return requestToPromise(request, 'update dog', suppliedTxn);
  }
}
