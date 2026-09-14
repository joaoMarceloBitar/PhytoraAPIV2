export interface PredicaoTopK {
  class: string;
  index: number;
  confidence: number;
}

export interface ResultadoInferencia {
  predictedClass: string;
  predictedIndex: number;
  confidence: number;
  topPredictions: PredicaoTopK[];
}

/** Requisição enviada ao worker Python (um JSON por linha no stdin). */
export interface RequisicaoWorker {
  id: string;
  imagePath: string;
}

/** Mensagens que o worker Python escreve no stdout (um JSON por linha). */
export type MensagemWorker =
  | {
      status: 'ready';
      message: string;
      device: string;
      classes: string[];
      config: Record<string, unknown>;
    }
  | { status: 'startup_error'; message: string; traceback: string }
  | { id: string; ok: true; result: ResultadoInferencia }
  | { id: string; ok: false; error: string; traceback: string };
