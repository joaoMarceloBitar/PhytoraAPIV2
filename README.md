# Phytora API

API de inferência de fitopatologias: recebe uma imagem de folha, executa a inferência em um modelo CNN treinado no PyTorch e retorna a classe prevista.

A API é escrita em **TypeScript/Node.js**, mas a inferência roda em **Python/PyTorch**, já que o modelo treinado está no formato `.pth`. O processo Python fica vivo entre requisições (carregar o modelo é caro) e se comunica com o Node por stdin/stdout, um JSON por linha.

---

## Estrutura

```txt
PhytoraAPI/
├── src/
│   ├── server.ts                       # bootstrap: valida modelo, sobe worker, sobe HTTP
│   ├── app.ts                          # montagem do Express (middlewares + rotas)
│   ├── config/env.ts                   # variáveis de ambiente e caminhos
│   ├── routes/                         # definição das rotas
│   ├── controllers/                    # entrada/saída HTTP, chama services
│   ├── services/                       # regra de negócio (sem acesso a DB ou I/O externo)
│   ├── repositories/                   # acesso ao banco de dados (a partir da etapa 1)
│   ├── infra/                          # adaptadores externos (worker Python, INMET, storage)
│   ├── middlewares/                    # upload (multer) e tratamento de erros
│   └── types/                          # tipos do domínio
├── python/
│   └── inference_worker.py             # worker de inferência (PyTorch)
├── models_saved/
│   └── model.pth                       # checkpoint treinado
└── .runtime/uploads/                   # imagens temporárias (apagadas após a inferência)
```

---

## 1. Instalar dependências do Node

```bash
npm install
```

## 2. Criar o ambiente Python

### Windows PowerShell

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### Linux/macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## 3. Instalar dependências Python

```bash
pip install -r requirements.txt
```

## 4. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Se o venv não estiver ativado no shell que roda a API, aponte o `PYTHON_CMD` para o interpretador do venv (ex.: `./.venv/Scripts/python.exe` no Windows).

## 5. Colocar o modelo treinado

O checkpoint precisa estar em `models_saved/model.pth` — se o arquivo não existir, a API não inicia.

## 6. Rodar

```bash
npm run dev     # desenvolvimento (tsx, recarrega ao salvar)
npm start       # compila (tsc) e roda a partir de dist/
npm run typecheck
```

Saída esperada:

```txt
Inicializando API de inferência CNN...
Modelo esperado em: .../models_saved/model.pth

API iniciada com modelo carregado.
Dispositivo usado pelo PyTorch: cpu
Classes carregadas: ["ferrugem","mancha_alvo","mosaico","saudavel","septoria"]

Servidor rodando em: http://localhost:3080
Endpoint de inferência: POST http://localhost:3080/infer
```

---

## Endpoint

```txt
POST /infer
```

Recebe `multipart/form-data` com a imagem no campo `image` (JPEG, PNG, WEBP ou BMP, até 8 MB).

### Testar com curl

```bash
curl -X POST http://localhost:3080/infer -F "image=@./teste.jpg"
```

No Windows PowerShell, use `curl.exe`.

### Resposta

```json
{
  "ok": true,
  "predictedClass": "septoria",
  "predictedIndex": 4,
  "confidence": 0.6351,
  "topPredictions": [
    { "class": "septoria", "index": 4, "confidence": 0.6351 },
    { "class": "ferrugem", "index": 0, "confidence": 0.3647 },
    { "class": "mosaico", "index": 2, "confidence": 0.0000251 }
  ]
}
```

---

## Observações importantes

A arquitetura da CNN definida em `python/inference_worker.py` precisa ser **idêntica** à usada no treinamento do `.pth` — se você alterar a rede ao treinar, atualize a classe `CNN` nesse arquivo, senão o `load_state_dict` falha.

Os nomes das classes vêm do próprio checkpoint (chave `classes`). Se o `.pth` não trouxer essa lista, a API responde com nomes genéricos (`classe_indice_N_sem_nome_no_checkpoint`).

---

## Documentação do projeto

O histórico de versões e o plano da atualização em andamento estão em [`docs/`](./docs) — veja `docs/README.md`.
