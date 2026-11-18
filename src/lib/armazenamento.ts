// ─────────────────────────────────────────────────────────────
// SADEB — Armazenamento de ficheiros (DBAT: Data Base As Txt)
//
// Técnica "Txt as Database" de Jerry Alafo (V2 — GitHub Contents API):
// cada colecção é um ficheiro .txt versionado num repositório Git.
//
//   • local  (desenvolvimento) — ficheiros em ./data (ou SADEB_DATA_DIR)
//   • github (Vercel)          — ficheiros no repositório GITHUB_REPO, ramo GITHUB_BRANCH
//
// Diferenças em relação ao documento original, para correr no Vercel sem redeploys:
//   1. Os dados vivem num ramo próprio (por omissão "dados"), separado do código.
//      O vercel.json desliga os deploys desse ramo → escrever dados NÃO dispara deploys.
//   2. A aplicação lê os .txt em tempo de execução pela API (com ETag/304),
//      em vez de depender do conteúdo copiado no build.
//   3. Concorrência entre instâncias: cada escrita envia o sha lido; se outra instância
//      escreveu entretanto (409/422), a operação é repetida sobre a versão nova.
// ─────────────────────────────────────────────────────────────
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface FicheiroTexto {
  conteudo: string;
  /** Versão lida (sha do blob no GitHub; vazio em local). Enviada na escrita seguinte. */
  versao: string;
}

/** Outra instância escreveu o ficheiro entre a leitura e a escrita. */
export class ConflitoVersao extends Error {
  constructor(caminho: string) {
    super(`Conflito de versão em ${caminho}`);
  }
}

interface Driver {
  nome: "local" | "github";
  lerTexto(caminho: string): Promise<FicheiroTexto | null>;
  escreverTexto(caminho: string, conteudo: string, versao: string | null, mensagem: string): Promise<void>;
  /** Vários ficheiros num único commit (usado no seed). */
  escreverVarios(ficheiros: { caminho: string; conteudo: string }[], mensagem: string): Promise<void>;
  lerBinario(caminho: string): Promise<Buffer | null>;
  escreverBinario(caminho: string, dados: Buffer, mensagem: string): Promise<void>;
  remover(caminho: string, mensagem: string): Promise<void>;
}

// ─── Local (fs) ─────────────────────────────────────────────

const DATA_DIR = process.env.SADEB_DATA_DIR ? path.resolve(process.env.SADEB_DATA_DIR) : path.join(process.cwd(), "data");

function local(caminho: string) {
  const abs = path.resolve(DATA_DIR, caminho);
  if (!abs.startsWith(path.resolve(DATA_DIR) + path.sep)) throw new Error(`Caminho inválido: ${caminho}`);
  return abs;
}

async function escreverAtomico(abs: string, dados: string | Buffer) {
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, dados);
  await fs.rename(tmp, abs);
}

const driverLocal: Driver = {
  nome: "local",
  async lerTexto(caminho) {
    try {
      return { conteudo: await fs.readFile(local(caminho), "utf8"), versao: "" };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  },
  async escreverTexto(caminho, conteudo) {
    await escreverAtomico(local(caminho), conteudo);
  },
  async escreverVarios(ficheiros) {
    for (const f of ficheiros) await escreverAtomico(local(f.caminho), f.conteudo);
  },
  async lerBinario(caminho) {
    try {
      return await fs.readFile(local(caminho));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  },
  async escreverBinario(caminho, dados) {
    await escreverAtomico(local(caminho), dados);
  },
  async remover(caminho) {
    await fs.rm(local(caminho), { force: true });
  },
};

// ─── GitHub (Contents API + Git Data API) ───────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const GITHUB_REPO = process.env.GITHUB_REPO ?? ""; // owner/repo
const GITHUB_BRANCH = process.env.GITHUB_BRANCH ?? "dados";
/** Prefixo dos ficheiros dentro do ramo de dados. */
const PREFIXO = (process.env.GITHUB_DATA_PATH ?? "data").replace(/^\/+|\/+$/g, "");
/** Durante este tempo uma leitura repetida não volta à rede (reduz pedidos por página). */
const CACHE_MS = Math.max(0, Number(process.env.SADEB_GITHUB_CACHE_MS ?? 1500) || 0);

/** Base da API (GitHub Enterprise ou testes). */
const API = (process.env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/+$/, "");

type EntradaCache = { conteudo: string; sha: string; etag: string; lidoEm: number };
const gc = globalThis as unknown as { __sadebGhCache?: Map<string, EntradaCache | null>; __sadebRamoOk?: Promise<void> | null };
const cache = (gc.__sadebGhCache ??= new Map());

function caminhoRepo(caminho: string) {
  if (caminho.includes("..")) throw new Error(`Caminho inválido: ${caminho}`);
  return PREFIXO ? `${PREFIXO}/${caminho}` : caminho;
}

function urlConteudo(caminho: string) {
  const p = caminhoRepo(caminho).split("/").map(encodeURIComponent).join("/");
  return `${API}/repos/${GITHUB_REPO}/contents/${p}`;
}

async function gh(url: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sadeb-dbat",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  return res;
}

async function erroGh(res: Response, contexto: string): Promise<never> {
  const corpo = await res.text().catch(() => "");
  throw new Error(`[DBAT/GitHub] ${contexto}: HTTP ${res.status} ${corpo.slice(0, 300)}`);
}

/** Garante que o ramo de dados existe; se não existir, cria-o "órfão" (sem o código da aplicação). */
async function garantirRamo() {
  if (gc.__sadebRamoOk) return gc.__sadebRamoOk;
  gc.__sadebRamoOk = (async () => {
    const r = await gh(`${API}/repos/${GITHUB_REPO}/git/ref/heads/${encodeURIComponent(GITHUB_BRANCH)}`);
    if (r.ok) return;
    if (r.status !== 404) await erroGh(r, "ler ramo de dados");
    const arvore = await gh(`${API}/repos/${GITHUB_REPO}/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        tree: [{ path: "README.md", mode: "100644", type: "blob", content: "# Dados do SADEB\n\nRamo gerido automaticamente (DBAT — Data Base As Txt). Não editar à mão.\n" }],
      }),
    });
    if (!arvore.ok) await erroGh(arvore, "criar árvore inicial");
    const commit = await gh(`${API}/repos/${GITHUB_REPO}/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message: "data: init", tree: (await arvore.json()).sha, parents: [] }),
    });
    if (!commit.ok) await erroGh(commit, "criar commit inicial");
    const ref = await gh(`${API}/repos/${GITHUB_REPO}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${GITHUB_BRANCH}`, sha: (await commit.json()).sha }),
    });
    // 422 = outra instância criou o ramo ao mesmo tempo
    if (!ref.ok && ref.status !== 422) await erroGh(ref, "criar ramo de dados");
  })().catch((e) => {
    gc.__sadebRamoOk = null;
    throw e;
  });
  return gc.__sadebRamoOk;
}

async function lerMeta(caminho: string, revalidar: boolean): Promise<EntradaCache | null> {
  await garantirRamo();
  const emCache = cache.get(caminho);
  if (emCache !== undefined && !revalidar && Date.now() - (emCache?.lidoEm ?? 0) < CACHE_MS) return emCache;

  const headers: Record<string, string> = {};
  if (emCache?.etag) headers["If-None-Match"] = emCache.etag;
  const res = await gh(`${urlConteudo(caminho)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers });
  if (res.status === 304 && emCache) {
    emCache.lidoEm = Date.now();
    return emCache;
  }
  if (res.status === 404) {
    cache.set(caminho, null);
    return null;
  }
  if (!res.ok) await erroGh(res, `ler ${caminho}`);
  const data = (await res.json()) as { sha: string; size: number; content?: string; encoding?: string };
  let conteudo: string;
  if (data.encoding === "base64" && data.content !== undefined && !(data.size > 0 && !data.content)) {
    conteudo = Buffer.from(data.content, "base64").toString("utf8");
  } else {
    // > 1 MB: a API não devolve o conteúdo embutido — pedir em formato raw
    const raw = await gh(`${urlConteudo(caminho)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers: { Accept: "application/vnd.github.raw+json" } });
    if (!raw.ok) await erroGh(raw, `ler (raw) ${caminho}`);
    conteudo = await raw.text();
  }
  const entrada = { conteudo, sha: data.sha, etag: res.headers.get("etag") ?? "", lidoEm: Date.now() };
  cache.set(caminho, entrada);
  return entrada;
}

async function put(caminho: string, base64: string, sha: string | null, mensagem: string) {
  await garantirRamo();
  const res = await gh(urlConteudo(caminho), {
    method: "PUT",
    body: JSON.stringify({ message: mensagem, content: base64, branch: GITHUB_BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (res.status === 409 || res.status === 422) {
    cache.delete(caminho);
    throw new ConflitoVersao(caminho);
  }
  if (!res.ok) await erroGh(res, `escrever ${caminho}`);
  return (await res.json()) as { content: { sha: string } };
}

const driverGithub: Driver = {
  nome: "github",
  async lerTexto(caminho) {
    const m = await lerMeta(caminho, false);
    return m ? { conteudo: m.conteudo, versao: m.sha } : null;
  },
  async escreverTexto(caminho, conteudo, versao, mensagem) {
    const r = await put(caminho, Buffer.from(conteudo, "utf8").toString("base64"), versao, mensagem);
    // read-your-writes nesta instância
    cache.set(caminho, { conteudo, sha: r.content.sha, etag: "", lidoEm: Date.now() });
  },
  async escreverVarios(ficheiros, mensagem) {
    await garantirRamo();
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const ref = await gh(`${API}/repos/${GITHUB_REPO}/git/ref/heads/${encodeURIComponent(GITHUB_BRANCH)}`);
      if (!ref.ok) await erroGh(ref, "ler ramo");
      const pai = (await ref.json()).object.sha as string;
      const commitPai = await gh(`${API}/repos/${GITHUB_REPO}/git/commits/${pai}`);
      if (!commitPai.ok) await erroGh(commitPai, "ler commit");
      const arvoreBase = (await commitPai.json()).tree.sha as string;
      const arvore = await gh(`${API}/repos/${GITHUB_REPO}/git/trees`, {
        method: "POST",
        body: JSON.stringify({
          base_tree: arvoreBase,
          tree: ficheiros.map((f) => ({ path: caminhoRepo(f.caminho), mode: "100644", type: "blob", content: f.conteudo })),
        }),
      });
      if (!arvore.ok) await erroGh(arvore, "criar árvore");
      const commit = await gh(`${API}/repos/${GITHUB_REPO}/git/commits`, {
        method: "POST",
        body: JSON.stringify({ message: mensagem, tree: (await arvore.json()).sha, parents: [pai] }),
      });
      if (!commit.ok) await erroGh(commit, "criar commit");
      const upd = await gh(`${API}/repos/${GITHUB_REPO}/git/refs/heads/${encodeURIComponent(GITHUB_BRANCH)}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: (await commit.json()).sha, force: false }),
      });
      if (upd.ok) {
        for (const f of ficheiros) cache.delete(f.caminho);
        return;
      }
      if (upd.status !== 422) await erroGh(upd, "actualizar ramo");
      // 422: o ramo avançou entretanto — repetir sobre o commit novo
    }
    throw new Error("[DBAT/GitHub] não foi possível gravar o commit (ramo em constante alteração)");
  },
  async lerBinario(caminho) {
    await garantirRamo();
    const res = await gh(`${urlConteudo(caminho)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers: { Accept: "application/vnd.github.raw+json" } });
    if (res.status === 404) return null;
    if (!res.ok) await erroGh(res, `ler ${caminho}`);
    return Buffer.from(await res.arrayBuffer());
  },
  async escreverBinario(caminho, dados, mensagem) {
    const m = await lerMeta(caminho, true);
    await put(caminho, dados.toString("base64"), m?.sha ?? null, mensagem);
    cache.delete(caminho);
  },
  async remover(caminho, mensagem) {
    const m = await lerMeta(caminho, true);
    if (!m) return;
    const res = await gh(urlConteudo(caminho), {
      method: "DELETE",
      body: JSON.stringify({ message: mensagem, sha: m.sha, branch: GITHUB_BRANCH }),
    });
    cache.delete(caminho);
    if (!res.ok && res.status !== 404) await erroGh(res, `remover ${caminho}`);
  },
};

// ─── Selecção do driver ─────────────────────────────────────

const USE_GITHUB = Boolean(GITHUB_TOKEN && GITHUB_REPO);

if (!USE_GITHUB && process.env.VERCEL) {
  console.warn("[DBAT] No Vercel sem GITHUB_TOKEN/GITHUB_REPO: o disco é efémero e os dados perdem-se. Configure o driver GitHub.");
}

export const armazenamento: Driver = USE_GITHUB ? driverGithub : driverLocal;

/** Quando a escrita depende do que foi lido, revalida a leitura (ignora o cache curto). */
export async function lerTextoFresco(caminho: string): Promise<FicheiroTexto | null> {
  if (armazenamento.nome === "local") return armazenamento.lerTexto(caminho);
  const m = await lerMeta(caminho, true);
  return m ? { conteudo: m.conteudo, versao: m.sha } : null;
}

export function descricaoArmazenamento() {
  return USE_GITHUB ? `github:${GITHUB_REPO}@${GITHUB_BRANCH}/${PREFIXO}` : `local:${DATA_DIR}`;
}
