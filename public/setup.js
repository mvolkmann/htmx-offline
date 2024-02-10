async function registerServiceWorker() {
  // All modern browsers support service workers.
  if (!('serviceWorker' in navigator)) {
    console.error('Your browser does not support service workers');
    return;
  }

  try {
    // Register a service worker for this web app.
    await navigator.serviceWorker.register('service-worker.js', {
      type: 'module'
    });
  } catch (error) {
    console.error('setup.js registerServiceWorker:', error);
  }
}

registerServiceWorker();

// Register to receive messages from the service worker.
// These are sent with "client.postMessage" in the service worker.
// They are not push notifications.
navigator.serviceWorker.onmessage = event => {
  const message = event.data;
  if (message === 'ready') {
    // Determine if a service worker is already controlling this page.
    const haveServiceWorker = Boolean(navigator.serviceWorker.controller);
    // If not then we must have just installed a new service worker.
    if (!haveServiceWorker) {
      // Give the new service worker time to really be ready.
      // Then reload the page so a GET to /dog will work.
      // This is needed to populate the table of dogs.
      setTimeout(() => {
        location.reload();
      }, 100);
    }
  }
};
