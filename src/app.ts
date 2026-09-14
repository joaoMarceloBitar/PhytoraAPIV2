import cors from 'cors';
import express, { type Express } from 'express';

import { tratadorDeErros } from './middlewares/error.middleware';
import { routes } from './routes';

export function criarApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '15mb' }));

  app.use(routes);

  app.use(tratadorDeErros);

  return app;
}
