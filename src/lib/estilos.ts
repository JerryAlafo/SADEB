import { fmt, type Dicionario, type Formatadores } from "./i18n";
import { prazoEncerrado } from "./motor";
import type { Bolsa, EstadoBolsa, EstadoCandidatura, Resultado } from "./types";

export type Tom = "neutro" | "primario" | "sucesso" | "aviso" | "perigo" | "info" | "destaque";

export const TOM_ESTADO_CAND: Record<EstadoCandidatura, Tom> = {
  rascunho: "neutro",
  correcao_solicitada: "aviso",
  elegivel: "info",
  rejeitada: "perigo",
  classificada: "destaque",
  decidida: "sucesso",
};

export const TOM_RESULTADO: Record<Resultado | "rejeitada", Tom> = {
  seleccionado: "sucesso",
  lista_espera: "aviso",
  nao_seleccionado: "neutro",
  rejeitada: "perigo",
};

export const TOM_ESTADO_BOLSA: Record<EstadoBolsa, Tom> = {
  rascunho: "neutro",
  aberta: "sucesso",
  em_avaliacao: "destaque",
  concluida: "primario",
};

/** Próximo passo do fluxo para um concurso (visão da Comissão). */
export function proximaAccao(b: Bolsa, t: Dicionario, f: Formatadores) {
  if (b.estado === "rascunho") return { texto: t.comissao.proxRascunho, urgente: false };
  if (b.estado === "aberta" && !prazoEncerrado(b)) return { texto: fmt(t.comissao.proxAberta, { data: f.data(b.dataEncerramento) }), urgente: false };
  if (b.estado === "aberta") return { texto: t.comissao.proxCalcular, urgente: true };
  if (b.estado === "em_avaliacao") return { texto: t.comissao.proxDecidir, urgente: true };
  return { texto: `${t.comissao.proxConcluida}${b.publicadoEm ? ` · ${f.data(b.publicadoEm)}` : ""}`, urgente: false };
}
