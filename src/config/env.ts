import 'dotenv/config';
import path from 'node:path';

// Sobe dois níveis a partir deste arquivo para chegar na raiz do projeto.
// Funciona tanto rodando via tsx (src/config/) quanto compilado (dist/config/),
// porque src/ e dist/ ficam na mesma profundidade.
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

export const env = {
  PROJECT_ROOT,

  PORT: Number(process.env.PORT ?? 3080),
  PYTHON_CMD: process.env.PYTHON_CMD ?? 'python',
  MODEL_PATH:
    process.env.MODEL_PATH ?? path.join(PROJECT_ROOT, 'models_saved', 'model.pth'),

  RUNTIME_DIR: path.join(PROJECT_ROOT, '.runtime'),
  UPLOAD_DIR: path.join(PROJECT_ROOT, '.runtime', 'uploads'),
  WORKER_SCRIPT: path.join(PROJECT_ROOT, 'python', 'inference_worker.py'),

  WORKER_STARTUP_TIMEOUT_MS: 30_000,
  INFERENCE_TIMEOUT_MS: 30_000,
  MAX_UPLOAD_BYTES: 8 * 1024 * 1024,
  MIMETYPES_PERMITIDOS: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/bmp',
  ] as readonly string[],
} as const;
