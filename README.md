# htmx-offline

## Overview

It is a widely held belief that htmx cannot be used for apps that require
offline functionality. This is a reasonable assumption given that htmx
is all about sending HTTP requests. However, a service worker can intercept
HTTP requests and process them. The processing could include interacting
with an IndexedDB database. This enables all the functionality to work offline.

This repository implements a Progressive Web App (PWA)
that demonstrates the approach described above.

## Steps to Run

To run the app locally:

- enter `bun install`
- enter `bun dev`
- browse localhost:3000

## Limitations

One of the benefits of htmx is that it enables using any programming language
to implement endpoints that return snippets of HTML.
This benefit is lost when a service worker is used to process HTTP requests.
The reason is that service workers must be implemented in JavaScript.

## Endpoint Routes

The file `public/service-worker.js` adds an event listener for "fetch" events.

Some requests are handled by the service worker
and do not result in a network request.
The function `getRouteMatch` returns either
a handler function for matching requested or `undefined`.

If `getRouteMatch` returns `undefined`, the function `getResource` is called.
This checks the cache for a previously cached response.
If one is found, that is returned.
Otherwise, a network request is sent, the response is cached,
and the response is returned.

For requests handled by the service worker, the small library (15 KB)
<a href="https://github.com/berstend/tiny-request-router"
target="_blank">tiny-request-router</a> is used.
This associate HTTP verbs and URL paths
with functions that handle matching requests.
The file `public/dog-router.js` defines all these endpoints.

## HTML Generation

There are many approaches that endpoints can use to generate HTML.
Each programming language tends to support
templating libraries that are unique to the language.

Some JavaScript engines such as Bun support using JSX to generate HTML.
Unfortunately we can't use JSX in a service worker.

This application uses a custom library for HTML generation
that is very small and quite easy to use. See `public/js2html.js`
and its associated unit tests in `public/js2html.test.js`.
This provides a function for each supported HTML element.
These functions can be passed an object describing HTML attributes
and the element content.

For example, the following code generates
the HTML string "<p class="greet" id="p1">Hello, World!</p>".

```js
const html = p({id: 'p1', class: 'greet'}, 'Hello, World!');
```

## Persistence

All modern web browsers support using
<a href="/blog/topics/#/blog/indexeddb" target="_blank">IndexedDB</a>
to persist data locally.
Using the IndexedDB API can be a bit tedious.
This application uses a custom library for interacting with IndexedDB databases
that is small and easier to use.
See `public/idb-easy.js`.

## Type Checking

One goal of this application is to avoid having a build step.
This precludes the use of TypeScript.
However, we can still get type checking by using JSDoc comments.
This supports flagging type issues in code editors like VS Code.
It also supports reporting type errors by running the command `tsx --noEmit`.
The `package.json` file defines the script "check"
which can be run by entering `bun check`.

Some of the types used in this application are defined in `public/types.d.ts`.

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
