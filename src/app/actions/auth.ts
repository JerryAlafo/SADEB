"use server";

import { esperar } from "@/lib/latencia";
import { redirect } from "next/navigation";
import { criarSessao, exigirUtilizador, terminarSessao } from "@/lib/auth";
import { actualizar, agora, inserir, listar, novoId } from "@/lib/db";
import { obterI18n } from "@/lib/i18n/servidor";
import { gerarHash, validarSenha, verificarSenha } from "@/lib/senha";
import { auditar } from "@/lib/servicos";
import type { Notificacao, Utilizador } from "@/lib/types";
import { EMAIL_RE } from "@/lib/validacao";
import { marcarUsada, VERIFICACAO_OBRIGATORIA, verificacaoAprovada } from "@/lib/verificacao";
import { refrescar, txt, type EstadoForm } from "./comum";


export async function registar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await esperar();
  const { t } = await obterI18n();
  const nome = txt(fd, "nome");
  const email = txt(fd, "email").toLowerCase();
  const telefone = txt(fd, "telefone");

  // Identidade verificada (OCR + liveness + face match): BI e data de nascimento vêm do documento,
  // nunca do formulário. Sem verificação aprovada não há registo (salvo SADEB_EXIGIR_VERIFICACAO=0).
  const verificacao = await verificacaoAprovada();
  if (VERIFICACAO_OBRIGATORIA && !verificacao) return { erro: t.erros.verificacaoNecessaria };
  const doc = verificacao && !verificacao.simulado ? verificacao.documento?.campos : undefined;
  // em modo simulado não há documento real: aceita os valores do formulário
  const bi = doc?.numeroDocumento ?? txt(fd, "bi");
  const dataNascimento = doc?.dataNascimento ?? txt(fd, "dataNascimento");
  const senha = String(fd.get("senha") ?? "");
  const confirmar = String(fd.get("confirmar") ?? "");

  const erros: string[] = [];
  if (nome.length < 3) erros.push(t.erros.nomeCurto);
  if (!EMAIL_RE.test(email)) erros.push(t.erros.emailInvalido);
  if (!dataNascimento) erros.push(t.erros.dataNascimento);
  if (bi.length < 6) erros.push(t.erros.bi);
  erros.push(...validarSenha(senha).map((k) => t.erros[k]));
  if (senha !== confirmar) erros.push(t.erros.senhasDiferentes);
  if (erros.length) return { erros };

  const existentes = await listar<Utilizador>("utilizadores");
  if (existentes.some((u) => u.email === email)) return { erro: t.erros.emailExiste };
  const biNorm = bi.replace(/\s+/g, "").toUpperCase();
  if (existentes.some((u) => (u.bi ?? "").replace(/\s+/g, "").toUpperCase() === biNorm)) return { erro: t.erros.documentoJaRegistado };

  const u: Utilizador = {
    id: novoId(),
    nome,
    email,
    telefone,
    bi,
    dataNascimento,
    papel: "candidato",
    passwordHash: gerarHash(senha),
    activo: true,
    criadoEm: agora(),
    ...(verificacao ? { verificacaoId: verificacao.id, identidadeVerificadaEm: verificacao.actualizadaEm } : {}),
  };
  await inserir("utilizadores", u);
  if (verificacao) await marcarUsada(verificacao.id, u.id);
  await inserir<Notificacao>("notificacoes", {
    id: novoId(),
    utilizadorId: u.id,
    chave: "boasVindas",
    tipo: "sucesso",
    link: "/applicant/scholarships",
    lida: false,
    criadaEm: agora(),
  });
  await auditar(nome, "contaCriada", email);
  await criarSessao(u.id);
  redirect("/applicant");
}

export async function sair() {
  await esperar();
  await terminarSessao();
  redirect("/auth");
}

export async function actualizarPerfil(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await esperar();
  const eu = await exigirUtilizador();
  const { t } = await obterI18n();
  const nome = txt(fd, "nome");
  if (nome.length < 3) return { erro: t.erros.nomeCurto };
  await actualizar<Utilizador>("utilizadores", eu.id, (u) => ({
    ...u,
    nome,
    telefone: txt(fd, "telefone"),
    // dados lidos do documento na verificação de identidade não podem ser alterados
    bi: u.identidadeVerificadaEm ? u.bi : txt(fd, "bi") || u.bi,
    dataNascimento: u.identidadeVerificadaEm ? u.dataNascimento : txt(fd, "dataNascimento") || u.dataNascimento,
  }));
  refrescar();
  return { ok: t.perfil.msgPerfil };
}

export async function alterarSenha(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await esperar();
  const eu = await exigirUtilizador();
  const { t } = await obterI18n();
  const actual = String(fd.get("actual") ?? "");
  const nova = String(fd.get("nova") ?? "");
  const u = (await listar<Utilizador>("utilizadores")).find((x) => x.id === eu.id)!;
  if (!verificarSenha(actual, u.passwordHash)) return { erro: t.erros.senhaActual };
  const erros = validarSenha(nova);
  if (erros.length) return { erros: erros.map((k) => t.erros[k]) };
  await actualizar<Utilizador>("utilizadores", eu.id, (x) => ({ ...x, passwordHash: gerarHash(nova) }));
  await auditar(eu.nome, "senhaAlterada");
  return { ok: t.perfil.msgSenha };
}
