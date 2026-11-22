import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createApiRouter } from './server/routes.ts';
import { EgidaStore } from './server/store.ts';

export async function createAppServer(options?: { persistToDisk?: boolean; useVite?: boolean }) {
  const app = express();
  const store = new EgidaStore({ persistToDisk: options?.persistToDisk ?? true });

  app.use('/api', createApiRouter(store));

  const useVite = options?.useVite ?? process.env.NODE_ENV !== 'production';
  if (useVite) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  return { app, store };
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('server.ts');

if (isMainModule) {
  const PORT = Number(process.env.PORT || 3000);
  createAppServer()
    .then(({ app }) => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`EGIDA_MOODLE escuchando en http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Error al iniciar EGIDA_MOODLE:', err);
      process.exit(1);
    });
}
