// ─────────────────────────────────────────────────────────────
// SADEB — Subsistema de modelos (regras de decisão)
// Funções puras: a mesma fórmula é aplicada a todos os candidatos.
// Devolvem chaves + parâmetros (traduzidos na apresentação).
// ─────────────────────────────────────────────────────────────
import type { Bolsa, CampoCriterio, Candidatura, Criterio, DetalheCriterio, Motivo, Resultado } from "./types";

export const CAMPOS: CampoCriterio[] = [
  "media",
  "rendimentoPerCapita",
  "agregadoFamiliar",
  "orfao",
  "deficiencia",
  "actividadesExtra",
  "distanciaKm",
  "anoFrequencia",
];

export function fimDoDia(data: string) {
  return new Date(`${data}T23:59:59`);
}

export function inicioDoDia(data: string) {
  return new Date(`${data}T00:00:00`);
}

export function dentroDoPrazo(bolsa: Bolsa, quando = new Date()) {
  return quando >= inicioDoDia(bolsa.dataAbertura) && quando <= fimDoDia(bolsa.dataEncerramento);
}

export function prazoEncerrado(bolsa: Bolsa, quando = new Date()) {
  return quando > fimDoDia(bolsa.dataEncerramento);
}

export function rendimentoPerCapita(c: Candidatura) {
  const ag = Math.max(1, c.dados.agregadoFamiliar || 1);
  return Math.round((c.dados.rendimentoFamiliar || 0) / ag);
}

export function valorCampo(c: Candidatura, campo: CampoCriterio): number | boolean {
  switch (campo) {
    case "rendimentoPerCapita":
      return rendimentoPerCapita(c);
    case "orfao":
      return c.dados.orfao;
    case "deficiencia":
      return c.dados.deficiencia;
    default:
      return Number(c.dados[campo] ?? 0);
  }
}

export function idade(dataNascimento: string | undefined, ref = new Date()) {
  if (!dataNascimento) return undefined;
  const n = new Date(dataNascimento);
  let anos = ref.getFullYear() - n.getFullYear();
  const m = ref.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < n.getDate())) anos--;
  return anos;
}

// ─── Fase 1: completude ──────────────────────────────────────
/** Pendências: "campo:<chave>" para campos, "doc:<tipo>" para documentos. */
export function verificarCompletude(bolsa: Bolsa, c: Candidatura): string[] {
  const falta: string[] = [];
  const d = c.dados;
  if (!d.curso?.trim()) falta.push("campo:curso");
  if (!d.area?.trim()) falta.push("campo:area");
  if (!d.instituicao?.trim()) falta.push("campo:instituicao");
  if (!(d.media > 0)) falta.push("campo:media");
  if (!(d.agregadoFamiliar >= 1)) falta.push("campo:agregado");
  if (!(d.anoFrequencia >= 1)) falta.push("campo:anoFrequencia");
  if (!d.motivacao?.trim() || d.motivacao.trim().length < 30) falta.push("campo:motivacao");
  for (const tipo of bolsa.documentosObrigatorios) {
    if (!c.documentos.some((doc) => doc.tipo === tipo)) falta.push(`doc:${tipo}`);
  }
  return falta;
}

// ─── Fase 2: requisitos mínimos ──────────────────────────────
export function verificarRequisitos(bolsa: Bolsa, c: Candidatura, dataNascimento?: string): Motivo[] {
  const r = bolsa.requisitos;
  const motivos: Motivo[] = [];
  if (c.dados.media < r.mediaMinima) motivos.push({ chave: "mediaBaixa", params: { media: c.dados.media.toFixed(1), min: r.mediaMinima } });
  const rpc = rendimentoPerCapita(c);
  if (r.rendimentoPerCapitaMax > 0 && rpc > r.rendimentoPerCapitaMax)
    motivos.push({ chave: "rendimentoAlto", params: { valor: `${rpc} MZN`, limite: `${r.rendimentoPerCapitaMax} MZN` } });
  if (r.areasElegiveis.length) {
    const area = c.dados.area.trim().toLowerCase();
    if (!r.areasElegiveis.some((a) => a.trim().toLowerCase() === area))
      motivos.push({ chave: "areaNaoElegivel", params: { area: c.dados.area } });
  }
  if (r.idadeMaxima > 0) {
    const anos = idade(dataNascimento);
    if (anos === undefined) motivos.push({ chave: "semDataNascimento" });
    else if (anos > r.idadeMaxima) motivos.push({ chave: "idadeAlta", params: { idade: anos, limite: r.idadeMaxima } });
  }
  return motivos;
}

// ─── Fase 3: pontuação e classificação ───────────────────────
function normalizar(cr: Criterio, v: number | boolean): number {
  if (cr.sentido === "booleano") return v ? 100 : 0;
  const n = Number(v);
  const amp = cr.max - cr.min;
  if (amp === 0) return 0;
  const f = cr.sentido === "maior_melhor" ? (n - cr.min) / amp : (cr.max - n) / amp;
  return Math.max(0, Math.min(1, f)) * 100;
}

const arred = (n: number, casas = 2) => Math.round(n * 10 ** casas) / 10 ** casas;

export function calcularPontuacao(bolsa: Bolsa, c: Candidatura) {
  const somaPesos = bolsa.criterios.reduce((s, cr) => s + cr.peso, 0) || 1;
  const detalhe: DetalheCriterio[] = bolsa.criterios.map((cr) => {
    const valor = valorCampo(c, cr.campo);
    const normalizado = normalizar(cr, valor);
    return {
      criterioId: cr.id,
      nome: cr.nome,
      valor,
      normalizado: arred(normalizado),
      peso: cr.peso,
      contributo: arred((normalizado * cr.peso) / somaPesos),
    };
  });
  return { pontuacao: arred(detalhe.reduce((s, d) => s + d.contributo, 0)), detalhe };
}

export function classificar(bolsa: Bolsa, elegiveis: Candidatura[]) {
  const calculadas = elegiveis.map((c) => ({ c, ...calcularPontuacao(bolsa, c) }));
  calculadas.sort(
    (a, b) =>
      b.pontuacao - a.pontuacao ||
      b.c.dados.media - a.c.dados.media || // desempate 1: maior média
      (a.c.submetidaEm ?? "").localeCompare(b.c.submetidaEm ?? ""), // desempate 2: submissão mais cedo
  );
  return calculadas.map((x, i) => {
    let resultado: Resultado = "nao_seleccionado";
    if (i < bolsa.vagas) resultado = "seleccionado";
    else if (i < bolsa.vagas + bolsa.vagasListaEspera) resultado = "lista_espera";
    return { candidatura: x.c, pontuacao: x.pontuacao, detalhe: x.detalhe, posicao: i + 1, resultado };
  });
}

/** Erros de configuração dos critérios: [chave em t.erros, params]. */
export function validarCriterios(criterios: Criterio[]): [string, Record<string, string | number>?][] {
  const erros: [string, Record<string, string | number>?][] = [];
  if (!criterios.length) erros.push(["criteriosMin"]);
  const soma = criterios.reduce((s, c) => s + c.peso, 0);
  if (Math.abs(soma - 100) > 0.001) erros.push(["somaPesos", { s: soma }]);
  for (const c of criterios) {
    if (!c.nome.trim()) erros.push(["criterioNome"]);
    if (c.peso <= 0) erros.push(["criterioPeso", { nome: c.nome }]);
    if (c.sentido !== "booleano" && c.max === c.min) erros.push(["criterioIntervalo", { nome: c.nome }]);
  }
  return erros;
}
