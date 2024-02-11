// This file defines the API routes that the service worker will handle.
// These are not implemented by a real HTTP server.
import DogController from './dog-controller.js';
import {Params, Router} from './tiny-request-router.mjs';

let selectedId = '';

/**
 * @typedef {import('./dog-controller.js').Dog} Dog
 */

/**
 * This creates a Router for dog API endpoints.
 * @param {DogController} dogController
 * @returns {Router}
 */
export function getRouter(dogController) {
  const router = new Router();

  /**
   * This deletes the dog with a given id.
   * It is defined as a named function
   * so types can be defined with JSDoc.
   * @param {Params} params
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async function deleteHandler({params}) {
    const id = params.get('id');
    await dogController.deleteDog(id);
    return new Response('');
  }
  router.delete('/dog/:id', deleteHandler);

  /**
   * Deselects the currently selected dog.
   */
  router.get('/deselect', () => {
    selectedId = '';
    return new Response('', {headers: {'HX-Trigger': 'selection-change'}});
  });

  // This gets table rows for all the dogs.
  router.get('/dog', async () => dogController.getDogs());

  /**
   * This handles creating a new dog.
   * It is defined as a named function
   * so types can be defined with JSDoc.
   * @param {Params} params
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async function postHandler(params, request) {
    const formData = await request.formData();
    /** @type Dog */
    const dog = Object.fromEntries(formData);
    return dogController.addDog(dog);
  }
  router.post('/dog', postHandler);

  /**
   * This handles updating an existing dog.
   * It is defined as a named function
   * so types can be defined with JSDoc.
   * @param {Params} params
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async function putHandler(params, request) {
    const formData = await request.formData();
    /** @type Dog */
    const dog = Object.fromEntries(formData);
    return dogController.updateDog(dog);
  }
  // This handles renaming all dogs with the name "Snoopy" to "Woodstock".
  router.put('/dog', async () => putHandler);

  return router;
}
