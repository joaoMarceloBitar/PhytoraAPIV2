import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import crypto from 'node:crypto';
import os from 'node:os';
import readline from 'node:readline';

import { env } from '../config/env';
import type { MensagemWorker, ResultadoInferencia } from '../types/inference.types';

interface RequisicaoPendente {
  resolve: (resultado: ResultadoInferencia) => void;
  reject: (erro: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Mantém o processo Python vivo entre requisições (carregar o modelo .pth é caro).
 * Protocolo: uma requisição JSON por linha no stdin, uma resposta JSON por linha no stdout,
 * correlacionadas por um id.
 */
class PythonWorker {
  private processo: ChildProcessWithoutNullStreams | null = null;
  private pronto = false;
  private pendentes = new Map<string, RequisicaoPendente>();

  iniciar(): Promise<void> {
    return new Promise((resolve, reject) => {
      const processo = spawn(env.PYTHON_CMD, [
        env.WORKER_SCRIPT,
        '--model',
        env.MODEL_PATH,
      ]);
      this.processo = processo;

      const leitor = readline.createInterface({ input: processo.stdout });

      const timeoutDeInicializacao = setTimeout(() => {
        reject(new Error('Timeout ao tentar carregar o modelo PyTorch.'));
      }, env.WORKER_STARTUP_TIMEOUT_MS);

      leitor.on('line', (linha) => {
        let mensagem: MensagemWorker;

        try {
          mensagem = JSON.parse(linha) as MensagemWorker;
        } catch {
          console.error('Saída inválida do worker Python:', linha);
          return;
        }

        if ('status' in mensagem && mensagem.status === 'ready') {
          clearTimeout(timeoutDeInicializacao);
          this.pronto = true;

          console.log('\nAPI iniciada com modelo carregado.');
          console.log(`Dispositivo usado pelo PyTorch: ${mensagem.device}`);
          console.log(`Classes carregadas: ${JSON.stringify(mensagem.classes)}`);

          resolve();
          return;
        }

        if ('status' in mensagem && mensagem.status === 'startup_error') {
          clearTimeout(timeoutDeInicializacao);

          console.error('\nERRO ao carregar o modelo:');
          console.error(mensagem.message);
          console.error(mensagem.traceback);

          reject(new Error(mensagem.message));
          return;
        }

        if ('id' in mensagem && this.pendentes.has(mensagem.id)) {
          const pendente = this.pendentes.get(mensagem.id)!;

          clearTimeout(pendente.timeout);
          this.pendentes.delete(mensagem.id);

          if (mensagem.ok) {
            pendente.resolve(mensagem.result);
          } else {
            pendente.reject(new Error(mensagem.error));
          }
        }
      });

      processo.stderr.on('data', (dados: Buffer) => {
        console.error('[Python stderr]', dados.toString());
      });

      processo.on('exit', (codigo) => {
        this.pronto = false;

        if (this.pendentes.size > 0) {
          for (const pendente of this.pendentes.values()) {
            clearTimeout(pendente.timeout);
            pendente.reject(new Error('Worker Python foi encerrado.'));
          }

          this.pendentes.clear();
        }

        console.error(`Worker Python encerrado com código: ${codigo}`);
      });

      processo.on('error', (erro) => {
        clearTimeout(timeoutDeInicializacao);
        reject(erro);
      });
    });
  }

  inferir(caminhoImagem: string): Promise<ResultadoInferencia> {
    return new Promise((resolve, reject) => {
      if (!this.pronto || !this.processo) {
        reject(new Error('Modelo ainda não está pronto para inferência.'));
        return;
      }

      const id = crypto.randomUUID();

      const timeout = setTimeout(() => {
        this.pendentes.delete(id);
        reject(new Error('Timeout durante a inferência.'));
      }, env.INFERENCE_TIMEOUT_MS);

      this.pendentes.set(id, { resolve, reject, timeout });

      this.processo.stdin.write(JSON.stringify({ id, imagePath: caminhoImagem }) + os.EOL);
    });
  }
}

export const pythonWorker = new PythonWorker();
