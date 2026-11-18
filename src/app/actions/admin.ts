"use server";

import { esperar } from "@/lib/latencia";
import { redirect } from "next/navigation";
import { exigirUtilizador } from "@/lib/auth";
import { actualizar, agora, inserir, listar, novoId, obter } from "@/lib/db";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { CAMPOS, validarCriterios } from "@/lib/motor";
import { gerarHash, validarSenha } from "@/lib/senha";
import { auditar } from "@/lib/servicos";
import type { Bolsa, CampoCriterio, Criterio, EstadoBolsa, Papel, SentidoCriterio, Utilizador } from "@/lib/types";
import { num, refrescar, txt, type EstadoForm } from "./comum";

const SENTIDOS: SentidoCriterio[] = ["maior_melhor", "menor_melhor", "booleano"];
const PAPEIS: Papel[] = ["candidato", "comissao", "admin"];

function lerCriterios(json: string): Criterio[] {
  try {
    const arr = JSON.parse(json) as Partial<Criterio>[];
    return arr.map((c) => ({
      id: c.id || novoId(),
      nome: String(c.nome ?? "").trim(),
      campo: (CAMPOS.includes(c.campo as CampoCriterio) ? c.campo : "media") as CampoCriterio,
      sentido: (SENTIDOS.includes(c.sentido as SentidoCriterio) ? c.sentido : "maior_melhor") as SentidoCriterio,
      peso: Number(c.peso) || 0,
      min: Number(c.min) || 0,
      max: Number(c.max) || 0,
    }));
  } catch {
    return [];
  }
}

export async function guardarBolsaAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await esperar();
  const u = await exigirUtilizador("admin");
  const { t } = await obterI18n();
  const id = txt(fd, "id");
  const criterios = lerCriterios(txt(fd, "criterios"));
  const documentos = txt(fd, "documentos")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const dados = {
    titulo: txt(fd, "titulo"),
    descricao: txt(fd, "descricao"),
    entidade: txt(fd, "entidade"),
    anoLectivo: txt(fd, "anoLectivo"),
    vagas: Math.round(num(fd, "vagas")),
    vagasListaEspera: Math.max(0, Math.round(num(fd, "vagasListaEspera"))),
    dataAbertura: txt(fd, "dataAbertura"),
    dataEncerramento: txt(fd, "dataEncerramento"),
    documentosObrigatorios: [...new Set(documentos)],
    requisitos: {
      mediaMinima: num(fd, "mediaMinima"),
      rendimentoPerCapitaMax: Math.max(0, num(fd, "rendimentoPerCapitaMax")),
      idadeMaxima: Math.max(0, Math.round(num(fd, "idadeMaxima"))),
      areasElegiveis: fd.getAll("areas").map(String),
    },
    criterios,
  };

  const erros: string[] = [];
  if (dados.titulo.length < 5) erros.push(t.erros.tituloCurto);
  if (dados.vagas < 1) erros.push(t.erros.vagasMin);
  if (!dados.dataAbertura || !dados.dataEncerramento) erros.push(t.erros.datas);
  else if (dados.dataEncerramento < dados.dataAbertura) erros.push(t.erros.datasOrdem);
  if (!documentos.length) erros.push(t.erros.documentosMin);
  if (dados.requisitos.mediaMinima < 0 || dados.requisitos.mediaMinima > 20) erros.push(t.erros.mediaIntervalo);
  erros.push(...validarCriterios(criterios).map(([k, p]) => fmt(t.erros[k as keyof typeof t.erros], p)));
  if (erros.length) return { erros: [...new Set(erros)] };

  if (id) {
    const b = await obter<Bolsa>("bolsas", id);
    if (!b) return { erro: t.erros.bolsaNaoEncontrada };
    if (b.estado === "em_avaliacao" || b.estado === "concluida") return { erro: t.erros.bolsaBloqueada };
    await actualizar<Bolsa>("bolsas", id, (x) => ({ ...x, ...dados, actualizadoEm: agora() }));
    await auditar(u.nome, "bolsaActualizada", dados.titulo);
    refrescar();
    return { ok: t.admin.msgActualizada };
  }

  const estado: EstadoBolsa = txt(fd, "estado") === "aberta" ? "aberta" : "rascunho";
  const nova: Bolsa = { id: novoId(), ...dados, estado, criadoEm: agora(), actualizadoEm: agora() };
  await inserir("bolsas", nova);
  await auditar(u.nome, "bolsaCriada", nova.titulo);
  refrescar();
  redirect(`/admin/scholarships/${nova.id}`);
}

export async function alterarEstadoBolsaAction(fd: FormData) {
  await esperar();
  const u = await exigirUtilizador("admin");
  const id = txt(fd, "id");
  const estado = txt(fd, "estado") as EstadoBolsa;
  if (estado !== "aberta" && estado !== "rascunho") return;
  const b = await actualizar<Bolsa>("bolsas", id, (x) => (x.estado === "rascunho" || x.estado === "aberta" ? { ...x, estado, actualizadoEm: agora() } : x));
  if (b) await auditar(u.nome, estado === "aberta" ? "bolsaPublicada" : "bolsaRetirada", b.titulo);
  refrescar();
}

export async function criarUtilizadorAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await esperar();
  const u = await exigirUtilizador("admin");
  const { t } = await obterI18n();
  const nome = txt(fd, "nome");
  const email = txt(fd, "email").toLowerCase();
  const papel = txt(fd, "papel") as Papel;
  const senha = String(fd.get("senha") ?? "");
  const erros: string[] = [];
  if (nome.length < 3) erros.push(t.erros.nomeCurto);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.push(t.erros.emailInvalido);
  if (!PAPEIS.includes(papel)) erros.push(t.erros.papelInvalido);
  erros.push(...validarSenha(senha).map((k) => t.erros[k]));
  if (erros.length) return { erros };
  if ((await listar<Utilizador>("utilizadores")).some((x) => x.email === email)) return { erro: t.erros.emailExiste };
  await inserir<Utilizador>("utilizadores", { id: novoId(), nome, email, papel, passwordHash: gerarHash(senha), activo: true, criadoEm: agora() });
  await auditar(u.nome, "utilizadorCriado", email, papel);
  refrescar();
  return { ok: fmt(t.admin.msgUtilizador, { nome }) };
}

export async function alternarActivoAction(fd: FormData) {
  await esperar();
  const u = await exigirUtilizador("admin");
  const id = txt(fd, "id");
  if (id === u.id) return;
  const alvo = await actualizar<Utilizador>("utilizadores", id, (x) => ({ ...x, activo: !x.activo }));
  if (alvo) await auditar(u.nome, alvo.activo ? "utilizadorActivado" : "utilizadorDesactivado", alvo.email);
  refrescar();
}

export async function alterarPapelAction(fd: FormData) {
  await esperar();
  const u = await exigirUtilizador("admin");
  const id = txt(fd, "id");
  const papel = txt(fd, "papel") as Papel;
  if (id === u.id || !PAPEIS.includes(papel)) return;
  const alvo = await actualizar<Utilizador>("utilizadores", id, (x) => ({ ...x, papel }));
  if (alvo) await auditar(u.nome, "papelAlterado", alvo.email, papel);
  refrescar();
}
