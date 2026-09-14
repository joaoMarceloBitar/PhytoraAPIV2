import fs from 'node:fs';

import { pythonWorker } from '../infra/python-worker';
import type { ResultadoInferencia } from '../types/inference.types';

/**
 * Roda a inferência sobre uma imagem já salva em disco e descarta o arquivo
 * temporário ao final — tanto em caso de sucesso quanto de erro.
 */
export async function inferirImagem(
  caminhoImagem: string,
): Promise<ResultadoInferencia> {
  try {
    return await pythonWorker.inferir(caminhoImagem);
  } finally {
    fs.unlink(caminhoImagem, () => {});
  }
}
