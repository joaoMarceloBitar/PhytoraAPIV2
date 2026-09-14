import { Router } from 'express';

import { postInferir } from '../controllers/inference.controller';
import { upload } from '../middlewares/upload.middleware';

export const inferenceRoutes = Router();

inferenceRoutes.post('/infer', upload.single('image'), postInferir);
