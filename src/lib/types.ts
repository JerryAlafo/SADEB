// ─────────────────────────────────────────────────────────────
// SADEB — Modelos de dados
// Cada colecção é guardada num ficheiro .txt em /data,
// com um registo JSON por linha (formato "JSON Lines").
// ─────────────────────────────────────────────────────────────

export type Papel = "candidato" | "comissao" | "admin";

export interface Utilizador {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  bi?: string; // nº do Bilhete de Identidade
  dataNascimento?: string; // YYYY-MM-DD
  papel: Papel;
  passwordHash: string; // scrypt: salt:hash
  activo: boolean;
  criadoEm: string;
  /** Verificação de identidade (OCR + liveness + face match) usada no registo. */
  verificacaoId?: string;
  identidadeVerificadaEm?: string;
}

// ─── Verificação de identidade (Regula) ─────────────────────

export type EstadoVerificacao =
  | "documento" // à espera do documento (OCR)
  | "liveness" // documento lido; à espera da prova de vida
  | "facematch" // liveness aprovado; à espera da comparação facial
  | "aprovada" // pode ser usada no registo
  | "reprovada" // tentativas esgotadas
  | "usada"; // já deu origem a uma conta

export type CheckRegula = "ok" | "erro" | "nao_feito";

export interface Verificacao {
  id: string;
  tokenHash: string; // sha256 do token guardado no cookie httpOnly do candidato
  estado: EstadoVerificacao;
  simulado: boolean;
  tentativas: { documento: number; liveness: number; facematch: number };
  documento?: {
    transactionId: string;
    tipoDocumento?: string;
    campos: {
      apelido?: string;
      nomes?: string;
      nomeCompleto?: string;
      numeroDocumento?: string;
      numeroPessoal?: string;
      dataNascimento?: string;
      dataValidade?: string;
      nacionalidade?: string;
      sexo?: string;
    };
    estado: { geral: CheckRegula; optico: CheckRegula; validade: CheckRegula; texto: CheckRegula };
    processadoEm: string;
  };
  /** Retrato do documento, cifrado (AES-256-GCM); apagado depois do face match. */
  retratoCifrado?: string;
  liveness?: { transactionId: string; aprovado: boolean; codigo: number; idadeEstimada?: number; em: string };
  facematch?: { similaridade: number; limiar: number; aprovado: boolean; transactionId?: string; em: string };
  /** Chaves de alerta (não bloqueiam): ex. "autenticidadeDuvidosa", "idadeDiscrepante". */
  alertas: string[];
  /** Último motivo de falha (chave em t.erros). */
  ultimoErro?: string;
  utilizadorId?: string;
  criadaEm: string;
  actualizadaEm: string;
  expiraEm: string;
}

export interface Sessao {
  token: string;
  utilizadorId: string;
  expiraEm: string;
  criadaEm: string;
}

/** Campos da candidatura que podem alimentar um critério de pontuação. */
export type CampoCriterio =
  | "media"
  | "rendimentoPerCapita"
  | "agregadoFamiliar"
  | "orfao"
  | "deficiencia"
  | "actividadesExtra"
  | "distanciaKm"
  | "anoFrequencia";

export type SentidoCriterio = "maior_melhor" | "menor_melhor" | "booleano";

export interface Criterio {
  id: string;
  nome: string;
  campo: CampoCriterio;
  sentido: SentidoCriterio;
  peso: number; // percentagem (soma = 100)
  min: number; // valor que corresponde a 0 pontos (ou 100 se "menor_melhor")
  max: number; // valor que corresponde a 100 pontos (ou 0 se "menor_melhor")
}

export interface RequisitosMinimos {
  mediaMinima: number; // escala 0–20
  rendimentoPerCapitaMax: number; // MZN / mês; 0 = sem limite
  idadeMaxima: number; // 0 = sem limite
  areasElegiveis: string[]; // vazio = todas
}

export type EstadoBolsa = "rascunho" | "aberta" | "em_avaliacao" | "concluida";

export interface Bolsa {
  id: string;
  titulo: string;
  descricao: string;
  entidade: string;
  anoLectivo: string;
  vagas: number;
  vagasListaEspera: number;
  dataAbertura: string; // YYYY-MM-DD
  dataEncerramento: string; // YYYY-MM-DD (inclusive)
  documentosObrigatorios: string[];
  requisitos: RequisitosMinimos;
  criterios: Criterio[];
  estado: EstadoBolsa;
  calculadoEm?: string;
  publicadoEm?: string;
  criadoEm: string;
  actualizadoEm: string;
}

export interface Documento {
  id: string;
  tipo: string; // corresponde a um item de documentosObrigatorios
  nomeOriginal: string;
  ficheiro: string; // caminho relativo a data/uploads
  tamanho: number;
  carregadoEm: string;
}

export interface DadosCandidatura {
  curso: string;
  area: string;
  instituicao: string;
  anoFrequencia: number;
  media: number;
  rendimentoFamiliar: number; // MZN / mês
  agregadoFamiliar: number;
  orfao: boolean;
  deficiencia: boolean;
  actividadesExtra: number; // 0–5
  distanciaKm: number;
  motivacao: string;
}

/**
 * Estados da candidatura, alinhados com o fluxograma:
 *  rascunho → submetida → (correcao_solicitada ↺) → elegivel → classificada → decidida
 *                                         ↘ rejeitada (requisitos mínimos / fora do prazo)
 */
export type EstadoCandidatura =
  | "rascunho"
  | "correcao_solicitada"
  | "elegivel"
  | "rejeitada"
  | "classificada"
  | "decidida";

export type Resultado = "seleccionado" | "lista_espera" | "nao_seleccionado";

export interface DetalheCriterio {
  criterioId: string;
  nome: string;
  valor: number | boolean;
  normalizado: number; // 0–100
  peso: number;
  contributo: number; // pontos na nota final
}

/** Motivo de rejeição estruturado (traduzido na apresentação). */
export interface Motivo {
  chave: "mediaBaixa" | "rendimentoAlto" | "areaNaoElegivel" | "semDataNascimento" | "idadeAlta" | "foraDoPrazo";
  params?: Record<string, string | number>;
}

export interface EventoHistorico {
  em: string;
  por: string; // "Sistema" ou nome do utilizador
  accao: string; // chave em t.evento
  params?: Record<string, string | number>;
  pendencias?: string[];
  motivos?: Motivo[];
  detalhe?: string; // texto livre (ex.: justificação, nome de ficheiro)
}

export interface Candidatura {
  id: string;
  codigo: string; // ex.: SADEB-2026-0001
  bolsaId: string;
  utilizadorId: string;
  dados: DadosCandidatura;
  documentos: Documento[];
  estado: EstadoCandidatura;
  submetidaEm?: string;
  pendencias: string[]; // chaves "campo:x" / "doc:Tipo" ou texto livre da Comissão
  motivos?: Motivo[];
  pontuacao?: number;
  detalhePontuacao?: DetalheCriterio[];
  posicao?: number;
  resultadoSistema?: Resultado;
  resultadoFinal?: Resultado;
  justificacaoAjuste?: string;
  historico: EventoHistorico[];
  criadaEm: string;
  actualizadaEm: string;
}

export interface Decisao {
  id: string;
  bolsaId: string;
  candidaturaId: string;
  codigo: string;
  candidatoNome: string;
  pontuacao: number | null;
  posicao: number | null;
  resultadoSistema: Resultado | "rejeitada";
  resultadoFinal: Resultado | "rejeitada";
  alterado: boolean;
  justificacao?: string;
  motivos?: Motivo[];
  rectificacao?: boolean; // decisão alterada depois da publicação
  decididoPor: string;
  decididoEm: string;
}

export interface Notificacao {
  id: string;
  utilizadorId: string;
  chave: string; // chave em t.notif
  params?: Record<string, string | number>;
  tipo: "info" | "sucesso" | "aviso" | "erro";
  link?: string;
  lida: boolean;
  criadaEm: string;
}

export interface RegistoAuditoria {
  id: string;
  em: string;
  utilizador: string;
  accao: string;
  alvo?: string;
  detalhe?: string;
}

/** Pedido de recuperação de palavra-passe (link por e-mail). */
export interface PedidoRecuperacao {
  id: string;
  tokenHash: string;
  utilizadorId: string;
  usado: boolean;
  expiraEm: string;
  criadoEm: string;
}

/** Caixa de saída: e-mails enviados pelo sistema. */
export interface EmailEnviado {
  id: string;
  para: string;
  assunto: string;
  texto: string;
  enviadoEm: string;
}
