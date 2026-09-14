import type { Request, Response } from 'express';

import { inferirImagem } from '../services/inference.service';

export async function postInferir(req: Request, res: Response): Promise<Response> {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: 'Imagem não enviada.',
    });
  }

  const caminhoImagem = req.file.path;

  console.log('Imagem salva em:');
  console.log(caminhoImagem);

  try {
    const resultado = await inferirImagem(caminhoImagem);

    return res.json({
      ok: true,
      ...resultado,
    });
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      ok: false,
      error: (erro as Error).message,
    });
  }
}
