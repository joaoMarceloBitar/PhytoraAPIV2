# Documentação de versões — Phytora

Este diretório guarda "fotografias" do estado da aplicação ao longo do tempo, uma por marco relevante — para ter histórico de decisões e um ponto de partida claro sempre que uma atualização grande for implementada.

## Convenção

Cada marco relevante tem até dois documentos:

- **`vN-proposta.md`** — escrito **antes** de implementar. Descreve o que vai mudar e por quê (spec/plano). É o input para quem for programar (inclusive uma IA como o Claude).
- **`vN-funcionamento.md`** — escrito **depois** de implementar. Descreve como a aplicação **funciona de fato** naquele momento (o código real, que pode divergir da proposta original).

Use o template em [`TEMPLATE-proposta.md`](./TEMPLATE-proposta.md) para escrever uma `vN-proposta.md`.

## Versões

| Versão | Proposta | Funcionamento | Referência git |
|---|---|---|---|
| v1 | — (retrato do estado entregue, sem proposta prévia) | [v1-funcionamento.md](./v1-funcionamento.md) | commit `a34b51f` ("PD entregue") |
| v2 | [v2-proposta.md](./v2-proposta.md) | — (em implementação) | rede colaborativa de monitoramento fitossanitário: contas, terrenos, mapa, INMET, notificações |

## Fluxo para uma atualização grande

1. Escreva `docs/vN-proposta.md` a partir do template, descrevendo a mudança desejada.
2. Peça a implementação com base nesse arquivo.
3. Depois de implementado e validado, escreva `docs/vN-funcionamento.md` descrevendo o resultado real (pode ser eu mesmo quem escreve, revisitando o código como fiz na v1).
4. Atualize a tabela de versões acima.
