# SADEB — Sistema de Avaliação de Elegibilidade de Bolsas

Sistema de Suporte à Decisão (SSD) para análise de elegibilidade, cálculo automático da pontuação e classificação de candidatos a bolsas de estudo.
Escola Superior de Ciências Náuticas — Departamento de Rádio · Cadeira de Sistemas de Suporte à Decisão.

**Stack:** Next.js 16 (App Router, Server Actions, Proxy) · React 19 · TypeScript · Tailwind CSS 4 · lucide-react · base de dados em ficheiros `.txt`.

**Interface:** modo claro/escuro, Português/Inglês, inputs com label flutuante (mesmo padrão dos backoffices), sidebar recolhível.

## Executar

```bash
npm install
npm run dev          # http://localhost:3000
# produção
npm run build && npm start
# repor a base de dados (é recriada com os dados iniciais no próximo acesso, sem reiniciar o servidor)
npm run reset-dados
# tempo de espera simulado em todos os pedidos (por omissão 2000 ms; 0 desliga)
SADEB_LATENCIA_MS=0 npm run dev
```

### Contas iniciais (criadas no primeiro arranque)

Não aparecem na interface — servem apenas para o primeiro acesso. Altere as palavras-passe em produção.

| Perfil | Email | Palavra-passe |
| --- | --- | --- |
| Candidato | candidato@sadeb.ac.mz | Candidato@123 |
| Comissão de Bolsas | comissao@sadeb.ac.mz | Comissao@123 |
| Administrador | admin@sadeb.ac.mz | Admin@123 |

Há também 10 candidatos fictícios (`nome.apelido@estudante.ac.mz`, palavra-passe `Candidato@123`) com candidaturas a uma bolsa cujo prazo já terminou, prontas para o cálculo automático.

## Fluxo (segue o fluxograma do trabalho)

| Fase | Actor | O que acontece no SADEB |
| --- | --- | --- |
| 1. Receção | Candidato → Sistema | Criação de conta → escolha da bolsa → rascunho → dados + documentos → **submeter**. O sistema regista e verifica a completude e o prazo. Se faltar algo: **correcção solicitada** (notificação) → o candidato corrige e reenvia. |
| 2. Elegibilidade | Sistema | Verificação automática dos requisitos mínimos (média, rendimento per capita, área, idade). Não cumpre → **rejeitada** e comunicada. Cumpre → **elegível**. |
| 3. Cálculo e classificação | Sistema | Após o prazo, a Comissão executa o cálculo: critérios × pesos → pontuação 0–100 → ordem decrescente de mérito → atribuição automática (seleccionado / lista de espera / não seleccionado). Candidaturas não corrigidas a tempo são rejeitadas. Durante o prazo há uma classificação provisória. |
| 4. Decisão | Comissão de Bolsas | Aprova o resultado do sistema ou **ajusta** posições com justificação obrigatória. O sistema impede aprovar com mais seleccionados do que vagas. |
| 5. Comunicação | Sistema → Saída | Regista a decisão no histórico (resultado do sistema + decisão final + justificação), envia a comunicação oficial a cada candidato e fecha a bolsa. Relatório exportável em CSV. |

O **Administrador** configura as bolsas (período, vagas, documentos obrigatórios, requisitos mínimos, critérios e pesos — a soma tem de ser 100%) e gere utilizadores. Depois de avaliada, a configuração da bolsa fica bloqueada para garantir rastreabilidade.

### Fórmula de pontuação

Para cada critério: valor normalizado para 0–100 entre `mín` e `máx` (invertido em “menor é melhor”; Sim/Não = 100/0).
`Pontuação = Σ (normalizado × peso) / Σ pesos`. Desempate: maior média, depois submissão mais antiga.

## Base de dados — DBAT (Data Base As Txt)

Cada colecção é um ficheiro `.txt` com **um registo JSON por linha**: `utilizadores.txt`, `sessoes.txt`, `bolsas.txt`, `candidaturas.txt`, `decisoes.txt`, `notificacoes.txt`, `auditoria.txt`, `verificacoes.txt`. Os documentos carregados ficam em `uploads/`.

A persistência segue a técnica *Txt as Database* de Jerry Alafo (V2, GitHub Contents API) e tem dois drivers (`src/lib/armazenamento.ts`):

| Driver | Quando | Onde ficam os dados |
| --- | --- | --- |
| `local` | sem `GITHUB_TOKEN`/`GITHUB_REPO` (desenvolvimento) | `./data` (ou `SADEB_DATA_DIR`); escritas atómicas (temporário + rename) |
| `github` | com `GITHUB_TOKEN` + `GITHUB_REPO` (Vercel) | ramo `GITHUB_BRANCH` (por omissão `dados`), pasta `data/`; cada escrita é um commit `data: update data/<colecção>.txt` |

Diferenças em relação ao documento original, para funcionar no Vercel:

- **Sem redeploy por escrita.** Os dados vivem num ramo órfão próprio (`dados`, criado automaticamente), e o `vercel.json` desliga os deploys desse ramo. A aplicação lê os `.txt` em tempo de execução pela API, com ETag/304 e um cache curto (`SADEB_GITHUB_CACHE_MS`).
- **Concorrência entre instâncias.** Cada escrita envia o `sha` lido. Se outra instância gravou entretanto (409/422), a operação é repetida sobre a versão nova. Dentro de cada instância há também uma fila por ficheiro.
- **Seed num único commit** (Git Data API), por isso é atómico.

Limites práticos: cerca de 5000 pedidos/h à API e um limite de criação de conteúdo da ordem de 80 commits/min. Os ficheiros acima de 1 MB são lidos em modo *raw*. Serve para protótipos e volumes de uma escola, não para tráfego alto.

As palavras-passe são guardadas com hash `scrypt` + salt; as sessões usam um cookie `httpOnly`.

Os registos gerados pelo sistema (histórico, notificações, motivos de rejeição, auditoria) são guardados como **chaves + parâmetros** e traduzidos no momento da apresentação — por isso aparecem no idioma escolhido por cada utilizador.

## Rotas

| Rota | Acesso | Ecrã |
| --- | --- | --- |
| `/` | público | Portal: concursos abertos e processo |
| `/scholarships/[id]` | público | Detalhe do concurso |
| `/auth` · `/register` · `/forgot-password` · `/reset-password` | só anónimos | Login, registo, recuperação de palavra-passe |
| `/applicant` · `/applicant/scholarships` · `/applicant/applications/[id]` | candidato | Painel, concursos, candidaturas |
| `/committee` · `/committee/scholarships/[id]` · `/committee/applications/[id]` · `/committee/history` | comissão, admin | Avaliação, decisão, histórico |
| `/admin` · `/admin/scholarships` · `/admin/users` · `/admin/audit` | admin | Concursos/critérios, utilizadores, auditoria |
| `/profile` · `/notifications` | autenticado | Perfil e notificações |
| `/access-denied` | — | 403 (mostrado pelo proxy) |
| `/api/auth/login` · `/api/auth/forgot-password` · `/api/auth/reset-password` | público | API de autenticação |
| `/api/documents/[id]` · `/api/reports` | autenticado / comissão | Documentos e exportação CSV |
| `/api/verificacao/**` | público (ligado ao browser por cookie) | Verificação de identidade no registo |

## Verificação de identidade no registo (Regula Forensics)

O registo de candidato exige **OCR do documento, prova de vida (liveness) e comparação facial**. A conta só é criada com uma verificação aprovada, e o **n.º do BI e a data de nascimento vêm do documento** (o servidor ignora o que vier no formulário). Um documento só pode estar associado a uma conta.

| Passo | API SADEB | Serviço Regula |
| --- | --- | --- |
| 0. Iniciar | `POST /api/verificacao` → cookie `httpOnly` `sadeb_verificacao` (1 h) | — |
| 1. Documento | `POST /api/verificacao/documento` `{ frente, verso? }` (base64/data URI) | Document Reader `POST /api/process` (`FullProcess`): campos, estado de autenticidade, retrato |
| 2. Liveness | o browser usa `<face-liveness>` (`@regulaforensics/vp-frontend-face-components`) e envia `POST /api/verificacao/liveness` `{ transactionId }` | Face API `GET /api/v2/liveness?transactionId=` (o resultado é sempre lido no servidor) |
| 3. Face match | `POST /api/verificacao/facematch` | Face API `POST /api/match` (retrato do documento × selfie do liveness) |
| Estado | `GET /api/verificacao` · `GET /api/verificacao/config` | — |

Regras: documento fora da validade é recusado. Sem n.º/data de nascimento ou sem retrato, o candidato tem de repetir a fotografia. A semelhança mínima é `REGULA_LIMIAR_FACEMATCH` (75%). As tentativas estão limitadas (`REGULA_MAX_TENTATIVAS`). Uma transacção de liveness não pode ser reutilizada. Os **alertas** registados, que não bloqueiam, são: autenticidade duvidosa (`REGULA_EXIGIR_AUTENTICIDADE=1` passa a bloquear) e idade estimada muito diferente da data de nascimento.

Privacidade: o retrato do documento só fica guardado **cifrado** (AES-256-GCM, `SADEB_CHAVE_CIFRA`) entre o OCR e o face match, e é apagado a seguir. No `.txt` fica só o sha256 do token da verificação.

**Modo simulado:** sem `REGULA_*_URL` em desenvolvimento (ou com `REGULA_SIMULADO=1`) as respostas são fictícias, e a interface mostra um aviso. Em produção só é activado explicitamente.

Respostas no formato `{ success, code, message, data }`. Erros: 400 dados inválidos, 404 sem verificação, 409 etapa/tentativas/duplicado, 422 falha de OCR/liveness/face match, 502/503 serviço Regula.

## Deploy no Vercel

1. **Tornar o repositório GitHub privado.** O ramo `dados` vai ter nomes, n.º de BI, datas de nascimento e documentos dos candidatos, e o histórico do Git é permanente.
2. Criar um *fine-grained token* só para este repositório, com **Contents: Read and write**.
3. No Vercel, importar o repositório e definir as variáveis de [`.env.example`](.env.example). As mínimas são `GITHUB_TOKEN`, `GITHUB_REPO`, `SADEB_CHAVE_CIFRA`, `SADEB_SEED_DEMO=0`, `SADEB_ADMIN_SENHA`, `SADEB_LATENCIA_MS=0`, `REGULA_DOCREADER_URL` e `REGULA_FACEAPI_URL`.
4. Os serviços Regula (`regulaforensics/docreader`, porta 8080; `regulaforensics/face-api`, porta 41101) têm de estar acessíveis por **HTTPS** a partir do Vercel e do browser, com licença válida. A Face API tem de aceitar CORS do domínio do SADEB.
5. O Vercel limita o corpo de cada pedido a ~4,5 MB. As fotografias do documento são reduzidas no browser (≤ 1800 px, JPEG) e os documentos das candidaturas devem ficar abaixo desse valor.

## Autenticação (fluxo do backoffice-regulador)

1. **Credenciais** — validação no cliente (e-mail; palavra-passe com ≥ 8 caracteres, maiúscula, número e carácter especial) → `POST /api/auth/login` → sessão criada (cookie `httpOnly`, 12 h) → redirecciona para o painel do perfil (ou para `?redirect=`).
2. **Recuperação** — `/forgot-password` → `POST /api/auth/forgot-password` envia um link (válido 30 min); `/reset-password?token=…` → `POST /api/auth/reset-password` altera a palavra-passe e termina todas as sessões.

As respostas seguem o formato da API do backoffice: `{ success, message, data }`. Sem servidor SMTP, o e-mail de recuperação é registado em `data/emails.txt` e escrito no terminal do `npm run dev`.

## Controlo de acesso — `src/proxy.ts` (o antigo `middleware.ts`)

No Next.js 16 o `middleware.ts` passou a chamar-se **`proxy.ts`** (mesma função) e tem de ficar ao lado da pasta `app/` — neste projecto em **`src/proxy.ts`**. Corre antes de cada pedido:

| Situação | Resposta |
| --- | --- |
| Sem sessão numa rota protegida | Página → `/auth?redirect=…` · API → `401` JSON; cookie inválido é removido |
| Perfil sem permissão (ex.: candidato em `/admin`) | Página → `/access-denied` com **HTTP 403** · API → `403` JSON |
| Sessão activa em `/auth`, `/register`, `/forgot-password`, `/reset-password` | Redirecciona para o painel do perfil |

As páginas, server actions e rotas `/api` voltam a validar a permissão (defesa em profundidade).

## Carregamento e confirmações

- Todas as páginas, server actions e rotas `/api` esperam `SADEB_LATENCIA_MS` (2 s por omissão — `src/lib/latencia.ts`). Durante a espera aparece um spinner: `loading.tsx` nas navegações e no próprio botão nas acções.
- As confirmações usam um modal próprio (`src/components/modal.tsx`) — sem `window.confirm`/`alert`.

## Preferências

- **Idioma** (`sadeb_idioma`: `pt`/`en`) — dicionários em `src/lib/i18n/pt.ts` e `en.ts` (o TypeScript garante que têm as mesmas chaves).
- **Tema** (`sadeb_tema`: `light`/`dark`) — aplicado no servidor; sem preferência, segue o sistema operativo.
- **Menu recolhido** (`sadeb_sidebar`).

## Estrutura

```
src/lib/
  types.ts       modelos de dados
  db.ts          acesso aos ficheiros .txt (subsistema de dados)
  motor.ts       regras de elegibilidade, pontuação e classificação (subsistema de modelos)
  servicos.ts    fluxos de negócio das 5 fases
  auth.ts        sessões e controlo de acesso por papel
  i18n/          dicionários PT/EN e formatação de datas/valores
  textos.ts      tradução de registos (eventos, notificações, motivos)
  estilos.ts     tons de cor por estado
  seed.ts        dados iniciais
src/proxy.ts     controlo de acesso às telas autenticadas (antigo middleware.ts)
src/components/
  campos.tsx     inputs com label flutuante (texto, select, textarea, senha, checkbox, ficheiro)
  shell.tsx      sidebar + topbar (idioma, tema, notificações, menu do utilizador)
  ui.tsx         cartões, distintivos, avisos, indicadores
src/app/
  actions/       server actions (auth, candidato, comissao, admin)
  candidato/     área do candidato
  comissao/      avaliação, classificação, decisão, histórico
  admin/         bolsas, critérios, utilizadores, auditoria
  api/           download de documentos, exportação CSV
```
