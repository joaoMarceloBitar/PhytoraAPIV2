import type { NextFunction, Request, Response } from 'express';

export function tratadorDeErros(
  erro: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  return res.status(400).json({
    ok: false,
    error: erro.message,
  });
}
