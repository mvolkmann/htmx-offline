# htmx-offline

It is a widely held belief that htmx cannot be used for apps that require
offline functionality. This is a reasonable assumption given that htmx
is all about sending HTTP requests. However, a service worker can intercept
HTTP requests and process them. The processing could include interacting
with an IndexedDB database. This enables all the functionality to work offline.

This repository demonstrates the approach described above.

To run the app locally:

- enter `bun install`
- enter `bun dev`
- browse localhost:3000

The app is a Progressive Web App (PWA).

To add the app to an iOS home screen:

- browse the app in mobile Safari
- click the share button
- select "Add to Home Screen"
