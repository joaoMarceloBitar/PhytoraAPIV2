import crypto from 'node:crypto';
import path from 'node:path';

import multer from 'multer';

import { env } from '../config/env';

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, env.UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const extensao = path.extname(file.originalname || '').toLowerCase();
    const extensaoSegura = extensao || '.jpg';
    cb(null, `${crypto.randomUUID()}${extensaoSegura}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
  },
  fileFilter(_req, file, cb) {
    if (!env.MIMETYPES_PERMITIDOS.includes(file.mimetype)) {
      cb(new Error('Formato inválido. Envie uma imagem JPEG, PNG, WEBP ou BMP.'));
      return;
    }

    cb(null, true);
  },
});
