// ─────────────────────────────────────────────────────────────
// SADEB — Fluxos de negócio (implementam o fluxograma)
// ─────────────────────────────────────────────────────────────
import path from "node:path";
import { agora, actualizar, guardarUpload, inserir, listar, novoId, obter, removerUpload, transformar } from "./db";
import { classificar, dentroDoPrazo, prazoEncerrado, verificarCompletude, verificarRequisitos } from "./motor";
import type {
  Bolsa,
  Candidatura,
  DadosCandidatura,
  Decisao,
  Documento,
  EventoHistorico,
  Notificacao,
  RegistoAuditoria,
  Resultado,
  Utilizador,
} from "./types";
import type { UtilizadorPublico } from "./auth";
import type { Dicionario } from "./i18n";

type Params = Record<string, string | number>;

/** Erro de regra de negócio: a chave corresponde a t.erros. */
export class ErroNegocio extends Error {
  constructor(
    public chave: keyof Dicionario["erros"],
    public params?: Params,
  ) {
    super(chave);
  }
}

const SISTEMA = "Sistema";

// ─── utilitários ─────────────────────────────────────────────
export async function auditar(utilizador: string, accao: keyof Dicionario["auditoria"], alvo?: string, detalhe?: string) {
  await inserir<RegistoAuditoria>("auditoria", { id: novoId(), em: agora(), utilizador, accao, alvo, detalhe });
}

export async function notificar(utilizadorId: string, chave: keyof Dicionario["notif"], params: Params, tipo: Notificacao["tipo"], link?: string) {
  await inserir<Notificacao>("notificacoes", { id: novoId(), utilizadorId, chave, params, tipo, link, lida: false, criadaEm: agora() });
}

function evento(por: string, accao: keyof Dicionario["evento"], extra: Partial<EventoHistorico> = {}): EventoHistorico {
  return { em: agora(), por, accao, ...extra };
}

async function bolsaOuErro(id: string) {
  const b = await obter<Bolsa>("bolsas", id);
  if (!b) throw new ErroNegocio("bolsaNaoEncontrada");
  return b;
}

async function candidaturaOuErro(id: string) {
  const c = await obter<Candidatura>("candidaturas", id);
  if (!c) throw new ErroNegocio("candidaturaNaoEncontrada");
  return c;
}

function dadosVazios(): DadosCandidatura {
  return {
    curso: "",
    area: "",
    instituicao: "",
    anoFrequencia: 1,
    media: 0,
    rendimentoFamiliar: 0,
    agregadoFamiliar: 1,
    orfao: false,
    deficiencia: false,
    actividadesExtra: 0,
    distanciaKm: 0,
    motivacao: "",
  };
}

const EDITAVEL: Candidatura["estado"][] = ["rascunho", "correcao_solicitada"];

// ─── FASE 1 — Receção da candidatura ─────────────────────────
export async function iniciarCandidatura(bolsaId: string, u: UtilizadorPublico) {
  const bolsa = await bolsaOuErro(bolsaId);
  if (bolsa.estado !== "aberta" || !dentroDoPrazo(bolsa)) throw new ErroNegocio("naoRecebe");

  const existente = (await listar<Candidatura>("candidaturas")).find((c) => c.bolsaId === bolsaId && c.utilizadorId === u.id);
  if (existente) return existente;

  return (await transformar<Candidatura, Candidatura>("candidaturas", (regs) => {
    const prefixo = `SADEB-${new Date().getFullYear()}-`;
    const maior = regs
      .filter((c) => c.codigo.startsWith(prefixo))
      .reduce((m, c) => Math.max(m, Number(c.codigo.slice(prefixo.length)) || 0), 0);
    const nova: Candidatura = {
      id: novoId(),
      codigo: `${prefixo}${String(maior + 1).padStart(4, "0")}`,
      bolsaId,
      utilizadorId: u.id,
      dados: dadosVazios(),
      documentos: [],
      estado: "rascunho",
      pendencias: [],
      historico: [evento(u.nome, "iniciada")],
      criadaEm: agora(),
      actualizadaEm: agora(),
    };
    return { registos: [...regs, nova], resultado: nova };
  }))!;
}

function garantirDono(c: Candidatura, u: UtilizadorPublico) {
  if (c.utilizadorId !== u.id) throw new ErroNegocio("semPermissao");
  if (!EDITAVEL.includes(c.estado)) throw new ErroNegocio("jaSubmetida");
}

export async function guardarDados(candId: string, u: UtilizadorPublico, dados: DadosCandidatura) {
  const c = await candidaturaOuErro(candId);
  garantirDono(c, u);
  await actualizar<Candidatura>("candidaturas", candId, (x) => ({ ...x, dados, actualizadaEm: agora() }));
}

export const EXT_PERMITIDAS = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".doc", ".docx"];

export async function carregarDocumento(candId: string, u: UtilizadorPublico, tipo: string, ficheiro: File) {
  const c = await candidaturaOuErro(candId);
  garantirDono(c, u);
  const bolsa = await bolsaOuErro(c.bolsaId);
  if (!bolsa.documentosObrigatorios.includes(tipo)) throw new ErroNegocio("tipoDocumento");
  if (!ficheiro || ficheiro.size === 0) throw new ErroNegocio("seleccioneFicheiro");
  if (ficheiro.size > 8 * 1024 * 1024) throw new ErroNegocio("ficheiroGrande");
  const ext = path.extname(ficheiro.name).toLowerCase();
  if (!EXT_PERMITIDAS.includes(ext)) throw new ErroNegocio("formato", { lista: EXT_PERMITIDAS.join(", ") });

  const docId = novoId();
  const rel = `${candId}/${docId}${ext}`;
  await guardarUpload(rel, Buffer.from(await ficheiro.arrayBuffer()));

  const doc: Documento = { id: docId, tipo, nomeOriginal: path.basename(ficheiro.name), ficheiro: rel, tamanho: ficheiro.size, carregadoEm: agora() };
  let antigo: Documento | undefined;
  await actualizar<Candidatura>("candidaturas", candId, (x) => {
    antigo = x.documentos.find((d) => d.tipo === tipo);
    return {
      ...x,
      documentos: [...x.documentos.filter((d) => d.tipo !== tipo), doc],
      historico: [...x.historico, evento(u.nome, "documentoAnexado", { detalhe: `${tipo} — ${doc.nomeOriginal}` })],
      actualizadaEm: agora(),
    };
  });
  if (antigo) await removerUpload(antigo.ficheiro);
}

export async function removerDocumento(candId: string, u: UtilizadorPublico, docId: string) {
  const c = await candidaturaOuErro(candId);
  garantirDono(c, u);
  const doc = c.documentos.find((d) => d.id === docId);
  if (!doc) return;
  await actualizar<Candidatura>("candidaturas", candId, (x) => ({
    ...x,
    documentos: x.documentos.filter((d) => d.id !== docId),
    historico: [...x.historico, evento(u.nome, "documentoRemovido", { detalhe: doc.tipo })],
    actualizadaEm: agora(),
  }));
  await removerUpload(doc.ficheiro);
}

/**
 * Submissão — verificações automáticas das Fases 1 e 2:
 *  incompleta → correcao_solicitada · não cumpre requisitos → rejeitada · cumpre → elegivel
 */
export async function submeterCandidatura(candId: string, u: Utilizador | UtilizadorPublico) {
  const c = await candidaturaOuErro(candId);
  garantirDono(c, u);
  const bolsa = await bolsaOuErro(c.bolsaId);
  if (bolsa.estado !== "aberta" || !dentroDoPrazo(bolsa)) throw new ErroNegocio("prazoTerminou");

  const link = `/applicant/applications/${c.id}`;
  const hist: EventoHistorico[] = [evento(u.nome, c.estado === "rascunho" ? "submetida" : "reenviada"), evento(SISTEMA, "registada")];

  const pendencias = verificarCompletude(bolsa, c);
  if (pendencias.length) {
    hist.push(evento(SISTEMA, "correcaoSolicitada", { pendencias }));
    await actualizar<Candidatura>("candidaturas", c.id, (x) => ({
      ...x,
      estado: "correcao_solicitada",
      pendencias,
      submetidaEm: x.submetidaEm ?? agora(),
      historico: [...x.historico, ...hist],
      actualizadaEm: agora(),
    }));
    await notificar(u.id, "incompleta", { codigo: c.codigo }, "aviso", link);
    return { estado: "correcao_solicitada" as const, pendencias };
  }
  hist.push(evento(SISTEMA, "completa"));

  const motivos = verificarRequisitos(bolsa, c, u.dataNascimento);
  if (motivos.length) {
    hist.push(evento(SISTEMA, "rejeitadaRequisitos", { motivos }), evento(SISTEMA, "rejeicaoComunicada"));
    await actualizar<Candidatura>("candidaturas", c.id, (x) => ({
      ...x,
      estado: "rejeitada",
      pendencias: [],
      motivos,
      submetidaEm: agora(),
      historico: [...x.historico, ...hist],
      actualizadaEm: agora(),
    }));
    await notificar(u.id, "naoElegivel", { codigo: c.codigo }, "erro", link);
    await auditar(SISTEMA, "rejeitadaAuto", c.codigo);
    return { estado: "rejeitada" as const, motivos };
  }

  hist.push(evento(SISTEMA, "requisitosCumpridos"));
  await actualizar<Candidatura>("candidaturas", c.id, (x) => ({
    ...x,
    estado: "elegivel",
    pendencias: [],
    submetidaEm: agora(),
    historico: [...x.historico, ...hist],
    actualizadaEm: agora(),
  }));
  await notificar(u.id, "elegivel", { codigo: c.codigo }, "sucesso", link);
  await auditar(u.nome, "submetidaElegivel", c.codigo);
  return { estado: "elegivel" as const };
}

/** A Comissão pode pedir correcção enquanto o prazo está aberto. */
export async function solicitarCorreccao(candId: string, pendencias: string[], por: UtilizadorPublico) {
  const c = await candidaturaOuErro(candId);
  const bolsa = await bolsaOuErro(c.bolsaId);
  if (c.estado !== "elegivel") throw new ErroNegocio("correcaoSoElegiveis");
  if (!dentroDoPrazo(bolsa)) throw new ErroNegocio("correcaoPrazo");
  if (!pendencias.length) throw new ErroNegocio("indiquePendencias");
  await actualizar<Candidatura>("candidaturas", candId, (x) => ({
    ...x,
    estado: "correcao_solicitada",
    pendencias,
    historico: [...x.historico, evento(por.nome, "correcaoComissao", { pendencias })],
    actualizadaEm: agora(),
  }));
  await notificar(c.utilizadorId, "correcaoComissao", { codigo: c.codigo }, "aviso", `/applicant/applications/${c.id}`);
  await auditar(por.nome, "correcao", c.codigo, pendencias.join("; "));
}

// ─── FASE 3 — Avaliação automática e classificação ───────────
export async function executarCalculo(bolsaId: string, por: UtilizadorPublico) {
  const bolsa = await bolsaOuErro(bolsaId);
  if (bolsa.estado === "concluida") throw new ErroNegocio("jaPublicado");
  if (!prazoEncerrado(bolsa)) throw new ErroNegocio("calculoAntesPrazo");

  const resumo = { classificadas: 0, rejeitadasPorPrazo: 0 };
  const rejeitadas: Candidatura[] = [];

  await transformar<Candidatura>("candidaturas", (regs) => {
    const daBolsa = regs.filter((c) => c.bolsaId === bolsaId);
    for (const c of daBolsa.filter((x) => x.estado === "correcao_solicitada")) {
      c.estado = "rejeitada";
      c.motivos = [{ chave: "foraDoPrazo" }];
      c.historico.push(evento(SISTEMA, "rejeitadaPrazo", { pendencias: c.pendencias }));
      c.actualizadaEm = agora();
      rejeitadas.push(c);
    }
    const elegiveis = daBolsa.filter((x) => x.estado === "elegivel" || x.estado === "classificada");
    for (const r of classificar(bolsa, elegiveis)) {
      const c = r.candidatura;
      c.estado = "classificada";
      c.pontuacao = r.pontuacao;
      c.detalhePontuacao = r.detalhe;
      c.posicao = r.posicao;
      c.resultadoSistema = r.resultado;
      c.resultadoFinal = r.resultado;
      c.justificacaoAjuste = undefined;
      c.historico.push(evento(SISTEMA, "pontuacaoCalculada", { params: { pontos: r.pontuacao.toFixed(2), posicao: r.posicao, resultado: r.resultado } }));
      c.actualizadaEm = agora();
      resumo.classificadas++;
    }
    resumo.rejeitadasPorPrazo = rejeitadas.length;
    return { registos: regs };
  });

  for (const c of rejeitadas) await notificar(c.utilizadorId, "rejeitadaPrazo", { codigo: c.codigo }, "erro", `/applicant/applications/${c.id}`);

  await actualizar<Bolsa>("bolsas", bolsaId, (b) => ({ ...b, estado: "em_avaliacao", calculadoEm: agora(), actualizadoEm: agora() }));
  await auditar(por.nome, "calculo", bolsa.titulo, `${resumo.classificadas} / ${resumo.rejeitadasPorPrazo}`);
  return resumo;
}

// ─── FASE 4 — Decisão da Comissão ────────────────────────────
/**
 * Decisão da Comissão sobre um candidato.
 *  - concurso em avaliação (classificada): ajusta o resultado antes da publicação;
 *  - concurso concluído (decidida): rectifica a decisão já comunicada.
 * Devolve o tipo de operação efectuada.
 */
export async function ajustarResultado(candId: string, novo: Resultado, justificacao: string, por: UtilizadorPublico): Promise<"ajuste" | "rectificacao"> {
  const c = await candidaturaOuErro(candId);
  if (c.estado === "decidida") {
    await rectificarDecisao(c, novo, justificacao, por);
    return "rectificacao";
  }
  if (c.estado !== "classificada") throw new ErroNegocio("ajusteSoClassificadas");
  const repor = novo === c.resultadoSistema;
  if (!repor && justificacao.trim().length < 15) throw new ErroNegocio("justificacaoCurta");

  await actualizar<Candidatura>("candidaturas", candId, (x) => ({
    ...x,
    resultadoFinal: novo,
    justificacaoAjuste: repor ? undefined : justificacao.trim(),
    historico: [
      ...x.historico,
      repor
        ? evento(por.nome, "reposto", { params: { para: novo } })
        : evento(por.nome, "ajustado", { params: { de: x.resultadoSistema!, para: novo }, detalhe: justificacao.trim() }),
    ],
    actualizadaEm: agora(),
  }));
  await auditar(por.nome, repor ? "ajusteRevertido" : "ajuste", c.codigo, repor ? undefined : justificacao.trim());
  return "ajuste";
}

/** Rectificação de uma decisão já publicada: nova decisão registada e comunicada ao candidato. */
async function rectificarDecisao(c: Candidatura, novo: Resultado, justificacao: string, por: UtilizadorPublico) {
  const bolsa = await bolsaOuErro(c.bolsaId);
  if (bolsa.estado !== "concluida") throw new ErroNegocio("ajusteSoClassificadas");
  if (novo === c.resultadoFinal) throw new ErroNegocio("semAlteracao");
  const just = justificacao.trim();
  if (just.length < 15) throw new ErroNegocio("justificacaoCurta");

  if (novo === "seleccionado") {
    const seleccionados = (await listar<Candidatura>("candidaturas")).filter(
      (x) => x.bolsaId === bolsa.id && x.id !== c.id && x.estado === "decidida" && x.resultadoFinal === "seleccionado",
    ).length;
    if (seleccionados + 1 > bolsa.vagas) throw new ErroNegocio("excedeVagas", { s: seleccionados + 1, v: bolsa.vagas });
  }

  const anterior = c.resultadoFinal!;
  await actualizar<Candidatura>("candidaturas", c.id, (x) => ({
    ...x,
    resultadoFinal: novo,
    justificacaoAjuste: just,
    historico: [
      ...x.historico,
      evento(por.nome, "rectificado", { params: { de: anterior, para: novo }, detalhe: just }),
      evento(SISTEMA, "comunicado", { params: { resultado: novo } }),
    ],
    actualizadaEm: agora(),
  }));

  const utilizadores = await listar<Utilizador>("utilizadores");
  await inserir<Decisao>("decisoes", {
    id: novoId(),
    bolsaId: bolsa.id,
    candidaturaId: c.id,
    codigo: c.codigo,
    candidatoNome: utilizadores.find((u) => u.id === c.utilizadorId)?.nome ?? "—",
    pontuacao: c.pontuacao ?? null,
    posicao: c.posicao ?? null,
    resultadoSistema: c.resultadoSistema!,
    resultadoFinal: novo,
    alterado: novo !== c.resultadoSistema,
    justificacao: just,
    rectificacao: true,
    decididoPor: por.nome,
    decididoEm: agora(),
  });

  await notificar(
    c.utilizadorId,
    "rectificado",
    { bolsa: bolsa.titulo, resultado: novo },
    novo === "seleccionado" ? "sucesso" : novo === "lista_espera" ? "aviso" : "info",
    `/applicant/applications/${c.id}`,
  );
  await auditar(por.nome, "rectificacao", c.codigo, `${anterior} → ${novo}: ${just}`);
}

/** Aprova o resultado, regista a decisão e comunica-a — Fases 4 e 5. */
export async function aprovarEPublicar(bolsaId: string, por: UtilizadorPublico) {
  const bolsa = await bolsaOuErro(bolsaId);
  if (bolsa.estado !== "em_avaliacao") throw new ErroNegocio("calcularPrimeiro");

  const todas = (await listar<Candidatura>("candidaturas")).filter((c) => c.bolsaId === bolsaId);
  const classificadas = todas.filter((c) => c.estado === "classificada");
  const seleccionados = classificadas.filter((c) => c.resultadoFinal === "seleccionado").length;
  if (seleccionados > bolsa.vagas) throw new ErroNegocio("excedeVagas", { s: seleccionados, v: bolsa.vagas });

  const utilizadores = await listar<Utilizador>("utilizadores");
  const nome = (id: string) => utilizadores.find((u) => u.id === id)?.nome ?? "—";
  const decididoEm = agora();

  const jaRegistadas = new Set((await listar<Decisao>("decisoes")).map((d) => d.candidaturaId));
  for (const c of todas) {
    if (jaRegistadas.has(c.id)) continue;
    if (c.estado === "classificada") {
      await inserir<Decisao>("decisoes", {
        id: novoId(),
        bolsaId,
        candidaturaId: c.id,
        codigo: c.codigo,
        candidatoNome: nome(c.utilizadorId),
        pontuacao: c.pontuacao ?? null,
        posicao: c.posicao ?? null,
        resultadoSistema: c.resultadoSistema!,
        resultadoFinal: c.resultadoFinal!,
        alterado: c.resultadoSistema !== c.resultadoFinal,
        justificacao: c.justificacaoAjuste,
        decididoPor: por.nome,
        decididoEm,
      });
    } else if (c.estado === "rejeitada") {
      await inserir<Decisao>("decisoes", {
        id: novoId(),
        bolsaId,
        candidaturaId: c.id,
        codigo: c.codigo,
        candidatoNome: nome(c.utilizadorId),
        pontuacao: null,
        posicao: null,
        resultadoSistema: "rejeitada",
        resultadoFinal: "rejeitada",
        alterado: false,
        motivos: c.motivos,
        decididoPor: SISTEMA,
        decididoEm,
      });
    }
  }

  await transformar<Candidatura>("candidaturas", (regs) => {
    for (const c of regs) {
      if (c.bolsaId !== bolsaId || c.estado !== "classificada") continue;
      c.estado = "decidida";
      c.historico.push(evento(por.nome, "aprovado"), evento(SISTEMA, "comunicado", { params: { resultado: c.resultadoFinal! } }));
      c.actualizadaEm = agora();
    }
    return { registos: regs };
  });

  for (const c of classificadas) {
    const r = c.resultadoFinal!;
    await notificar(
      c.utilizadorId,
      r,
      { bolsa: bolsa.titulo, pontos: c.pontuacao?.toFixed(2) ?? "—", posicao: c.posicao ?? "—" },
      r === "seleccionado" ? "sucesso" : r === "lista_espera" ? "aviso" : "info",
      `/applicant/applications/${c.id}`,
    );
  }

  await actualizar<Bolsa>("bolsas", bolsaId, (b) => ({ ...b, estado: "concluida", publicadoEm: agora(), actualizadoEm: agora() }));
  await auditar(por.nome, "publicado", bolsa.titulo, String(classificadas.length));
  return { notificados: classificadas.length };
}
