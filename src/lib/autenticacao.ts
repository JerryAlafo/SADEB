// ─────────────────────────────────────────────────────────────
// SADEB — Autenticação (mesmo algoritmo do backoffice-regulador, sem OTP)
//  1. login(email, password)        → valida credenciais e cria a sessão (12 h)
//  2. forgotPassword(email)           → envia link de redefinição (resposta sempre genérica)
//  3. resetPassword(token, password)  → altera a palavra-passe e termina as sessões activas
// ─────────────────────────────────────────────────────────────
import { createHash, randomBytes } from "node:crypto";
import { criarSessao, painelDe } from "./auth";
import { actualizar, agora, listar, novoId, remover, transformar } from "./db";
import { enviarEmail } from "./email";
import { fmt, type Dicionario } from "./i18n";
import { gerarHash, validarSenha, verificarSenha } from "./senha";
import { auditar } from "./servicos";
import type { PedidoRecuperacao, Utilizador } from "./types";
import { EMAIL_RE, mascararEmail } from "./validacao";

export const RESET_MINUTOS = 30;

export class ErroAuth extends Error {
  constructor(
    public chave: keyof Dicionario["erros"],
    public params?: Record<string, string | number>,
    public estado = 400,
  ) {
    super(chave);
  }
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

function destinoSeguro(destino: string | undefined, u: Utilizador) {
  return destino && destino.startsWith("/") && !destino.startsWith("//") ? destino : painelDe(u.papel);
}

// ─── 1. Login ────────────────────────────────────────────────
export async function login(email: string, password: string, destino: string | undefined) {
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw new ErroAuth("emailInvalido");
  const u = (await listar<Utilizador>("utilizadores")).find((x) => x.email === e);
  if (!u || !verificarSenha(password, u.passwordHash)) throw new ErroAuth("credenciais", undefined, 401);
  if (!u.activo) throw new ErroAuth("contaInactiva", undefined, 403);
  await criarSessao(u.id);
  await auditar(u.nome, "login");
  return { redirect: destinoSeguro(destino, u) };
}

// ─── 2. Recuperação da palavra-passe ─────────────────────────
export async function pedirRecuperacao(email: string, origem: string, t: Dicionario) {
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw new ErroAuth("emailInvalido");
  const u = (await listar<Utilizador>("utilizadores")).find((x) => x.email === e && x.activo);
  // Resposta sempre igual, exista ou não a conta (não revela e-mails registados)
  if (!u) return;
  const token = randomBytes(32).toString("hex");
  await transformar<PedidoRecuperacao>("recuperacoes", (regs) => ({
    registos: [
      ...regs.filter((r) => r.utilizadorId !== u.id && new Date(r.expiraEm).getTime() > Date.now()),
      { id: novoId(), tokenHash: sha256(token), utilizadorId: u.id, usado: false, expiraEm: new Date(Date.now() + RESET_MINUTOS * 60_000).toISOString(), criadoEm: agora() },
    ],
  }));
  const link = `${origem}/reset-password?token=${token}`;
  await enviarEmail(u.email, t.email.resetAssunto, fmt(t.email.resetCorpo, { nome: u.nome, link, min: RESET_MINUTOS }));
  await auditar(u.nome, "recuperacaoPedida", mascararEmail(u.email));
}

// ─── 3. Redefinição da palavra-passe ─────────────────────────
export async function redefinirSenha(token: string, novaPassword: string) {
  const erros = validarSenha(novaPassword);
  if (erros.length) throw new ErroAuth(erros[0]);
  const pedido = (await listar<PedidoRecuperacao>("recuperacoes")).find((r) => r.tokenHash === sha256(token));
  if (!pedido || pedido.usado || new Date(pedido.expiraEm).getTime() < Date.now()) throw new ErroAuth("linkExpirado", undefined, 410);

  const u = await actualizar<Utilizador>("utilizadores", pedido.utilizadorId, (x) => ({ ...x, passwordHash: gerarHash(novaPassword) }));
  await actualizar<PedidoRecuperacao>("recuperacoes", pedido.id, (r) => ({ ...r, usado: true }));
  // Termina todas as sessões activas do utilizador
  await remover("sessoes", (s) => s.utilizadorId === pedido.utilizadorId);
  if (u) await auditar(u.nome, "senhaRedefinida");
}
