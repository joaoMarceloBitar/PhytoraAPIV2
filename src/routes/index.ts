import { Router } from 'express';

import { inferenceRoutes } from './inference.routes';

export const routes = Router();

routes.use(inferenceRoutes);
