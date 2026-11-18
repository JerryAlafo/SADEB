"use server";

import { esperar } from "@/lib/latencia";
import { exigirUtilizador } from "@/lib/auth";
import { fmt } from "@/lib/i18n";
import { obterI18n } from "@/lib/i18n/servidor";
import { ajustarResultado, aprovarEPublicar, executarCalculo, solicitarCorreccao } from "@/lib/servicos";
import type { Resultado } from "@/lib/types";
import { refrescar, tratarErro, txt, type EstadoForm } from "./comum";

const RESULTADOS: Resultado[] = ["seleccionado", "lista_espera", "nao_seleccionado"];

export async function executarCalculoAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await esperar();
  const u = await exigirUtilizador("comissao", "admin");
  const { t } = await obterI18n();
  try {
    const r = await executarCalculo(txt(fd, "bolsaId"), u);
    refrescar();
    return {
      ok: r.rejeitadasPorPrazo
        ? fmt(t.comissao.msgCalculoPrazo, { n: r.classificadas, r: r.rejeitadasPorPrazo })
        : fmt(t.comissao.msgCalculo, { n: r.classificadas }),
    };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function ajustarResultadoAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await esperar();
  const u = await exigirUtilizador("comissao", "admin");
  const { t } = await obterI18n();
  const novo = txt(fd, "resultado") as Resultado;
  if (!RESULTADOS.includes(novo)) return { erro: t.erros.resultadoInvalido };
  try {
    const tipo = await ajustarResultado(txt(fd, "candidaturaId"), novo, txt(fd, "justificacao"), u);
    refrescar();
    return { ok: tipo === "rectificacao" ? t.comissao.msgRectificado : t.comissao.msgAjuste };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function aprovarPublicarAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await esperar();
  const u = await exigirUtilizador("comissao", "admin");
  const { t } = await obterI18n();
  try {
    const r = await aprovarEPublicar(txt(fd, "bolsaId"), u);
    refrescar();
    return { ok: fmt(t.comissao.msgAprovado, { n: r.notificados }) };
  } catch (e) {
    return tratarErro(e);
  }
}

export async function solicitarCorreccaoAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await esperar();
  const u = await exigirUtilizador("comissao", "admin");
  const { t } = await obterI18n();
  const pendencias = txt(fd, "pendencias")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    await solicitarCorreccao(txt(fd, "candidaturaId"), pendencias, u);
    refrescar();
    return { ok: t.comissao.msgCorreccao };
  } catch (e) {
    return tratarErro(e);
  }
}
