# v2 — Proposta de atualização

> Consolidado a partir de uma sessão de discussão em rounds (ver histórico de conversa). Todas as decisões abaixo foram revisadas e confirmadas explicitamente antes deste documento ser escrito.

## 1. Objetivo

Transformar o Phytora de uma ferramenta de diagnóstico pontual (foto → resultado, descartado) em uma **rede colaborativa de monitoramento fitossanitário regional**: usuários cadastram terrenos, cada diagnóstico vira um registro georreferenciado visível a outros usuários no mapa, e o sistema cruza esses registros com dados climáticos do INMET para alertar proativamente quem tem terrenos em zonas de risco.

Isso exige, pela primeira vez neste projeto: contas de usuário, um banco de dados persistente (hoje não existe nenhum), geolocalização, e um mapa no app.

## 2. Escopo

### Dentro do escopo

- Reestruturação do backend em camadas (`routes/controllers/services/repositories`) + migração completa para **TypeScript**
- **Postgres + PostGIS** via Docker Compose (ambiente local)
- **Knex** como query builder + sistema de migrations/seeds
- **Zod** para DTOs (validação em runtime + tipos TS inferidos), com `Entity`/`Input DTO`/`Output DTO` separados por recurso
- Autenticação: cadastro, login, **JWT** (access token 15min) + **refresh token rotativo** (30 dias, guardado hasheado em `Sessao`), `bcrypt` para senha
- CRUD de `Terreno`, catálogos `Cultura`/`Doenca`, `Cultura_Plantada`
- Adaptar o fluxo de inferência **já existente** para persistir o resultado como `Registro_Doenca` (hoje a imagem é processada e descartada)
- Armazenamento de fotos em **disco local** do servidor, servido via rota estática do Express, atrás de uma interface (`salvarFoto(buffer) → url`) trocável por S3/R2 depois
- Consulta espacial (`ST_DWithin`, `ST_Distance`) para registros/terrenos próximos
- Mapa no app mobile via `react-native-maps` — **Android apenas** nesta versão
- Migração do app de Expo Go puro para **dev client** (`expo-dev-client`), via `expo run:android` local ou EAS Build
- Integração com o INMET: seed de estações meteorológicas do RS com coordenadas, lookup da estação mais próxima **com dado disponível**, fallback para "clima indisponível" se nenhuma estação num raio de 50km tiver dado recente
- Regra de classificação de risco v1 (baseada em regras, não ML): mesma doença registrada em raio de **15km** nos últimos **7 dias**, cruzada com limiar climático simples — todos os limiares configuráveis via `.env`, não fixos no código
- Notificações geradas no backend e exibidas no app (push via `expo-notifications`, Android)

### Fora do escopo (explicitamente adiado)

- **iOS** — bloqueado sem Mac ou Apple Developer Program (US$ 99/ano); decisão fica para depois, condicionada a investir na conta paga
- Deploy em nuvem/produção — ambiente **local apenas** por enquanto (dev/demo acadêmico)
- "Logout de todos os dispositivos" simultaneamente — só logout do dispositivo atual nesta versão
- Armazenamento em S3/Cloudflare R2 — interface já pronta para trocar depois, sem esforço de migração
- Modelo de ML para classificação de risco — fica regra simples e configurável
- Workspace/monorepo compartilhando tipos entre `Phytora/` e `PhytoraAPI/` — DTOs são espelhados manualmente por enquanto (superfície de API pequena o suficiente para isso ser barato)

## 3. Mudanças por área

### App mobile (`Phytora/`)

- Migrar de Expo Go para dev client (`expo-dev-client` + `expo run:android` local, ou `eas build --profile development --platform android`)
- Novas telas: cadastro, login, lista/criação de terrenos (com captura de localização via GPS), mapa com marcadores de `Registro_Doenca`, lista de notificações
- `culture-selection.tsx` deixa de ser decorativo: passa a vincular a captura a um `Cultura_Plantada` real de um terreno do usuário
- Tokens armazenados via `expo-secure-store` (não `AsyncStorage`)
- `src/services/inference.ts` passa a: incluir header `Authorization` com o access token; enviar `id_terreno`/`id_cultura_plantada`/localização junto da foto para o novo endpoint `/registros`; tratar refresh automático de token em resposta 401
- Tipos DTO espelhados manualmente em `src/types/api.ts`, no mesmo formato dos DTOs do backend (mesma convenção de nomes, ver seção de naming abaixo)
- `react-native-maps` com clustering se o volume de marcadores justificar
- `expo-notifications` para push (Android)
- Tratamento de erro de rede visível ao usuário (hoje só há `console.error`)

### API (`PhytoraAPI/`)

- Migração completa para **TypeScript**, arquivo por arquivo, preservando o comportamento atual — validado por um teste manual ponta a ponta do `/infer` antes/depois de cada etapa da migração
- Reestruturação em camadas:
  ```
  src/
    db/
      knexfile.ts
      migrations/    (uma por entidade/alteração de schema)
      seeds/         (01_culturas.ts, 02_doencas.ts, 03_estacoes_inmet.ts)
    routes/
    controllers/
    services/        (regra de negócio, sem contato com o DB)
    repositories/     (query via Knex, único ponto de contato com o DB)
    dtos/            (schemas Zod + tipos inferidos, Input/Output por recurso)
  ```
- Execução via `tsx` no dia a dia (`npm run dev`), com script de build (`tsc`) separado
- Middleware de autenticação (verifica JWT, injeta usuário autenticado no `request`)
- Serviço de storage de fotos abstraído; implementação inicial = disco local + rota estática `/uploads`
- Serviço de consulta espacial no `repository` (`ST_DWithin`, `ST_Distance`)
- Integração INMET: client HTTP para `apitempo.inmet.gov.br`, seed de estações do RS, lookup de estação mais próxima com fallback (raio máx. 50km, senão clima indisponível e risco cai só no critério de proximidade)
- Serviço de cálculo de risco (regra configurável via `.env`: `RISCO_RAIO_KM=15`, `RISCO_DIAS=7`, limiares climáticos)
- Geração de `Notificacao` quando um novo `Registro_Doenca` aciona zona de risco para terrenos de outros usuários
- `docker-compose.yml` com imagem `postgis/postgis` (Postgres + extensão PostGIS já incluída), volume persistente
- `.env`/`.env.example` com: connection string do DB, `JWT_SECRET`, `PORT`, `MODEL_PATH`, `PYTHON_CMD` (já existentes) + variáveis novas de risco/INMET

#### Convenção de nomes na fronteira da API

`snake_case` em português, ponta a ponta (banco → DTO → JSON → mobile) — ex: `{ "id_terreno": ..., "senha_hash": ... }` — fiel ao modelo de dados já especificado, sem camada de tradução para `camelCase`.

#### Endpoints

```
POST   /auth/registrar
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /terrenos                              (do usuário autenticado)
POST   /terrenos
GET    /terrenos/:id
PUT    /terrenos/:id
DELETE /terrenos/:id

GET    /culturas                               (catálogo fixo)
GET    /culturas/:id_cultura/doencas            (catálogo por cultura)

POST   /terrenos/:id_terreno/culturas-plantadas
GET    /terrenos/:id_terreno/culturas-plantadas
PUT    /culturas-plantadas/:id                  (ex: encerrar safra)

POST   /registros                              (foto + inferência + salva + dispara risco/notificação)
GET    /registros?lat=&lng=&raio_km=            (feed pro mapa)
GET    /registros/:id

GET    /notificacoes
PATCH  /notificacoes/:id                        (marcar como lida)
```

### Modelo de IA

Sem mudanças de arquitetura nesta atualização — mantém a CNN atual (4 doenças + folha saudável, treinada para soja). A única mudança é que o resultado da inferência passa a ser **persistido** (como `Registro_Doenca`) em vez de descartado após a resposta.

## 4. Critérios de aceite

- [ ] Usuário consegue se cadastrar e fazer login pelo app, recebendo tokens válidos
- [ ] Access token expira em 15min e é renovado automaticamente via refresh token rotativo, sem exigir novo login
- [ ] Usuário consegue cadastrar um terreno com localização (GPS do device) e associar uma cultura plantada a ele
- [ ] Ao tirar/escolher uma foto e rodar a inferência (fluxo já existente), o resultado é salvo como `Registro_Doenca` vinculado ao terreno/cultura/usuário, com a foto persistida em disco e acessível via URL
- [ ] O mapa no app exibe marcadores de `Registro_Doenca` (do próprio usuário e de outros), com foto e resultado ao tocar
- [ ] Um novo `Registro_Doenca` dispara consulta espacial que encontra terrenos de outros usuários dentro de 15km com a mesma doença nos últimos 7 dias, cruza com dado climático da estação INMET mais próxima (com fallback se não houver estação com dado disponível), e gera `Notificacao` para os donos desses terrenos quando a zona é classificada como risco
- [ ] Usuário recebe notificação push (Android) quando uma `Notificacao` é gerada para ele
- [ ] Toda a API roda em TypeScript, organizada em `routes/controllers/services/repositories/dtos`, sem regressão no endpoint `/infer` existente
- [ ] Ambiente local sobe via `docker-compose` (Postgres+PostGIS) + migrations/seeds do Knex aplicáveis do zero

## 5. Ordem de implementação

Cada etapa é testável isoladamente antes de seguir para a próxima:

0. Reestruturar `PhytoraAPI` em camadas + migrar para TypeScript (preservando `/infer` intacto, validado por smoke test manual)
1. Configurar Postgres+PostGIS via Docker Compose + Knex (migrations de todas as entidades, seeds de culturas/doenças/estações INMET)
2. Sistema de contas e autenticação (cadastro, login, refresh rotativo, middleware de auth) + DTOs Zod
3. Migrar o app mobile de Expo Go para dev client (habilita os passos seguintes)
4. CRUD de Terrenos e Culturas Plantadas (API + telas no app)
5. Adaptar o fluxo de inferência existente para persistir `Registro_Doenca` (upload de foto para disco local via storage abstraído)
6. Endpoint de consulta espacial (registros próximos, terrenos em risco)
7. Integração com mapa no app (`react-native-maps`, exibir registros)
8. Integração com a API do INMET + lógica de cálculo de zona de risco
9. Sistema de notificações (geração no backend + `expo-notifications` no app)

## 6. Perguntas em aberto

Nenhuma no momento. Pontos explicitamente adiados para depois (não bloqueiam esta versão): suporte a iOS, deploy em nuvem, logout de todos os dispositivos, storage em S3/R2, modelo de ML para risco.
