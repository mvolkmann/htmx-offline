# htmx-offline

## Overview

It is a widely held belief that htmx cannot be used for apps that require
offline functionality. This is a reasonable assumption given that htmx
is all about sending HTTP requests. However, a service worker can intercept
HTTP requests and process them. The processing could include interacting
with an IndexedDB database.
For some web applications, this enables all the functionality to work offline.

This repository implements a Progressive Web App (PWA)
that demonstrates the approach described above.
It displays descriptions of dogs in a table.
Dogs can be added, modified, and deleted.

![app screenshot](htmx-offline-app.png)

To modify a dog, hover over its table row and click the pencil icon that appears to the right of the row.
This will populate the form fields at the top and change the "Add" button to "Update".
Modify the input values and click the "Update" button to save the changes.

To delete a dog, hover over its table row and click the "X" that appears to the right of the row.
This will prompt for confirmation before deleting the dog.

## Steps to Run

To run the app locally:

- Install [Bun](https://bun.sh) if not already installed.
- Enter `bun install`
- Enter `bun dev`
- Browse localhost:3000

To reset the state of the application in Chrome,
including unregistering the service worker,
clearing the IndexedDB database, and clearing the cache:

- Open the DevTools.
- Click the "Application" tab.
- Click "Storage" in the left nav.
- Click the "Clear site data" button.

## Limitations

One of the benefits of htmx is that it enables using any programming language
to implement endpoints that return snippets of HTML.
This benefit is lost when a service worker is used to process HTTP requests.
The reason is that service workers must be implemented in JavaScript.

## Endpoint Routes

The file [public/service-worker.js](/public/service-worker.js)
adds an event listener that intercepts all "fetch" events.
This includes all HTTP requests sent by htmx attributes.

The function
[getRouteMatch](https://github.com/mvolkmann/htmx-offline/blob/c9b3fc4cfd247e63e395444a463f5ad291f22bf5/public/dog-router.js#L303)
returns either a handler function or `undefined`.
When a handler function is returned,
the request is handled by the service worker.
When `undefined` is returned, the requests is forwarded to the network.

The function `getResource` is called to handle requests to the network.
This checks the cache for a previously cached response.
If one is found, that is returned.
Otherwise, a network request is sent, the response is cached,
and the response is returned.

For requests handled by the service worker, the small library (15 KB)
[tiny-request-router](https://github.com/berstend/tiny-request-router) is used.
This associates HTTP verbs and URL paths
with functions that handle matching requests.
The file `public/dog-router.js` defines all these endpoints.

## HTML Generation

There are many approaches that endpoints can use to generate HTML.
Each programming language tends to support
templating libraries that are unique to the language.

Some JavaScript run-times such as Bun support using JSX to generate HTML.
Unfortunately we can't use JSX in a service worker because
that relies on the browser JavaScript run-time and not Bun.

This application uses a custom library for HTML generation
that is very small (3 KB) and quite easy to use.
See [public/js2html.js](/public/js2html.js) and its
associated unit tests in [public/js2html.test.js](/public/js2html.test.js)`.
This provides a function for each supported HTML element.
These functions can be passed an optional object describing HTML attributes
and the element content.

For example, suppose we want to generate the following HTML string.

```html
<p class="greet" id="p1" \>Hello, World!\</p>
```

The `p` function can be used as follows to do this.

```js
const html = p({id: 'p1', class: 'greet'}, 'Hello, World!');
```

## Persistence

All modern web browsers support using
[IndexedDB](https://mvolkmann.github.io/blog/topics/#/blog/indexeddb/)
to persist data locally.
The IndexedDB API is a bit tedious to use.
This application uses a custom library for interacting with IndexedDB databases
that is small (10 KB) and easier to use.
See [idb-easy.js](/public/idb-easy.js).

## Type Checking

One goal of this application is to avoid having a build step.
This precludes the use of TypeScript.
However, we can still get type checking by using JSDoc comments.

Type issues are flagged in code editors like VS Code.

Type errors can be reported by running the command `tsx --noEmit`.
The `package.json` file defines the script "check"
which can be run by entering `bun check`.

Some of the types used in this application
are defined in the file [public/types.d.ts](/public/types.d.ts).

There are several places in the code that require type casting.
A JSDoc typecast always has the form
`/** @type {some-type} */ (some-expression)`.

For example, the following code queries an IndexedDB database collection
named "dogs" and obtains an array of objects.
A typecast is necessary to inform TypeScript
that it is actually an array of `Dog` objects.

```js
const dogs = /** @type {Dog[]} */ (await idbEasy.getAllRecords('dogs'));
```
