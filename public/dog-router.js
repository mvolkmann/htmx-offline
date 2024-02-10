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

/*
INCORPORATE SOME OF THIS FUNCTIONALITY!

// Deselects the currently selected dog.
app.get('/deselect', (c: Context) => {
  selectedId = '';
  c.header('HX-Trigger', 'selection-change');
  return c.text('');
});

// Gets the proper form for either adding or updating a dog.
app.get('/form', (c: Context) => {
  const selectedDog = dogs.get(selectedId);

  const attrs: {[key: string]: string} = {
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

  return c.html(
    <form hx-disabled-elt="#submit-btn" {...attrs}>
      <div>
        <label for="name">Name</label>
        <input
          id="name"
          name="name"
          required
          size={30}
          type="text"
          value={selectedDog?.name ?? ''}
        />
      </div>
      <div>
        <label for="breed">Breed</label>
        <input
          id="breed"
          name="breed"
          required
          size={30}
          type="text"
          value={selectedDog?.breed ?? ''}
        />
      </div>

      <div class="buttons">
        <button id="submit-btn">{selectedId ? 'Update' : 'Add'}</button>
        {selectedId && (
          <button hx-get="/deselect" hx-swap="none" type="button">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
});

// Gets table rows for all the dogs.
app.get('/rows', (c: Context) => {
  const sortedDogs = Array.from(dogs.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  return c.html(<>{sortedDogs.map(dog => dogRow(dog))}</>);
});

// Selects a dog.
app.get('/select/:id', (c: Context) => {
  selectedId = c.req.param('id');
  c.header('HX-Trigger', 'selection-change');
  return c.text('');
});

// Creates a dog.
app.post('/dog', async (c: Context) => {
  const formData = await c.req.formData();
  const name = (formData.get('name') as string) || '';
  const breed = (formData.get('breed') as string) || '';
  const dog = addDog(name, breed);
  console.log('server.tsx post: dog =', dog);
  return c.html(dogRow(dog), 201);
});

// Updates a dog
app.put('/dog/:id', async (c: Context) => {
  const id = c.req.param('id');
  const formData = await c.req.formData();
  const name = (formData.get('name') as string) || '';
  const breed = (formData.get('breed') as string) || '';
  const updatedDog = {id, name, breed};
  dogs.set(id, updatedDog);

  selectedId = '';
  c.header('HX-Trigger', 'selection-change');
  return c.html(dogRow(updatedDog, true));
});
*/
