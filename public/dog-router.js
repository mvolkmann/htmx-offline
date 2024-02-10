// This file defines the API routes that the service worker will handle.
// These are not implemented by a real HTTP server.
import DogController from './dog-controller.js';
import {Router} from './tiny-request-router.mjs';

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

  router.get('/hello', () => new Response('Hello from service worker!'));

  // This gets table rows for all the dogs.
  router.get('/dog', async () => dogController.getDogs());

  /**
   * @typedef {object} Params
   * @property {number} id
   */

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

  // This handles renaming all dogs with the name "Snoopy" to "Woodstock".
  router.put('/dog', async () => dogController.updateSnoopy());

  /**
   * This handles deleting a dog.
   * It is defined as a named function
   * so types can be defined with JSDoc.
   * @param {Params} params
   * @returns {Promise<Response>}
   */
  function deleteHandler(params) {
    return dogController.deleteDog(Number(params.id));
  }
  router.delete('/dog/:id', deleteHandler);

  return router;
}
