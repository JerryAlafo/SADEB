"use server";

import { esperar } from "@/lib/latencia";
import { redirect } from "next/navigation";
import { exigirUtilizador } from "@/lib/auth";
import { transformar } from "@/lib/db";
import { obterI18n } from "@/lib/i18n/servidor";
import { carregarDocumento, guardarDados, iniciarCandidatura, removerDocumento, submeterCandidatura } from "@/lib/servicos";
import { textoMotivo, textoPendencia } from "@/lib/textos";
import type { DadosCandidatura, Notificacao } from "@/lib/types";
import { bool, num, refrescar, tratarErro, txt, type EstadoForm } from "./comum";

export async function iniciarCandidaturaAction(fd: FormData) {
  await esperar();
  const u = await exigirUtilizador("candidato");
  const c = await iniciarCandidatura(txt(fd, "bolsaId"), u);
  refrescar();
  redirect(`/applicant/applications/${c.id}`);
}

function lerDados(fd: FormData): DadosCandidatura {
  return {
    curso: txt(fd, "curso"),
    area: txt(fd, "area"),
    instituicao: txt(fd, "instituicao"),
    anoFrequencia: Math.max(0, Math.round(num(fd, "anoFrequencia"))),
    media: Math.min(20, Math.max(0, num(fd, "media"))),
    rendimentoFamiliar: Math.max(0, num(fd, "rendimentoFamiliar")),
    agregadoFamiliar: Math.max(0, Math.round(num(fd, "agregadoFamiliar"))),
    orfao: bool(fd, "orfao"),
    deficiencia: bool(fd, "deficiencia"),
    actividadesExtra: Math.min(5, Math.max(0, Math.round(num(fd, "actividadesExtra")))),
    distanciaKm: Math.max(0, num(fd, "distanciaKm")),
    motivacao: txt(fd, "motivacao"),
  };
}

export async function guardarCandidaturaAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await esperar();
  const u = await exigirUtilizador("candidato");
  const { t } = await obterI18n();
  const id = txt(fd, "id");
  try {
    await guardarDados(id, u, lerDados(fd));
    if (txt(fd, "intencao") === "submeter") {
      const r = await submeterCandidatura(id, u);
      refrescar();
      if (r.estado === "correcao_solicitada") return { erro: t.candidatura.msgIncompleta, erros: r.pendencias.map((p) => textoPendencia(t, p)) };
      if (r.estado === "rejeitada") return { erro: t.candidatura.msgRejeitada, erros: r.motivos.map((m) => textoMotivo(t, m)) };
      return { ok: t.candidatura.msgSubmetida };
    }
    refrescar();
    return { ok: t.candidatura.msgRascunho };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function carregarDocumentoAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await esperar();
  const u = await exigirUtilizador("candidato");
  const { t } = await obterI18n();
  try {
    const f = fd.get("ficheiro");
    if (!(f instanceof File) || f.size === 0) return { erro: t.erros.seleccioneFicheiro };
    await carregarDocumento(txt(fd, "id"), u, txt(fd, "tipo"), f);
    refrescar();
    return { ok: t.candidatura.msgDocumento };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function removerDocumentoAction(fd: FormData) {
  await esperar();
  const u = await exigirUtilizador("candidato");
  await removerDocumento(txt(fd, "id"), u, txt(fd, "docId"));
  refrescar();
}

export async function marcarNotificacoesLidas() {
  await esperar();
  const u = await exigirUtilizador();
  await transformar<Notificacao>("notificacoes", (regs) => ({
    registos: regs.map((n) => (n.utilizadorId === u.id ? { ...n, lida: true } : n)),
  }));
  refrescar();
}
