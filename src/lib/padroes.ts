import type { Criterio, RequisitosMinimos } from "./types";

export const AREAS_ESTUDO = [
  "Ciências Náuticas",
  "Engenharia",
  "Telecomunicações e Rádio",
  "Economia e Gestão",
  "Saúde",
  "Educação",
  "Ciências Sociais",
  "Direito",
  "Agronomia",
];

export const DOCUMENTOS_PADRAO = [
  "Bilhete de Identidade",
  "Comprovativo de matrícula",
  "Declaração de rendimentos do agregado",
  "Certificado de habilitações / notas",
];

export const REQUISITOS_PADRAO: RequisitosMinimos = {
  mediaMinima: 12,
  rendimentoPerCapitaMax: 15000,
  idadeMaxima: 30,
  areasElegiveis: [],
};

export function criteriosPadrao(): Criterio[] {
  return [
    { id: "c-media", nome: "Desempenho académico", campo: "media", sentido: "maior_melhor", peso: 50, min: 10, max: 20 },
    { id: "c-renda", nome: "Situação socioeconómica (rendimento per capita)", campo: "rendimentoPerCapita", sentido: "menor_melhor", peso: 30, min: 0, max: 15000 },
    { id: "c-agregado", nome: "Dimensão do agregado familiar", campo: "agregadoFamiliar", sentido: "maior_melhor", peso: 5, min: 1, max: 10 },
    { id: "c-orfao", nome: "Orfandade", campo: "orfao", sentido: "booleano", peso: 5, min: 0, max: 1 },
    { id: "c-def", nome: "Necessidades especiais", campo: "deficiencia", sentido: "booleano", peso: 5, min: 0, max: 1 },
    { id: "c-extra", nome: "Actividades extracurriculares", campo: "actividadesExtra", sentido: "maior_melhor", peso: 5, min: 0, max: 5 },
  ];
}
