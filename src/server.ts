import fs from 'node:fs';

import { criarApp } from './app';
import { env } from './config/env';
import { pythonWorker } from './infra/python-worker';

function garantirDiretoriosDeRuntime(): void {
  fs.mkdirSync(env.RUNTIME_DIR, { recursive: true });
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}

function validarArquivoDoModelo(): void {
  if (!fs.existsSync(env.MODEL_PATH)) {
    console.error('\nERRO: arquivo .pth não encontrado.');
    console.error(`Caminho esperado: ${env.MODEL_PATH}`);
    console.error('\nCopie seu modelo treinado para:');
    console.error('models_saved/model.pth');
    process.exit(1);
  }
}

function validarWorkerPython(): void {
  if (!fs.existsSync(env.WORKER_SCRIPT)) {
    console.error('\nERRO: worker Python não encontrado.');
    console.error(`Caminho esperado: ${env.WORKER_SCRIPT}`);
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  console.log('Inicializando API de inferência CNN...');
  console.log(`Modelo esperado em: ${env.MODEL_PATH}`);

  garantirDiretoriosDeRuntime();
  validarArquivoDoModelo();
  validarWorkerPython();

  try {
    await pythonWorker.iniciar();
  } catch (erro) {
    console.error('\nNão foi possível iniciar a API.');
    console.error((erro as Error).message);
    process.exit(1);
  }

  const app = criarApp();

  app.listen(env.PORT, () => {
    console.log(`\nServidor rodando em: http://localhost:${env.PORT}`);
    console.log(`Endpoint de inferência: POST http://localhost:${env.PORT}/infer`);
    console.log('\nCampo esperado no multipart/form-data:');
    console.log('image');
  });
}

void bootstrap();
