import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { createApiRouter } from '../../server/routes.ts';
import { EgidaStore } from '../../server/store.ts';

const app = express();
const store = new EgidaStore({ persistToDisk: false });

app.disable('x-powered-by');
app.use('/api', createApiRouter(store));

export const egidaApi = onRequest(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 5,
  },
  app
);
