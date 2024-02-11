// Remove disabling of TypeScript type checking after the code is working.
// @ts-nocheck

// This file defines the API routes that the service worker will handle.
// These are not implemented by a real HTTP server.
import DogController from './dog-controller.js';
import {button, div, form, input, label} from './js2html.js';
// import {Params, Router} from './tiny-request-router.mjs';
import {Router} from './tiny-request-router.mjs';

let selectedId = 0;

/**
 * @typedef {import('./dog-controller.js').Dog} Dog
 */

/**
 * This creates a Router for dog API endpoints.
 * @param {DogController} dogController
 * @returns {typeof Router}
 */
export function getRouter(dogController) {
  const router = new Router();

  /**
   * This deletes the dog with a given id.
   * It is defined as a named function
   * so types can be defined with JSDoc.
   * @param {Params} params
   * @returns {Promise<Response>}
   */
  router.delete('/dog/:id', async ({params}) => {
    const id = params.get('id');
    await dogController.deleteDog(id);
    return new Response('');
  });

  /**
   * Deselects the currently selected dog.
   */
  router.get('/deselect', () => {
    selectedId = 0;
    return new Response('', {headers: {'HX-Trigger': 'selection-change'}});
  });

  router.get('/form', () => {
    const selectedDog = dogController.getDog(selectedId);

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
  router.get('/rows', async () => dogController.getDogs());

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
    return dogController.addDog(dog);
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
  router.put('/dog', async (params, request) => {
    const formData = await request.formData();
    /** @type Dog */
    const dog = Object.fromEntries(formData);
    return dogController.updateDog(dog);
  });

  return router;
}
