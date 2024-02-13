import {Hono} from 'hono';
import {serveStatic} from 'hono/bun';

const app = new Hono();

// Serve static files from the public directory.
app.use('/*', serveStatic({root: './public'}));

export default app;
