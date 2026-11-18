// ─────────────────────────────────────────────────────────────
// SADEB — Verificação de identidade no registo de candidatos
//
//   1. documento  → OCR do Bilhete de Identidade (Regula Document Reader)
//   2. liveness   → prova de vida no browser (componente <face-liveness>), confirmada no servidor
//   3. facematch  → retrato do documento × selfie do liveness (Regula Face API)
//   4. aprovada   → o registo da conta usa os dados lidos no documento
//
// A verificação está ligada ao browser do candidato por um cookie httpOnly (token aleatório;
// no .txt fica só o sha256). Os dados vêm sempre da Regula, nunca do browser.
// ─────────────────────────────────────────────────────────────
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { cifrar, decifrar, hashToken } from "./cifra";
import { actualizar, agora, listar, novoId, transformar } from "./db";
import { compararRostos, obterLiveness, processarDocumento, SIMULADO, type ResultadoLiveness } from "./regula";
import type { Utilizador, Verificacao } from "./types";
import type { Dicionario } from "./i18n";

export const COOKIE_VERIFICACAO = "sadeb_verificacao";
const DURACAO_MIN = 60;
const MAX_TENTATIVAS = Math.max(1, Number(process.env.REGULA_MAX_TENTATIVAS ?? 5) || 5);
const LIMIAR_FACEMATCH = Number(process.env.REGULA_LIMIAR_FACEMATCH ?? 75) || 75; // similaridade mínima (%)
const EXIGIR_AUTENTICIDADE = process.env.REGULA_EXIGIR_AUTENTICIDADE === "1";
/** Tamanho máximo de cada imagem (base64). O Vercel limita o corpo do pedido a ~4,5 MB. */
const MAX_IMAGEM_B64 = 2_000_000;

export type ChaveErroVerificacao = keyof Dicionario["erros"];

export class ErroVerificacao extends Error {
  constructor(
    public chave: ChaveErroVerificacao,
    public estado = 400,
    public params?: Record<string, string | number>,
  ) {
    super(chave);
  }
}

/** Vista pública: sem tokens nem retrato. */
export function publica(v: Verificacao) {
  return {
    id: v.id,
    estado: v.estado,
    simulado: v.simulado,
    tentativasRestantes: {
      documento: Math.max(0, MAX_TENTATIVAS - v.tentativas.documento),
      liveness: Math.max(0, MAX_TENTATIVAS - v.tentativas.liveness),
      facematch: Math.max(0, MAX_TENTATIVAS - v.tentativas.facematch),
    },
    documento: v.documento && { tipoDocumento: v.documento.tipoDocumento, campos: v.documento.campos, estado: v.documento.estado },
    liveness: v.liveness && { aprovado: v.liveness.aprovado, idadeEstimada: v.liveness.idadeEstimada },
    facematch: v.facematch && { similaridade: Math.round(v.facematch.similaridade * 10) / 10, limiar: v.facematch.limiar, aprovado: v.facematch.aprovado },
    alertas: v.alertas,
    ultimoErro: v.ultimoErro,
    expiraEm: v.expiraEm,
  };
}
export type VerificacaoPublica = ReturnType<typeof publica>;

// ─── Sessão de verificação (cookie) ─────────────────────────

async function tokenDoPedido() {
  return (await cookies()).get(COOKIE_VERIFICACAO)?.value;
}

/** Verificação associada ao browser actual (não expirada), ou undefined. */
export async function verificacaoActual(): Promise<Verificacao | undefined> {
  const token = await tokenDoPedido();
  if (!token) return undefined;
  const h = hashToken(token);
  const v = (await listar<Verificacao>("verificacoes")).find((x) => x.tokenHash === h);
  if (!v || new Date(v.expiraEm).getTime() < Date.now()) return undefined;
  return v;
}

async function exigirVerificacao(): Promise<Verificacao> {
  const v = await verificacaoActual();
  if (!v) throw new ErroVerificacao("verificacaoInexistente", 404);
  if (v.estado === "usada") throw new ErroVerificacao("verificacaoUsada", 409);
  if (v.estado === "reprovada") throw new ErroVerificacao("verificacaoReprovada", 409);
  return v;
}

/** Inicia (ou reinicia) a verificação deste browser. */
export async function iniciar(): Promise<Verificacao> {
  const token = randomBytes(32).toString("hex");
  const ts = agora();
  const expira = new Date(Date.now() + DURACAO_MIN * 60 * 1000);
  const v: Verificacao = {
    id: novoId(),
    tokenHash: hashToken(token),
    estado: "documento",
    simulado: SIMULADO,
    tentativas: { documento: 0, liveness: 0, facematch: 0 },
    alertas: [],
    criadaEm: ts,
    actualizadaEm: ts,
    expiraEm: expira.toISOString(),
  };

  // limpeza: verificações expiradas que nunca deram origem a conta (e o retrato cifrado de qualquer expirada)
  const limite = Date.now() - 24 * 3600 * 1000;
  await transformar<Verificacao>("verificacoes", (regs) => ({
    registos: [
      ...regs
        .filter((r) => r.estado === "usada" || new Date(r.expiraEm).getTime() > limite)
        .map((r) => (r.retratoCifrado && new Date(r.expiraEm).getTime() < Date.now() ? { ...r, retratoCifrado: undefined } : r)),
      v,
    ],
  }));

  (await cookies()).set(COOKIE_VERIFICACAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expira,
  });
  return v;
}

async function gravar(id: string, fn: (v: Verificacao) => Verificacao) {
  const r = await actualizar<Verificacao>("verificacoes", id, (v) => ({ ...fn(v), actualizadaEm: agora() }));
  if (!r) throw new ErroVerificacao("verificacaoInexistente", 404);
  return r;
}

/** Regista uma tentativa falhada; esgotadas as tentativas, a verificação fica reprovada. */
async function falhar(v: Verificacao, etapa: keyof Verificacao["tentativas"], chave: ChaveErroVerificacao, estado = 422, params?: Record<string, string | number>): Promise<never> {
  const n = v.tentativas[etapa] + 1;
  await gravar(v.id, (x) => ({
    ...x,
    tentativas: { ...x.tentativas, [etapa]: n },
    ultimoErro: chave,
    ...(n >= MAX_TENTATIVAS ? { estado: "reprovada" as const, retratoCifrado: undefined } : {}),
  }));
  throw new ErroVerificacao(n >= MAX_TENTATIVAS ? "verificacaoReprovada" : chave, n >= MAX_TENTATIVAS ? 409 : estado, params);
}

function idadeEm(dataNascimento: string) {
  const n = new Date(`${dataNascimento}T12:00:00`);
  if (Number.isNaN(n.getTime())) return undefined;
  const h = new Date();
  let idade = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) idade--;
  return idade;
}

function validarImagem(img: unknown, obrigatoria: boolean): string | undefined {
  if (img == null || img === "") {
    if (obrigatoria) throw new ErroVerificacao("imagemEmFalta");
    return undefined;
  }
  if (typeof img !== "string" || !/^(data:image\/(jpeg|png|webp);base64,)?[A-Za-z0-9+/=\s]+$/.test(img)) throw new ErroVerificacao("imagemInvalida");
  if (img.length > MAX_IMAGEM_B64) throw new ErroVerificacao("imagemGrande");
  return img;
}

// ─── 1. Documento (OCR) ─────────────────────────────────────

export async function processarDocumentoCandidato(frente: unknown, verso: unknown) {
  const v = await exigirVerificacao();
  if (v.estado !== "documento" && v.estado !== "liveness") throw new ErroVerificacao("etapaInvalida", 409);
  if (v.tentativas.documento >= MAX_TENTATIVAS) throw new ErroVerificacao("verificacaoReprovada", 409);
  const f = validarImagem(frente, true)!;
  const b = validarImagem(verso, false);

  const r = await processarDocumento(f, b, v.id);
  const c = r.campos;
  if (!c.numeroDocumento || !c.dataNascimento) return falhar(v, "documento", "ocrIncompleto");
  if (!r.retrato) return falhar(v, "documento", "documentoSemRetrato");
  if (c.dataValidade && /^\d{4}-\d{2}-\d{2}$/.test(c.dataValidade) && c.dataValidade < agora().slice(0, 10)) return falhar(v, "documento", "documentoExpirado");
  if (EXIGIR_AUTENTICIDADE && r.estado.geral === "erro") return falhar(v, "documento", "documentoNaoAutentico");

  const numero = c.numeroDocumento.replace(/\s+/g, "").toUpperCase();
  const jaUsado = (await listar<Utilizador>("utilizadores")).some((u) => (u.bi ?? "").replace(/\s+/g, "").toUpperCase() === numero);
  if (jaUsado) return falhar(v, "documento", "documentoJaRegistado", 409);

  const alertas = new Set(v.alertas.filter((a) => a !== "autenticidadeDuvidosa"));
  if (r.estado.geral === "erro") alertas.add("autenticidadeDuvidosa");

  return publica(
    await gravar(v.id, (x) => ({
      ...x,
      estado: "liveness",
      tentativas: { ...x.tentativas, documento: x.tentativas.documento + 1 },
      documento: { transactionId: r.transactionId, tipoDocumento: r.tipoDocumento, campos: { ...c, numeroDocumento: numero }, estado: r.estado, processadoEm: agora() },
      retratoCifrado: cifrar(r.retrato!),
      // um documento novo invalida liveness/face match anteriores
      liveness: undefined,
      facematch: undefined,
      alertas: [...alertas],
      ultimoErro: undefined,
    })),
  );
}

// ─── 2. Liveness ────────────────────────────────────────────

const RE_TRANSACAO = /^[A-Za-z0-9_-]{1,127}$/;

export async function confirmarLiveness(transactionId: unknown) {
  const v = await exigirVerificacao();
  if (v.estado !== "liveness" && v.estado !== "facematch") throw new ErroVerificacao("etapaInvalida", 409);
  if (typeof transactionId !== "string" || !RE_TRANSACAO.test(transactionId)) {
    if (!(v.simulado && transactionId === undefined)) throw new ErroVerificacao("transacaoInvalida");
  }
  const tx = typeof transactionId === "string" ? transactionId : `sim-${Date.now()}`;

  // uma transacção de liveness só pode servir uma verificação
  const reutilizada = (await listar<Verificacao>("verificacoes")).some((x) => x.id !== v.id && x.liveness?.transactionId === tx);
  if (reutilizada) throw new ErroVerificacao("transacaoReutilizada", 409);

  const r = await obterLiveness(tx);
  if (!r.aprovado) return falhar(v, "liveness", "livenessFalhou");

  const alertas = new Set(v.alertas.filter((a) => a !== "idadeDiscrepante"));
  const idadeDoc = v.documento?.campos.dataNascimento ? idadeEm(v.documento.campos.dataNascimento) : undefined;
  if (r.idadeEstimada != null && idadeDoc != null && Math.abs(r.idadeEstimada - idadeDoc) > 12) alertas.add("idadeDiscrepante");

  await gravar(v.id, (x) => ({
    ...x,
    estado: "facematch",
    tentativas: { ...x.tentativas, liveness: x.tentativas.liveness + 1 },
    liveness: { transactionId: tx, aprovado: true, codigo: r.codigo, idadeEstimada: r.idadeEstimada, em: agora() },
    facematch: undefined,
    alertas: [...alertas],
    ultimoErro: undefined,
  }));
  return { verificacao: publica((await verificacaoActual())!), liveness: r };
}

// ─── 3. Face match ──────────────────────────────────────────

export async function executarFacematch() {
  const v = await exigirVerificacao();
  if (v.estado !== "facematch" || !v.liveness?.aprovado) throw new ErroVerificacao("etapaInvalida", 409);
  if (!v.retratoCifrado) throw new ErroVerificacao("documentoSemRetrato", 409);

  // a selfie é obtida de novo na Face API a partir do transactionId (nunca do browser)
  const live: ResultadoLiveness = v.simulado
    ? { transactionId: v.liveness.transactionId, aprovado: true, codigo: 0 }
    : await obterLiveness(v.liveness.transactionId);
  if (!live.aprovado) return falhar(v, "liveness", "livenessFalhou");

  const r = await compararRostos(decifrar(v.retratoCifrado), live);
  const aprovado = r.codigo === 0 && r.similaridade >= LIMIAR_FACEMATCH;
  const facematch = { similaridade: r.similaridade, limiar: LIMIAR_FACEMATCH, aprovado, transactionId: r.transactionId, em: agora() };

  if (!aprovado) {
    // rosto não corresponde: volta ao liveness (nova selfie) até esgotar as tentativas
    const n = v.tentativas.facematch + 1;
    const esgotou = n >= MAX_TENTATIVAS;
    await gravar(v.id, (x) => ({
      ...x,
      estado: esgotou ? "reprovada" : "liveness",
      tentativas: { ...x.tentativas, facematch: n },
      facematch,
      liveness: undefined,
      ultimoErro: "rostoNaoCorresponde",
      ...(esgotou ? { retratoCifrado: undefined } : {}),
    }));
    throw new ErroVerificacao(esgotou ? "verificacaoReprovada" : "rostoNaoCorresponde", esgotou ? 409 : 422, { similaridade: Math.round(r.similaridade), limiar: LIMIAR_FACEMATCH });
  }

  return publica(
    await gravar(v.id, (x) => ({
      ...x,
      estado: "aprovada",
      tentativas: { ...x.tentativas, facematch: x.tentativas.facematch + 1 },
      facematch,
      retratoCifrado: undefined, // já não é necessário
      ultimoErro: undefined,
    })),
  );
}

// ─── 4. Registo ─────────────────────────────────────────────

/** Verificação aprovada deste browser, pronta a dar origem a uma conta. */
export async function verificacaoAprovada(): Promise<Verificacao | undefined> {
  const v = await verificacaoActual();
  return v?.estado === "aprovada" && v.documento ? v : undefined;
}

export async function marcarUsada(id: string, utilizadorId: string) {
  await gravar(id, (x) => ({ ...x, estado: "usada", utilizadorId }));
  (await cookies()).delete(COOKIE_VERIFICACAO);
}

/** Exigida no registo, salvo SADEB_EXIGIR_VERIFICACAO=0. */
export const VERIFICACAO_OBRIGATORIA = process.env.SADEB_EXIGIR_VERIFICACAO !== "0";
