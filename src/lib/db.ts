import { randomUUID } from "node:crypto";
import { armazenamento, ConflitoVersao, lerTextoFresco } from "./armazenamento";

// ─────────────────────────────────────────────────────────────
// Base de dados em ficheiros .txt (JSON Lines: 1 registo por linha)
// Persistência: DBAT — ver src/lib/armazenamento.ts (local ou GitHub).
// ─────────────────────────────────────────────────────────────

export type Coleccao =
  | "utilizadores"
  | "sessoes"
  | "bolsas"
  | "candidaturas"
  | "decisoes"
  | "notificacoes"
  | "auditoria"
  | "recuperacoes"
  | "emails"
  | "verificacoes";

function ficheiro(c: Coleccao) {
  return `${c}.txt`;
}

// Fila de escrita por ficheiro, para que leituras-modificações-escritas
// concorrentes não se sobreponham dentro do mesmo processo.
// Entre processos (várias instâncias no Vercel) a protecção é o controlo de versão (sha).
const g = globalThis as unknown as { __sadebLocks?: Map<string, Promise<unknown>> };
const locks = (g.__sadebLocks ??= new Map());

async function comLock<T>(c: Coleccao, fn: () => Promise<T>): Promise<T> {
  const anterior = locks.get(c) ?? Promise.resolve();
  const actual = anterior.then(fn, fn);
  locks.set(
    c,
    actual.catch(() => undefined),
  );
  return actual;
}

function parse<T>(txt: string): T[] {
  const out: T[] = [];
  for (const linha of txt.split(/\r?\n/)) {
    const l = linha.trim();
    if (!l) continue;
    try {
      out.push(JSON.parse(l) as T);
    } catch {
      // linha corrompida: ignorada para não bloquear o sistema
    }
  }
  return out;
}

function serializar<T>(registos: T[]) {
  return registos.map((r) => JSON.stringify(r)).join("\n") + (registos.length ? "\n" : "");
}

async function lerBruto<T>(c: Coleccao): Promise<T[]> {
  const f = await armazenamento.lerTexto(ficheiro(c));
  return f ? parse<T>(f.conteudo) : [];
}

/**
 * O GitHub aceita um commit de cada vez por ramo: escritas simultâneas (mesmo em ficheiros
 * diferentes) devolvem 409 e têm de ser repetidas. Com espera exponencial + aleatória
 * (até ~4 s por tentativa) o total ronda 25 s antes de desistir.
 */
const MAX_TENTATIVAS = 12;
function espera(i: number) {
  const base = Math.min(4000, 200 * 2 ** i);
  return base / 2 + Math.random() * base;
}

/**
 * Leitura-modificação-escrita com controlo de versão: se outra instância gravou
 * o ficheiro entretanto, repete com os dados novos (fn deve ser repetível).
 */
async function lerModificarEscrever<R>(c: Coleccao, fn: (registos: unknown[]) => Promise<{ registos: unknown[]; resultado?: R }>): Promise<R | undefined> {
  for (let i = 0; ; i++) {
    const f = await lerTextoFresco(ficheiro(c));
    const { registos, resultado } = await fn(f ? parse(f.conteudo) : []);
    try {
      await armazenamento.escreverTexto(ficheiro(c), serializar(registos), f?.versao || null, `data: update data/${ficheiro(c)}`);
      return resultado;
    } catch (e) {
      if (!(e instanceof ConflitoVersao) || i >= MAX_TENTATIVAS - 1) throw e;
      await new Promise((r) => setTimeout(r, espera(i)));
    }
  }
}

export async function listar<T>(c: Coleccao): Promise<T[]> {
  await garantirSeed();
  return lerBruto<T>(c);
}

export async function obter<T extends { id: string }>(c: Coleccao, id: string): Promise<T | undefined> {
  return (await listar<T>(c)).find((r) => r.id === id);
}

/** Acrescenta um registo (append-only). */
export async function inserir<T>(c: Coleccao, registo: T): Promise<T> {
  await garantirSeed();
  return comLock(c, async () => {
    await lerModificarEscrever(c, async (regs) => ({ registos: [...regs, registo] }));
    return registo;
  });
}

/** Lê, transforma e reescreve uma colecção de forma atómica. */
export async function transformar<T, R = void>(
  c: Coleccao,
  fn: (registos: T[]) => { registos: T[]; resultado?: R } | Promise<{ registos: T[]; resultado?: R }>,
): Promise<R | undefined> {
  await garantirSeed();
  return comLock(c, () => lerModificarEscrever<R>(c, async (regs) => fn(regs as T[]) as Promise<{ registos: unknown[]; resultado?: R }>));
}

export async function actualizar<T extends { id: string }>(
  c: Coleccao,
  id: string,
  fn: (r: T) => T,
): Promise<T | undefined> {
  return transformar<T, T>(c, (regs) => {
    let alterado: T | undefined;
    const novos = regs.map((r) => {
      if (r.id !== id) return r;
      alterado = fn(r);
      return alterado;
    });
    return { registos: novos, resultado: alterado };
  });
}

export async function remover(c: Coleccao, predicado: (r: Record<string, unknown>) => boolean) {
  await transformar<Record<string, unknown>>(c, (regs) => ({ registos: regs.filter((r) => !predicado(r)) }));
}

export function novoId() {
  return randomUUID();
}

export function agora() {
  return new Date().toISOString();
}

// ─── Ficheiros carregados (documentos das candidaturas) ─────
// Caminhos relativos a uploads/ (ex.: "<candidaturaId>/<docId>.pdf").

function caminhoUpload(rel: string) {
  if (!/^[\w-]+\/[\w-]+\.[a-z0-9]+$/i.test(rel)) throw new Error(`Caminho de upload inválido: ${rel}`);
  return `uploads/${rel}`;
}

export async function guardarUpload(rel: string, dados: Buffer) {
  await armazenamento.escreverBinario(caminhoUpload(rel), dados, `data: upload ${rel}`);
}

export async function lerUpload(rel: string) {
  return armazenamento.lerBinario(caminhoUpload(rel));
}

export async function removerUpload(rel: string) {
  await armazenamento.remover(caminhoUpload(rel), `data: remove ${rel}`);
}

// ─── Seed (dados iniciais) ──────────────────────────────────
// Verificado a cada acesso: se utilizadores.txt não existir (reset), os dados
// iniciais são recriados sem reiniciar o servidor.
// A promessa só existe enquanto um seed está EM CURSO (nunca fica guardada depois),
// por isso um reset é sempre detectado — mesmo após hot-reload do servidor dev.
const gs = globalThis as unknown as { __sadebSeedEmCurso?: Promise<void> | null };

export type FicheiroSeed = { colecao: Coleccao; registos: unknown[] } | { upload: string; conteudo: string };

async function garantirSeed() {
  if (gs.__sadebSeedEmCurso) return gs.__sadebSeedEmCurso;
  if (await armazenamento.lerTexto(ficheiro("utilizadores"))) return;
  if (gs.__sadebSeedEmCurso) return gs.__sadebSeedEmCurso; // outro pedido já iniciou o seed
  gs.__sadebSeedEmCurso = (async () => {
    // confirmação sem cache: outra instância pode ter acabado de fazer o seed
    if (await lerTextoFresco(ficheiro("utilizadores"))) return;
    const { seed } = await import("./seed");
    const ficheiros = await seed();
    // utilizadores por último: é o ficheiro que indica que o seed já correu
    // (no GitHub vai tudo num único commit, por isso é atómico)
    await armazenamento.escreverVarios(
      ficheiros.map((f) =>
        "colecao" in f ? { caminho: ficheiro(f.colecao), conteudo: serializar(f.registos) } : { caminho: caminhoUpload(f.upload), conteudo: f.conteudo },
      ),
      "data: seed inicial",
    );
  })().finally(() => {
    gs.__sadebSeedEmCurso = null;
  });
  return gs.__sadebSeedEmCurso;
}
