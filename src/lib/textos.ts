// Conversão de registos estruturados (chaves) em texto no idioma actual.
import { fmt, type Dicionario } from "./i18n";
import type { EventoHistorico, Motivo, Notificacao, RegistoAuditoria, Resultado } from "./types";

export function textoPendencia(t: Dicionario, p: string) {
  if (p.startsWith("campo:")) {
    const k = p.slice(6) as keyof Dicionario["pendencia"];
    return t.pendencia[k] ?? p;
  }
  if (p.startsWith("doc:")) return fmt(t.pendencia.documento, { tipo: p.slice(4) });
  return p; // texto livre escrito pela Comissão
}

export function textoMotivo(t: Dicionario, m: Motivo) {
  return fmt(t.motivo[m.chave] ?? m.chave, m.params);
}

export function textoNotificacao(t: Dicionario, n: Notificacao) {
  const tpl = (t.notif as Record<string, { t: string; m: string } | undefined>)[n.chave];
  if (!tpl) return { titulo: n.chave, mensagem: "" };
  // parâmetro "resultado" guardado como chave → texto no idioma actual
  const params = { ...n.params };
  if (typeof params.resultado === "string" && params.resultado in t.resultado) params.resultado = t.resultado[params.resultado as Resultado];
  return { titulo: fmt(tpl.t, params), mensagem: fmt(tpl.m, params) };
}

export function textoEvento(t: Dicionario, e: EventoHistorico) {
  const titulo = (t.evento as Record<string, string>)[e.accao] ?? e.accao;
  const partes: string[] = [];
  if (e.accao === "pontuacaoCalculada" && e.params)
    partes.push(fmt(t.evento.pontuacaoDetalhe, { ...e.params, resultado: t.resultado[e.params.resultado as Resultado] }));
  if ((e.accao === "ajustado" || e.accao === "rectificado") && e.params)
    partes.push(fmt(t.evento.ajusteDetalhe, { de: t.resultado[e.params.de as Resultado], para: t.resultado[e.params.para as Resultado] }));
  if (e.accao === "reposto" && e.params) partes.push(t.resultado[e.params.para as Resultado]);
  if (e.accao === "comunicado" && e.params) partes.push(t.resultado[e.params.resultado as Resultado]);
  if (e.pendencias?.length) partes.push(e.pendencias.map((p) => textoPendencia(t, p)).join("; "));
  if (e.motivos?.length) partes.push(e.motivos.map((m) => textoMotivo(t, m)).join(" "));
  if (e.detalhe) partes.push(e.detalhe);
  return { titulo, detalhe: partes.join(" · ") };
}

export function textoAuditoria(t: Dicionario, r: RegistoAuditoria) {
  return (t.auditoria as Record<string, string>)[r.accao] ?? r.accao;
}

export function textoPor(t: Dicionario, por: string) {
  return por === "Sistema" ? t.comissao.sistema : por;
}
